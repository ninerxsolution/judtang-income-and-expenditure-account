/**
 * POST /api/auth/logout — record logout in activity log (call before client signOut).
 * Does not revoke the session; the client should call signOut() after this.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function POST() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (userId) {
    void createActivityLog({
      userId,
      action: ActivityLogAction.USER_LOGGED_OUT,
      entityType: "user",
      entityId: userId,
    });
  }

  return NextResponse.json({ ok: true });
}
