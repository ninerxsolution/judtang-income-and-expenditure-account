import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  getDateRangeInTimezone,
  toDateStringInTimezone,
} from "@/lib/date-range";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey } from "@/lib/cache";
import {
  accumulateCalendarDaySummary,
  emptyDaySummaryAccumulator,
} from "@/lib/calendar-summary-thb";

type SessionWithId = { user: { id?: string }; sessionId?: string };

type MonthSummaryItem = {
  monthIndex: number;
  hasTransactions: boolean;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  incomeSumThb: number;
  expenseSumThb: number;
  transferSumThb: number;
};

async function fetchMonthSummary(
  userId: string,
  year: number,
  timezone: string,
): Promise<MonthSummaryItem[]> {
  const fromRange = getDateRangeInTimezone(`${year}-01-01`, timezone);
  const toRange = getDateRangeInTimezone(`${year}-12-31`, timezone);
  if (!fromRange || !toRange) throw new Error("Invalid year");

  const items = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: fromRange.from, lte: toRange.to },
    },
    select: {
      occurredAt: true,
      type: true,
      transferLeg: true,
      amount: true,
      currency: true,
      exchangeRate: true,
      baseAmount: true,
    },
  });

  const monthMap = new Map<number, ReturnType<typeof emptyDaySummaryAccumulator>>();

  for (const tx of items) {
    const dateStr = toDateStringInTimezone(tx.occurredAt, timezone);
    const monthPart = dateStr.split("-")[1];
    const m = monthPart ? parseInt(monthPart, 10) - 1 : 0;
    const prev = monthMap.get(m) ?? emptyDaySummaryAccumulator();
    monthMap.set(m, accumulateCalendarDaySummary(prev, tx));
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a - b)
    .map(
      ([
        monthIndex,
        {
          count,
          incomeCount,
          expenseCount,
          transferCount,
          incomeSumThb,
          expenseSumThb,
          transferSumThb,
        },
      ]) => ({
        monthIndex,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
        transferCount,
        incomeSumThb,
        expenseSumThb,
        transferSumThb,
      }),
    );
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const yearNumber = yearParam ? Number.parseInt(yearParam, 10) : NaN;

  if (!Number.isFinite(yearNumber)) {
    return NextResponse.json(
      { error: "year query parameter is required (YYYY)" },
      { status: 400 },
    );
  }

  try {
    const getCached = unstable_cache(
      (uid: string, y: number, tz: string) => fetchMonthSummary(uid, y, tz),
      cacheKey("transactions-month-summary", "thb-v1", userId, String(yearNumber), timezoneParam),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] },
    );
    const result = await getCached(userId, yearNumber, timezoneParam);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load month summary" },
      { status: 500 },
    );
  }
}
