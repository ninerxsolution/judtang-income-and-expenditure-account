/**
 * GET /api/users/active-count — count of users active within the last N minutes.
 * Query param: minutes (default 5).
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_MINUTES = 5;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const minutes = Math.min(
    60,
    Math.max(1, parseInt(searchParams.get("minutes") ?? String(DEFAULT_MINUTES), 10) || DEFAULT_MINUTES)
  );
  const since = new Date(Date.now() - minutes * 60 * 1000);

  const count = await prisma.user.count({
    where: { lastActiveAt: { gte: since } },
  });

  return NextResponse.json({ count, minutes });
}
