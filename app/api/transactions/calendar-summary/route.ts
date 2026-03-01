import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionWithId = { user: { id?: string }; sessionId?: string };

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;

  const fromParsed = parseDateOnly(fromParam);
  const toParsed = parseDateOnly(toParam);

  if (!fromParsed || !toParsed) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const from = startOfDay(fromParsed);
  const to = endOfDay(toParsed);

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        occurredAt: {
          gte: from,
          lte: to,
        },
        ...(financialAccountIdParam ? { financialAccountId: financialAccountIdParam } : {}),
      },
      select: {
        occurredAt: true,
        type: true,
      },
    });

    const summaryMap = new Map<
      string,
      { count: number; incomeCount: number; expenseCount: number }
    >();

    for (const tx of transactions) {
      const dateIso = tx.occurredAt.toISOString().slice(0, 10);
      const prev = summaryMap.get(dateIso) ?? {
        count: 0,
        incomeCount: 0,
        expenseCount: 0,
      };
      const isIncome =
        String(tx.type).toUpperCase() === "INCOME";
      const isExpense =
        String(tx.type).toUpperCase() === "EXPENSE";
      summaryMap.set(dateIso, {
        count: prev.count + 1,
        incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
        expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
      });
    }

    const result = Array.from(summaryMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, { count, incomeCount, expenseCount }]) => ({
        date,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load calendar summary" },
      { status: 500 },
    );
  }
}

