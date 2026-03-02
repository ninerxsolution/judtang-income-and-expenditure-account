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

type MonthSummaryItem = {
  monthIndex: number;
  hasTransactions: boolean;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
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
    select: { occurredAt: true, type: true },
  });

  const monthMap = new Map<
    number,
    { count: number; incomeCount: number; expenseCount: number; transferCount: number }
  >();

  for (const tx of items) {
    const dateStr = toDateStringInTimezone(tx.occurredAt, timezone);
    const monthPart = dateStr.split("-")[1];
    const m = monthPart ? parseInt(monthPart, 10) - 1 : 0;
    const prev = monthMap.get(m) ?? {
      count: 0,
      incomeCount: 0,
      expenseCount: 0,
      transferCount: 0,
    };
    const typeUpper = String(tx.type).toUpperCase();
    const isIncome = typeUpper === "INCOME";
    const isExpense = typeUpper === "EXPENSE";
    const isTransfer = typeUpper === "TRANSFER";
    monthMap.set(m, {
      count: prev.count + 1,
      incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
      expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
      transferCount: prev.transferCount + (isTransfer ? 1 : 0),
    });
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([monthIndex, { count, incomeCount, expenseCount, transferCount }]) => ({
      monthIndex,
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
      (uid: string, year: number, tz: string) => fetchMonthSummary(uid, year, tz),
      cacheKey("transactions-month-summary", userId, String(yearNumber), timezoneParam),
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

