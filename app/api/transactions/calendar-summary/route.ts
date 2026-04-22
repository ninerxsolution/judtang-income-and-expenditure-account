import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getDateRangeInTimezone,
  toDateStringInTimezone,
} from "@/lib/date-range";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

type CalendarSummaryItem = {
  date: string;
  hasTransactions: boolean;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
};

async function fetchCalendarSummary(
  userId: string,
  fromParam: string,
  toParam: string,
  timezone: string,
  financialAccountId: string | undefined,
): Promise<CalendarSummaryItem[]> {
  const fromRange = getDateRangeInTimezone(fromParam, timezone);
  const toRange = getDateRangeInTimezone(toParam, timezone);
  if (!fromRange || !toRange) throw new Error("Invalid date range");

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: fromRange.from, lte: toRange.to },
      ...(financialAccountId ? { financialAccountId } : {}),
    },
    select: { occurredAt: true, type: true, transferLeg: true },
  });

  const summaryMap = new Map<
    string,
    { count: number; incomeCount: number; expenseCount: number; transferCount: number }
  >();

  for (const tx of transactions) {
    const dateIso = toDateStringInTimezone(tx.occurredAt, timezone);
    const prev = summaryMap.get(dateIso) ?? {
      count: 0,
      incomeCount: 0,
      expenseCount: 0,
      transferCount: 0,
    };
    const typeUpper = String(tx.type).toUpperCase();
    const isIncome = typeUpper === "INCOME";
    const isExpense = typeUpper === "EXPENSE";
    const isTransfer =
      typeUpper === "TRANSFER" &&
      (tx.transferLeg == null || tx.transferLeg === "OUT");
    summaryMap.set(dateIso, {
      count: prev.count + 1,
      incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
      expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
      transferCount: prev.transferCount + (isTransfer ? 1 : 0),
    });
  }

  return Array.from(summaryMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([date, { count, incomeCount, expenseCount, transferCount }]) => ({
      date,
      hasTransactions: count > 0,
      count,
      incomeCount,
      expenseCount,
      transferCount,
    }));
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
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;

  if (!fromParam || !toParam) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const getCached = unstable_cache(
      (uid: string, from: string, to: string, tz: string, accId: string | undefined) =>
        fetchCalendarSummary(uid, from, to, tz, accId),
      cacheKey("transactions-calendar-summary", userId, fromParam, toParam, timezoneParam, financialAccountIdParam ?? ""),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] },
    );
    const result = await getCached(userId, fromParam, toParam, timezoneParam, financialAccountIdParam);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load calendar summary" },
      { status: 500 },
    );
  }
}

