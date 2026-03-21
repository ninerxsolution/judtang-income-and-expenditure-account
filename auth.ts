/**
 * NextAuth config: JWT session (Credentials + Google), Prisma Adapter for OAuth User/Account.
 * Session list/revoke: UserSession table keyed by sessionId in JWT.
 */
import type { AuthOptions } from "next-auth";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { resolveUserStatus, finalizeDeletion } from "@/lib/user-status";
import {
  verifyTurnstileToken,
  shouldSkipTurnstileVerification,
} from "@/lib/turnstile";

type JWTWithId = { id?: string; sessionId?: string; sub?: string; rememberMe?: boolean; role?: string };

const isSecure = process.env.NEXTAUTH_URL?.startsWith("https://");

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  useSecureCookies: isSecure,
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        turnstileToken: { label: "Turnstile", type: "text" },
        rememberMe: { label: "Remember Me", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        if (!shouldSkipTurnstileVerification()) {
          if (!credentials.turnstileToken) return null;
          const result = await verifyTurnstileToken(
            String(credentials.turnstileToken)
          );
          if (!result.success) return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            password: true,
            status: true,
            deleteAfter: true,
          },
        });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.password
        );
        if (!ok) return null;
        const status = resolveUserStatus(user);
        if (status === "DELETED") {
          await finalizeDeletion(user.id);
          return null;
        }
        if (status === "SUSPENDED") return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          rememberMe: credentials.rememberMe === "true",
          role: user.role,
        };
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
          select: { id: true, status: true, deleteAfter: true },
        });
        if (dbUser) {
          const status = resolveUserStatus(dbUser);
          if (status === "DELETED") {
            await finalizeDeletion(dbUser.id);
            return false;
          }
          if (status === "SUSPENDED") return false;
        }
        await prisma.user.update({
          where: { email: user.email },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      const t = token as JWTWithId;
      if (user?.id) {
          t.id = user.id;
          t.role = (user as { role?: string }).role;
          if (!t.role) {
            const dbUser = await prisma.user.findUnique({
              where: { id: user.id },
              select: { role: true },
            });
            t.role = dbUser?.role ?? "USER";
          }
          const sessionId = randomUUID();
          const isCredentials = !account || account.provider === "credentials";
          // rememberMe only applies to credentials sign-in; OAuth always gets long TTL
          const rememberMe = isCredentials
            ? (user as { rememberMe?: boolean }).rememberMe === true
            : true;
          const ttlDays = rememberMe
            ? Number(process.env.REMEMBER_ME_TTL_DAYS ?? 30)
            : Number(process.env.DEFAULT_SESSION_TTL_HOURS ?? 24) / 24;
          const expiresAt = new Date(Date.now() + ttlDays * 86_400_000);
          await prisma.userSession.create({
            data: { sessionId, userId: user.id, rememberMe, expiresAt },
          });
          await prisma.user.update({
            where: { id: user.id },
            data: { lastActiveAt: new Date() },
          });
          t.sessionId = sessionId;
          t.rememberMe = rememberMe;
          void createActivityLog({
            userId: user.id,
            action: ActivityLogAction.USER_LOGGED_IN,
            entityType: "user",
            entityId: user.id,
          });
          return t as typeof token;
      }
      if (t.sessionId) {
        const row = await prisma.userSession.findFirst({
          where: { sessionId: t.sessionId, revokedAt: null },
        });
        if (!row) {
          delete t.sub;
          delete t.id;
          delete t.sessionId;
          delete t.role;
          return t as typeof token;
        }
        if (row.expiresAt < new Date()) {
          await prisma.userSession.update({
            where: { sessionId: t.sessionId },
            data: { revokedAt: new Date() },
          });
          delete t.sub;
          delete t.id;
          delete t.sessionId;
          delete t.role;
          return t as typeof token;
        }
        const dbUser = await prisma.user.findUnique({
          where: { id: row.userId },
          select: { role: true, status: true, deleteAfter: true },
        });
        if (dbUser) {
          const status = resolveUserStatus(dbUser);
          if (status === "SUSPENDED" || status === "DELETED") {
            await prisma.userSession.update({
              where: { sessionId: t.sessionId },
              data: { revokedAt: new Date() },
            });
            delete t.sub;
            delete t.id;
            delete t.sessionId;
            delete t.role;
            return t as typeof token;
          }
        }
        t.role = dbUser?.role ?? "USER";
      }
      return token as typeof token;
    },
    async session({ session, token }) {
      const t = token as JWTWithId;
      if (session.user) {
        (session.user as { id?: string }).id = t.id ?? t.sub ?? undefined;
        (session.user as { role?: string }).role = t.role as "USER" | "ADMIN" | undefined;
      }
      (session as { sessionId?: string }).sessionId = t.sessionId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
