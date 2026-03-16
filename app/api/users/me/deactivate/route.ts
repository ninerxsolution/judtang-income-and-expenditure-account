/**
 * POST /api/users/me/deactivate — schedule account deletion (grace period).
 * Body: { reason?: string }
 * Requires authenticated ACTIVE user. Revokes all sessions; client should signOut after.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import {
  resolveUserStatus,
  getGracePeriodDays,
} from "@/lib/user-status";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, status: true, deleteAfter: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const status = resolveUserStatus(user);
  if (status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Account is not active" },
      { status: 403 }
    );
  }

  let reason: string | undefined;
  try {
    const body = await req.json();
    reason = typeof body?.reason === "string" ? body.reason : undefined;
  } catch {
    // no body or invalid JSON
  }

  const now = new Date();
  const graceDays = getGracePeriodDays();
  const deleteAfter = new Date(now.getTime() + graceDays * 86_400_000);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        status: "SUSPENDED",
        suspendedAt: now,
        deleteAfter,
      },
    }),
    prisma.userSession.updateMany({
      where: { userId },
      data: { revokedAt: now },
    }),
    prisma.userDeletionRequest.create({
      data: {
        userId,
        reason: reason ?? null,
        deleteAfter,
      },
    }),
  ]);

  void createActivityLog({
    userId,
    action: ActivityLogAction.ACCOUNT_DEACTIVATE,
    entityType: "USER",
    entityId: userId,
    details: reason ? { reason } : undefined,
  });

  return NextResponse.json({
    ok: true,
    deleteAfter: deleteAfter.toISOString(),
  });
}
