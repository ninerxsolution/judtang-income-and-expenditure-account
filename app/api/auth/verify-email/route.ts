/**
 * GET /api/auth/verify-email — verify email using token from link.
 * Query: ?token=xxx
 * Returns { ok: true } or { error: string }. One-time use; deletes token after success.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

const EMAIL_VERIFY_PREFIX = "email_verify:";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 400 }
      );
    }

    const now = new Date();
    const vt = await prisma.verificationToken.findFirst({
      where: {
        token,
        identifier: { startsWith: EMAIL_VERIFY_PREFIX },
        expires: { gt: now },
      },
    });

    if (!vt) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 400 }
      );
    }

    const email = vt.identifier.replace(/^email_verify:/, "");
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.deleteMany({
      where: { identifier: vt.identifier, token: vt.token },
    });

    void createActivityLog({
      userId: user.id,
      action: ActivityLogAction.USER_EMAIL_VERIFIED,
      entityType: "user",
      entityId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Verification failed" },
      { status: 500 }
    );
  }
}
