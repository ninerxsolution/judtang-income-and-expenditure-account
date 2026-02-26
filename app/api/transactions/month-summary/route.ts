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
        type: true,
      },
    });

    const monthMap = new Map<
      number,
      { count: number; incomeCount: number; expenseCount: number }
    >();

    for (const tx of items) {
      const m = tx.occurredAt.getMonth(); // 0-11
      const prev = monthMap.get(m) ?? {
        count: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
      const isIncome = String(tx.type).toUpperCase() === "INCOME";
      const isExpense = String(tx.type).toUpperCase() === "EXPENSE";
      monthMap.set(m, {
        count: prev.count + 1,
        incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
        expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
      });
    }

    const result = Array.from(monthMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([monthIndex, { count, incomeCount, expenseCount }]) => ({
        monthIndex,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load month summary" },
      { status: 500 },
    );
  }
}

