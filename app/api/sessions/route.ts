/**
 * GET: list active sessions for the current user.
 * POST: touch current session (update lastActiveAt, userAgent, ipAddress).
 * DELETE: revoke one session (sessionId), all others (revokeAllOthers), or all (revokeAll).
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

type SessionWithId = { user: { id?: string }; sessionId?: string };

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim() || null;
  return req.headers.get("x-real-ip") ?? null;
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  const currentSessionId = session?.sessionId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (currentSessionId) {
    const userAgent = req.headers.get("user-agent") ?? null;
    const ipAddress = getClientIp(req);
    const now = new Date();
    await prisma.$transaction([
      prisma.userSession.updateMany({
        where: { sessionId: currentSessionId, userId, revokedAt: null },
        data: { lastActiveAt: now, userAgent, ipAddress },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: now },
      }),
    ]);
  }

  const rows = await prisma.userSession.findMany({
    where: { userId, revokedAt: null },
    orderBy: { lastActiveAt: "desc" },
    select: {
      sessionId: true,
      userAgent: true,
      ipAddress: true,
      lastActiveAt: true,
      createdAt: true,
    },
  });

  type RowItem = (typeof rows)[number];
  const sessions = rows.map((r: RowItem) => ({
    sessionId: r.sessionId,
    userAgent: r.userAgent ?? null,
    ipAddress: r.ipAddress ?? null,
    lastActiveAt: r.lastActiveAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    isCurrent: r.sessionId === currentSessionId,
  }));

  return NextResponse.json({
    sessions,
    currentSessionId: currentSessionId ?? null,
  });
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  const currentSessionId = session?.sessionId;

  if (!userId || !currentSessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userAgent = req.headers.get("user-agent") ?? null;
  const ipAddress = getClientIp(req);
  const now = new Date();

  await prisma.$transaction([
    prisma.userSession.updateMany({
      where: { sessionId: currentSessionId, userId, revokedAt: null },
      data: { lastActiveAt: now, userAgent, ipAddress },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: now },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  const currentSessionId = session?.sessionId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");
  const revokeAll = searchParams.get("revokeAll") === "true";
  const revokeAllOthers = searchParams.get("revokeAllOthers") === "true";

  let signOutCurrent = false;
  const revokedAt = new Date();

  if (revokeAll) {
    await prisma.userSession.updateMany({
      where: { userId },
      data: { revokedAt },
    });
    void createActivityLog({
      userId,
      action: ActivityLogAction.SESSION_REVOKED,
      entityType: "session",
      details: { scope: "all" },
    });
    signOutCurrent = true;
  } else if (revokeAllOthers && currentSessionId) {
    await prisma.userSession.updateMany({
      where: { userId, sessionId: { not: currentSessionId } },
      data: { revokedAt },
    });
    void createActivityLog({
      userId,
      action: ActivityLogAction.SESSION_REVOKED,
      entityType: "session",
      details: { scope: "others" },
    });
  } else if (sessionId) {
    const row = await prisma.userSession.findFirst({
      where: { sessionId, userId },
    });
    if (row) {
      await prisma.userSession.update({
        where: { id: row.id },
        data: { revokedAt },
      });
      void createActivityLog({
        userId,
        action: ActivityLogAction.SESSION_REVOKED,
        entityType: "session",
        entityId: sessionId,
        details: { scope: "one" },
      });
      if (sessionId === currentSessionId) signOutCurrent = true;
    }
  } else {
    return NextResponse.json(
      { error: "Provide sessionId, revokeAll=true, or revokeAllOthers=true" },
      { status: 400 }
    );
  }

  return NextResponse.json({ signOut: signOutCurrent });
}
