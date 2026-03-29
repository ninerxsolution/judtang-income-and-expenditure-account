/**
 * POST /api/auth/register — create a user (Credentials).
 * Body: { email: string, password: string, name?: string }
 * Email is normalized (trim, lowercase); validated for format and length. Password validated for min/max length.
 * Sends verification email; user can sign in before verifying (soft verification).
 */
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import {
  normalizeEmail,
  isValidEmailFormat,
  EMAIL_MAX_LENGTH,
  validatePasswordLength,
} from "@/lib/validation";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import {
  verifyTurnstileToken,
  shouldSkipTurnstileVerification,
} from "@/lib/turnstile";
import { resolveUserStatus, finalizeDeletion } from "@/lib/user-status";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { ensureUserHasDefaultCategories } from "@/lib/categories";
import { sendEmailVerification } from "@/lib/email";
import { buildVerifyEmailUrl } from "@/lib/email-config";

const VERIFY_TOKEN_EXPIRY_HOURS = 24;

function getClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      password,
      name,
      termsVersion,
      turnstileToken,
    } = body as {
      email?: string;
      password?: string;
      name?: string;
      termsVersion?: string;
      turnstileToken?: string;
    };
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password required" },
        { status: 400 }
      );
    }
    if (!termsVersion || typeof termsVersion !== "string") {
      return NextResponse.json(
        { error: "Terms & Conditions acceptance required" },
        { status: 400 }
      );
    }

    if (!shouldSkipTurnstileVerification(request)) {
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

    const normalizedEmail = normalizeEmail(String(email));
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "email and password required" },
        { status: 400 }
      );
    }
    if (!isValidEmailFormat(normalizedEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }
    if (normalizedEmail.length > EMAIL_MAX_LENGTH) {
      return NextResponse.json(
        { error: "Email is too long" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordLength(String(password));
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true, deleteAfter: true },
    });
    if (existing) {
      const status = resolveUserStatus(existing);
      if (status === "ACTIVE") {
        return NextResponse.json(
          { error: "User with this email already exists" },
          { status: 409 }
        );
      }
      if (status === "SUSPENDED") {
        return NextResponse.json(
          {
            error: "Account is deactivating; try again after the scheduled deletion date",
            deleteAfter: existing.deleteAfter?.toISOString(),
          },
          { status: 409 }
        );
      }
      if (status === "DELETED") {
        await finalizeDeletion(existing.id);
      }
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name != null && String(name).trim() !== "" ? String(name).trim() : null,
        password: hashedPassword,
      },
    });
    void createActivityLog({
      userId: user.id,
      action: ActivityLogAction.USER_REGISTERED,
      entityType: "user",
      entityId: user.id,
    });

    await prisma.userTermsAcceptance.create({
      data: {
        userId: user.id,
        termsVersion,
        ipAddress: getClientIp(request),
      },
    });

    await ensureUserHasDefaultFinancialAccount(user.id);
    await ensureUserHasDefaultCategories(user.id);

    const token = randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);
    const identifier = `email_verify:${normalizedEmail}`;

    await prisma.verificationToken.deleteMany({
      where: { identifier },
    });
    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    const verifyUrl = buildVerifyEmailUrl(token);
    try {
      await sendEmailVerification(normalizedEmail, verifyUrl);
    } catch (emailErr) {
      // User is created; do not fail registration if SMTP fails (e.g. staging).
      // User can sign in and resend verification from profile.
      console.error("[register] Failed to send verification email:", emailErr);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
