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

type JWTWithId = { id?: string; sessionId?: string; sub?: string };

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
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });
        if (!user?.password) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.password
        );
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email ?? undefined,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
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
        await prisma.user.update({
          where: { email: user.email },
          data: { emailVerified: new Date() },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      const t = token as JWTWithId;
      if (user?.id) {
        t.id = user.id;
        const sessionId = randomUUID();
        await prisma.userSession.create({
          data: { sessionId, userId: user.id },
        });
        t.sessionId = sessionId;
        void createActivityLog({
          userId: user.id,
          action: ActivityLogAction.USER_LOGGED_IN,
          entityType: "user",
          entityId: user.id,
        });
        return t;
      }
      if (t.sessionId) {
        const row = await prisma.userSession.findFirst({
          where: { sessionId: t.sessionId, revokedAt: null },
        });
        if (!row) {
          delete t.sub;
          delete t.id;
          delete t.sessionId;
          return t;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const t = token as JWTWithId;
      if (session.user) {
        (session.user as { id?: string }).id = t.id ?? t.sub ?? undefined;
      }
      (session as { sessionId?: string }).sessionId = t.sessionId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
