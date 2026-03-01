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
  const yearParam = searchParams.get("year");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const yearNumber = yearParam ? Number.parseInt(yearParam, 10) : NaN;

  if (!Number.isFinite(yearNumber)) {
    return NextResponse.json(
      { error: "year query parameter is required (YYYY)" },
      { status: 400 },
    );
  }

  const fromRange = getDateRangeInTimezone(
    `${yearNumber}-01-01`,
    timezoneParam,
  );
  const toRange = getDateRangeInTimezone(
    `${yearNumber}-12-31`,
    timezoneParam,
  );
  if (!fromRange || !toRange) {
    return NextResponse.json(
      { error: "Invalid year parameter" },
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

    const monthMap = new Map<
      number,
      { count: number; incomeCount: number; expenseCount: number; transferCount: number }
    >();

    for (const tx of items) {
      const dateStr = toDateStringInTimezone(tx.occurredAt, timezoneParam);
      const monthPart = dateStr.split("-")[1];
      const m = monthPart ? parseInt(monthPart, 10) - 1 : 0; // 0-11
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

    const result = Array.from(monthMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([monthIndex, { count, incomeCount, expenseCount, transferCount }]) => ({
        monthIndex,
        hasTransactions: count > 0,
        count,
        incomeCount,
        expenseCount,
        transferCount,
      }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load month summary" },
      { status: 500 },
    );
  }
}

