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

  const startYear = Math.min(fromYear, toYear);
  const endYear = Math.max(fromYear, toYear);

  const fromRange = getDateRangeInTimezone(
    `${startYear}-01-01`,
    timezoneParam,
  );
  const toRange = getDateRangeInTimezone(
    `${endYear}-12-31`,
    timezoneParam,
  );
  if (!fromRange || !toRange) {
    return NextResponse.json(
      { error: "Invalid year parameters" },
      { status: 400 },
    );
  }

  const from = fromRange.from;
  const to = toRange.to;

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
      { count: number; incomeCount: number; expenseCount: number; transferCount: number }
    >();

    for (const tx of items) {
      const dateStr = toDateStringInTimezone(tx.occurredAt, timezoneParam);
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

    const result = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([year, { count, incomeCount, expenseCount, transferCount }]) => ({
        year,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
        transferCount,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load year summary" },
      { status: 500 },
    );
  }
}

