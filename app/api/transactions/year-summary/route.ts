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
  const fromYearParam = searchParams.get("fromYear");
  const toYearParam = searchParams.get("toYear");

  const fromYear = fromYearParam ? Number.parseInt(fromYearParam, 10) : NaN;
  const toYear = toYearParam ? Number.parseInt(toYearParam, 10) : NaN;

  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
    return NextResponse.json(
      { error: "fromYear and toYear query parameters are required (YYYY)" },
      { status: 400 },
    );
  }

  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);

  const from = new Date(startYear, 0, 1, 0, 0, 0, 0);
  const to = new Date(endYear, 11, 31, 23, 59, 59, 999);

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
        type: true,
      },
    });

    const yearMap = new Map<
      number,
      { count: number; incomeCount: number; expenseCount: number }
    >();

    for (const tx of items) {
      const y = tx.occurredAt.getFullYear();
      const prev = yearMap.get(y) ?? {
        count: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
      const isIncome = String(tx.type).toUpperCase() === "INCOME";
      const isExpense = String(tx.type).toUpperCase() === "EXPENSE";
      yearMap.set(y, {
        count: prev.count + 1,
        incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
        expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
      });
    }

    const result = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, { count, incomeCount, expenseCount }]) => ({
        year,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load year summary" },
      { status: 500 },
    );
  }
}

