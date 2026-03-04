/**
 * POST /api/auth/reset-password — reset password using token.
 * Body: { token: string, newPassword: string }
 */
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { validatePasswordLength } from "@/lib/validation";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import {
  verifyTurnstileToken,
  shouldSkipTurnstileVerification,
} from "@/lib/turnstile";

function getClientIp(request: Request): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")
  );
}

export async function POST(request: Request) {
  try {
    let body: { token?: string; newPassword?: string; turnstileToken?: string };
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

    const { token, newPassword } = body;
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Token is required or invalid" },
        { status: 400 }
      );
    }
    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { error: "newPassword required" },
        { status: 400 }
      );
    }

    const passwordCheck = validatePasswordLength(newPassword);
    if (!passwordCheck.ok) {
      return NextResponse.json(
        { error: passwordCheck.error },
        { status: 400 }
      );
    }

    const now = new Date();
    const vt = await prisma.verificationToken.findFirst({
      where: { token, expires: { gt: now } },
    });

    if (!vt) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: vt.identifier },
      select: { id: true, password: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: vt.identifier, token: vt.token },
    });

    void createActivityLog({
      userId: user.id,
      action: ActivityLogAction.USER_PASSWORD_CHANGED,
      entityType: "user",
      entityId: user.id,
      details: { source: "password_reset" },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
