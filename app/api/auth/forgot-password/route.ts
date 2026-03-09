/**
 * POST /api/auth/forgot-password — send password reset email.
 * Body: { email: string }
 * Always returns { ok: true } to prevent email enumeration.
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  isValidEmailFormat,
  EMAIL_MAX_LENGTH,
} from "@/lib/validation";
import { sendPasswordResetEmail } from "@/lib/email";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import {
  verifyTurnstileToken,
  shouldSkipTurnstileVerification,
} from "@/lib/turnstile";

const TOKEN_EXPIRY_HOURS = 1;

function getClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

export async function POST(request: Request) {
  try {
    let body: { email?: string; turnstileToken?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!shouldSkipTurnstileVerification(request)) {
      const { turnstileToken } = body;
      if (!turnstileToken || typeof turnstileToken !== "string") {
        return NextResponse.json(
          { error: "Verification required" },
          { status: 400 }
        );
      }
      const result = await verifyTurnstileToken(
        turnstileToken,
        getClientIp(request)
      );
      if (!result.success) {
        return NextResponse.json(
          { error: "Verification failed" },
          { status: 400 }
        );
      }
    }

    const email = body.email;
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }
    if (!isValidEmailFormat(normalizedEmail)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (normalizedEmail.length > EMAIL_MAX_LENGTH) {
      return NextResponse.json({ error: "Email is too long" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, password: true },
    });

    if (user?.password) {
      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

      await prisma.verificationToken.deleteMany({
        where: { identifier: normalizedEmail },
      });
      await prisma.verificationToken.create({
        data: {
          identifier: normalizedEmail,
          token,
          expires,
        },
      });

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3910";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(normalizedEmail, resetUrl);
      void createActivityLog({
        userId: user.id,
        action: ActivityLogAction.USER_PASSWORD_RESET_REQUESTED,
        entityType: "user",
        entityId: user.id,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
