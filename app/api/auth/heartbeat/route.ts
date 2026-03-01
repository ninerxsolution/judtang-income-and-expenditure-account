/**
 * Heartbeat API — updates User.lastActiveAt for the current session user.
 * Call periodically from the client (e.g. when tab is active) to mark user as active.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
