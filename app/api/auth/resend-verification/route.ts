/**
 * POST /api/auth/resend-verification — resend email verification link.
 * Requires authenticated session. Returns 400 if already verified.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendEmailVerification } from "@/lib/email";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const VERIFY_TOKEN_EXPIRY_HOURS = 24;
const EMAIL_VERIFY_PREFIX = "email_verify:";

export async function POST() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, emailVerified: true },
  });

  if (!user?.email) {
    return NextResponse.json(
      { error: "No email to verify" },
      { status: 400 }
    );
  }

  if (user.emailVerified) {
    return NextResponse.json(
      { error: "Email already verified" },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
  const identifier = `${EMAIL_VERIFY_PREFIX}${user.email}`;

  await prisma.verificationToken.deleteMany({
    where: { identifier },
  });
  await prisma.verificationToken.create({
    data: { identifier, token, expires },
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3910";
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
  await sendEmailVerification(user.email, verifyUrl);

  return NextResponse.json({ ok: true });
}
