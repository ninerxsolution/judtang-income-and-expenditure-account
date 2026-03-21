import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionWithId = {
  user: { id?: string; role?: string };
  sessionId?: string;
};

const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "PAYMENT",
  "INTEREST",
  "ADJUSTMENT",
] as const;

type AdminTransactionUsageType = (typeof TRANSACTION_TYPES)[number];

type AdminTransactionUsageSeriesRow = {
  date: string;
  total: number;
} & Record<AdminTransactionUsageType, number>;

type RawAggRow = {
  d: Date;
  type: string;
  count: bigint;
};

const MAX_RANGE_DAYS = 731;

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseUtcDayStart(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

function addUtcDays(ymd: string, days: number): string {
  const d = parseUtcDayStart(ymd);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetweenInclusive(from: string, to: string): number {
  const a = parseUtcDayStart(from).getTime();
  const b = parseUtcDayStart(to).getTime();
  return Math.floor((b - a) / 86400000) + 1;
}

function utcDayKeysInclusive(from: string, to: string): string[] {
  const keys: string[] = [];
  let cur = parseUtcDayStart(from).getTime();
  const end = parseUtcDayStart(to).getTime();
  for (; cur <= end; cur += 86400000) {
    keys.push(new Date(cur).toISOString().slice(0, 10));
  }
  return keys;
}

function dateToUtcYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function emptyRow(date: string): AdminTransactionUsageSeriesRow {
  const base: Record<AdminTransactionUsageType, number> = {
    INCOME: 0,
    EXPENSE: 0,
    TRANSFER: 0,
    PAYMENT: 0,
    INTEREST: 0,
    ADJUSTMENT: 0,
  };
  return { date, total: 0, ...base };
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("fromDate")?.trim() ?? "";
  const toParam = searchParams.get("toDate")?.trim() ?? "";

  const todayUtc = new Date().toISOString().slice(0, 10);
  const defaultFrom = addUtcDays(todayUtc, -89);

  const fromDate = fromParam && isYmd(fromParam) ? fromParam : defaultFrom;
  const toDate = toParam && isYmd(toParam) ? toParam : todayUtc;

  if (fromDate > toDate) {
    return NextResponse.json({ error: "fromDate must be on or before toDate" }, { status: 400 });
  }

  const span = daysBetweenInclusive(fromDate, toDate);
  if (span > MAX_RANGE_DAYS) {
    return NextResponse.json(
      { error: `Date range must be at most ${MAX_RANGE_DAYS} days` },
      { status: 400 },
    );
  }

  const rangeStart = parseUtcDayStart(fromDate);
  const rangeEndExclusive = parseUtcDayStart(addUtcDays(toDate, 1));

  const rawRows = await prisma.$queryRaw<RawAggRow[]>(Prisma.sql`
    SELECT CAST(\`occurredAt\` AS DATE) AS d, \`type\`, COUNT(*) AS count
    FROM \`Transaction\`
    WHERE \`status\` = 'POSTED'
      AND \`occurredAt\` >= ${rangeStart}
      AND \`occurredAt\` < ${rangeEndExclusive}
    GROUP BY CAST(\`occurredAt\` AS DATE), \`type\`
    ORDER BY d ASC, \`type\` ASC
  `);

  const byDate = new Map<string, AdminTransactionUsageSeriesRow>();
  const dayKeys = utcDayKeysInclusive(fromDate, toDate);

  for (const key of dayKeys) {
    byDate.set(key, emptyRow(key));
  }

  for (const row of rawRows) {
    const key = dateToUtcYmd(row.d);
    let entry = byDate.get(key);
    if (!entry) {
      entry = emptyRow(key);
      byDate.set(key, entry);
    }
    const t = row.type as AdminTransactionUsageType;
    const n = Number(row.count);
    if (TRANSACTION_TYPES.includes(t)) {
      entry[t] += n;
      entry.total += n;
    } else {
      entry.total += n;
    }
  }

  const series: AdminTransactionUsageSeriesRow[] = dayKeys.map((k) => byDate.get(k) ?? emptyRow(k));

  return NextResponse.json({
    fromDate,
    toDate,
    series,
  });
}
