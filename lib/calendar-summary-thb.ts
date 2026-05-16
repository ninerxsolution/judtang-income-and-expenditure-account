import type { Prisma } from "@prisma/client";
import {
  computeBaseAmountThb,
  defaultExchangeRateThbPerUnit,
  normalizeCurrencyCode,
} from "@/lib/currency";

export type CalendarSummaryTxRow = {
  type: string;
  transferLeg: string | null;
  amount: Prisma.Decimal | number | string;
  currency: string;
  exchangeRate: number | string | Prisma.Decimal | null;
  baseAmount: number | string | Prisma.Decimal | null;
};

function toFiniteNumber(
  value: Prisma.Decimal | number | string | null | undefined,
): number | null {
  if (value == null) return null;
  if (typeof value === "object" && "toNumber" in value) {
    const n = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Approximate THB total for one row (uses stored baseAmount when present). */
export function calendarTransactionAmountThb(tx: CalendarSummaryTxRow): number {
  const amount = toFiniteNumber(tx.amount);
  if (amount == null) return 0;
  const absAmount = Math.abs(amount);

  const base = toFiniteNumber(tx.baseAmount);
  if (base != null) return Math.abs(base);

  const currency = normalizeCurrencyCode(tx.currency);
  const rate = toFiniteNumber(tx.exchangeRate) ?? defaultExchangeRateThbPerUnit(currency);
  try {
    return computeBaseAmountThb(absAmount, currency, rate);
  } catch {
    return 0;
  }
}

export type DaySummaryAccumulator = {
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
  incomeSumThb: number;
  expenseSumThb: number;
  transferSumThb: number;
};

export const emptyDaySummaryAccumulator = (): DaySummaryAccumulator => ({
  count: 0,
  incomeCount: 0,
  expenseCount: 0,
  transferCount: 0,
  incomeSumThb: 0,
  expenseSumThb: 0,
  transferSumThb: 0,
});

export function accumulateCalendarDaySummary(
  prev: DaySummaryAccumulator,
  tx: CalendarSummaryTxRow,
): DaySummaryAccumulator {
  const typeUpper = String(tx.type).toUpperCase();
  const isIncome = typeUpper === "INCOME";
  const isExpense = typeUpper === "EXPENSE";
  const isTransfer =
    typeUpper === "TRANSFER" && (tx.transferLeg == null || tx.transferLeg === "OUT");
  const thb = calendarTransactionAmountThb(tx);

  return {
    count: prev.count + 1,
    incomeCount: prev.incomeCount + (isIncome ? 1 : 0),
    expenseCount: prev.expenseCount + (isExpense ? 1 : 0),
    transferCount: prev.transferCount + (isTransfer ? 1 : 0),
    incomeSumThb: prev.incomeSumThb + (isIncome ? thb : 0),
    expenseSumThb: prev.expenseSumThb + (isExpense ? thb : 0),
    transferSumThb: prev.transferSumThb + (isTransfer ? thb : 0),
  };
}
