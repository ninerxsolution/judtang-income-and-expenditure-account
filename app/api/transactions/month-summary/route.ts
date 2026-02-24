import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const yearNumber = yearParam ? Number.parseInt(yearParam, 10) : NaN;

  if (!Number.isFinite(yearNumber)) {
    return NextResponse.json(
      { error: "year query parameter is required (YYYY)" },
      { status: 400 },
    );
  }

  const from = new Date(yearNumber, 0, 1, 0, 0, 0, 0);
  const to = new Date(yearNumber, 11, 31, 23, 59, 59, 999);

  try {
    const items = await prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        occurredAt: true,
      },
    });

    const monthMap = new Map<number, number>();

    for (const tx of items) {
      const m = tx.occurredAt.getMonth(); // 0-11
      const prev = monthMap.get(m) ?? 0;
      monthMap.set(m, prev + 1);
    }

    const result = Array.from(monthMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([monthIndex, count]) => ({
        monthIndex,
        hasTransactions: count > 0,
        count,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load month summary" },
      { status: 500 },
    );
  }
}

