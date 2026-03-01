import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getDateRangeInTimezone,
  toDateStringInTimezone,
} from "@/lib/date-range";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;

  const fromRange = fromParam ? getDateRangeInTimezone(fromParam, timezoneParam) : null;
  const toRange = toParam ? getDateRangeInTimezone(toParam, timezoneParam) : null;

  if (!fromRange || !toRange) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const from = fromRange.from;
  const to = toRange.to;

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
      { count: number; incomeCount: number; expenseCount: number; transferCount: number }
    >();

    for (const tx of transactions) {
      const dateIso = toDateStringInTimezone(tx.occurredAt, timezoneParam);
      const prev = summaryMap.get(dateIso) ?? {
        count: 0,
        incomeCount: 0,
        expenseCount: 0,
        transferCount: 0,
      };
      const typeUpper = String(tx.type).toUpperCase();
      const isIncome = typeUpper === "INCOME";
      const isExpense = typeUpper === "EXPENSE";
      const isTransfer = typeUpper === "TRANSFER";
      summaryMap.set(dateIso, {
        count: prev.count + 1,
        incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
        expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
        transferCount: prev.transferCount + (isTransfer ? 1 : 0),
      });
    }

    const result = Array.from(summaryMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, { count, incomeCount, expenseCount, transferCount }]) => ({
        date,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
        transferCount,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load calendar summary" },
      { status: 500 },
    );
  }
}

