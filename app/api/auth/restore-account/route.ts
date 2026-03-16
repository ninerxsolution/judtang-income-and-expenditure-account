/**
 * POST /api/auth/restore-account — restore a suspended account during grace period.
 * Body: { email: string, password: string }
 * Requires valid credentials. User must be SUSPENDED and now < deleteAfter.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { resolveUserStatus } from "@/lib/user-status";
import { normalizeEmail } from "@/lib/validation";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Invalid email" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        password: true,
        status: true,
        deleteAfter: true,
      },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 400 }
      );
    }

    const status = resolveUserStatus(user);
    if (status !== "SUSPENDED") {
      return NextResponse.json(
        { error: "Account cannot be restored" },
        { status: 400 }
      );
    }

    if (!user.deleteAfter || new Date() >= user.deleteAfter) {
      return NextResponse.json(
        { error: "Grace period has expired" },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          status: "ACTIVE",
          suspendedAt: null,
          deleteAfter: null,
        },
      }),
      prisma.userDeletionRequest.updateMany({
        where: { userId: user.id, cancelledAt: null },
        data: { cancelledAt: new Date() },
      }),
    ]);

    void createActivityLog({
      userId: user.id,
      action: ActivityLogAction.ACCOUNT_RESTORE,
      entityType: "USER",
      entityId: user.id,
      details: { restoredBy: "user" },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Restore failed" },
      { status: 500 }
    );
  }
}
