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

type YearSummaryItem = {
  year: number;
  hasTransactions: boolean;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
};

async function fetchYearSummary(
  userId: string,
  fromYear: number,
  toYear: number,
  timezone: string,
): Promise<YearSummaryItem[]> {
  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);
  const fromRange = getDateRangeInTimezone(`${startYear}-01-01`, timezone);
  const toRange = getDateRangeInTimezone(`${endYear}-12-31`, timezone);
  if (!fromRange || !toRange) throw new Error("Invalid year parameters");

  const items = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: fromRange.from, lte: toRange.to },
    },
    select: { occurredAt: true, type: true },
  });

  const yearMap = new Map<
    number,
    { count: number; incomeCount: number; expenseCount: number; transferCount: number }
  >();

  for (const tx of items) {
    const dateStr = toDateStringInTimezone(tx.occurredAt, timezone);
    const yearPart = dateStr.split("-")[0];
    const y = yearPart ? parseInt(yearPart, 10) : tx.occurredAt.getFullYear();
    const prev = yearMap.get(y) ?? {
      count: 0,
      incomeCount: 0,
      expenseCount: 0,
      transferCount: 0,
    };
    const typeUpper = String(tx.type).toUpperCase();
    const isIncome = typeUpper === "INCOME";
    const isExpense = typeUpper === "EXPENSE";
    const isTransfer = typeUpper === "TRANSFER";
    yearMap.set(y, {
      count: prev.count + 1,
      incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
      expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
      transferCount: prev.transferCount + (isTransfer ? 1 : 0),
    });
  }

  return Array.from(yearMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, { count, incomeCount, expenseCount, transferCount }]) => ({
      year,
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
  const fromYearParam = searchParams.get("fromYear");
  const toYearParam = searchParams.get("toYear");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";

  const fromYear = fromYearParam ? Number.parseInt(fromYearParam, 10) : NaN;
  const toYear = toYearParam ? Number.parseInt(toYearParam, 10) : NaN;

  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) {
    return NextResponse.json(
      { error: "fromYear and toYear query parameters are required (YYYY)" },
      { status: 400 },
    );
  }

  try {
    const getCached = unstable_cache(
      (uid: string, fy: number, ty: number, tz: string) =>
        fetchYearSummary(uid, fy, ty, tz),
      cacheKey("transactions-year-summary", userId, String(fromYear), String(toYear), timezoneParam),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] },
    );
    const result = await getCached(userId, fromYear, toYear, timezoneParam);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load year summary" },
      { status: 500 },
    );
  }
}

