import { prisma } from "@/lib/prisma";
import { Prisma, TransactionType } from "@prisma/client";
import { getOutstandingAsOf } from "@/lib/credit-card";
import { approximateBalanceThb } from "@/lib/fx-display";

/**
 * Balance = initialBalance + sum(INCOME) - sum(EXPENSE) + sum(TRANSFER in) - sum(TRANSFER out)
 * TRANSFER: financialAccountId = source (-amount), transferAccountId = destination (+amount).
 * For CREDIT_CARD: returns -currentOutstanding (liability as negative from user perspective).
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  return getAccountBalanceAsOf(accountId);
}

/**
 * Balance of an account as of a given date (occurredAt <= endDate).
 * For CREDIT_CARD: returns -outstanding as of that date.
 */
export async function getAccountBalanceAsOf(
  accountId: string,
  endDate?: Date,
): Promise<number> {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: {
      initialBalance: true,
      type: true,
      cardAccountType: true,
      linkedAccountId: true,
      currency: true,
    },
  });

  if (!account) {
    return 0;
  }

  if (account.type === "CREDIT_CARD") {
    const isDebit =
      account.cardAccountType?.toLowerCase() === "debit" &&
      Boolean(account.linkedAccountId?.trim());
    if (isDebit) {
      return getAccountBalanceAsOf(account.linkedAccountId!, endDate);
    }
    const outstanding = await getOutstandingAsOf(accountId, endDate);
    return -outstanding;
  }

  const occurredAtFilter = endDate ? { occurredAt: { lte: endDate } } : {};
  const baseWhere = { financialAccountId: accountId, ...occurredAtFilter };

  const transferOutWhere: Prisma.TransactionWhereInput = {
    ...baseWhere,
    type: TransactionType.TRANSFER,
    OR: [
      {
        AND: [
          { transferGroupId: null },
          { transferAccountId: { not: null } },
        ],
      },
      { transferLeg: "OUT" },
    ],
  };

  const transferInWhere: Prisma.TransactionWhereInput = {
    type: TransactionType.TRANSFER,
    ...occurredAtFilter,
    OR: [
      { transferAccountId: accountId },
      {
        AND: [{ transferLeg: "IN" }, { financialAccountId: accountId }],
      },
    ],
  };

  const [incomeSum, expenseSum, transferOutSum, transferInSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...baseWhere, type: TransactionType.INCOME },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...baseWhere, type: TransactionType.EXPENSE },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: transferOutWhere,
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: transferInWhere,
      _sum: { amount: true },
    }),
  ]);

  const income = Number(incomeSum._sum.amount ?? 0);
  const expense = Number(expenseSum._sum.amount ?? 0);
  const transferOut = Number(transferOutSum._sum.amount ?? 0);
  const transferIn = Number(transferInSum._sum.amount ?? 0);
  const initial = Number(account.initialBalance);

  return initial + income - expense - transferOut + transferIn;
}

/**
 * Total net balance = sum of all active account balances for the user.
 * Asset accounts (BANK, WALLET, CASH, OTHER) contribute positively;
 * CREDIT_CARD (credit) contributes negatively (liability).
 * Debit cards are excluded — their balance is the same as the linked bank account.
 */
export async function getTotalBalance(userId: string): Promise<number> {
  return getTotalBalanceAsOf(userId);
}

export type NetWorthTrendOptions = {
  year: number;
  timezone?: string;
  financialAccountId?: string;
};

export type NetWorthTrendItem = {
  monthIndex: number;
  netWorth: number;
};

/**
 * Total net worth in THB (mixed-currency accounts converted with display FX rules).
 * `approximate` is true when any included account used a non-snapshot rate (e.g. fallback USD).
 */
export async function getTotalBalanceMeta(
  userId: string,
  endDate?: Date,
  financialAccountId?: string,
): Promise<{ thb: number; approximate: boolean }> {
  const accounts = await prisma.financialAccount.findMany({
    where: {
      userId,
      isActive: true,
      ...(financialAccountId ? { id: financialAccountId } : {}),
    },
    select: { id: true, type: true, cardAccountType: true, linkedAccountId: true, currency: true },
  });
  const toSum = accounts.filter((a) => {
    if (a.type !== "CREDIT_CARD") return true;
    const isDebit =
      a.cardAccountType?.toLowerCase() === "debit" &&
      Boolean(a.linkedAccountId?.trim());
    return !isDebit;
  });
  const balances = await Promise.all(
    toSum.map((a) => getAccountBalanceAsOf(a.id, endDate)),
  );
  let totalThb = 0;
  let approximate = false;
  for (let i = 0; i < toSum.length; i++) {
    const acc = toSum[i]!;
    const bal = balances[i]!;
    const { thb, approximate: apx } = approximateBalanceThb(bal, acc.currency ?? "THB");
    totalThb += thb;
    if (apx) approximate = true;
  }
  return { thb: totalThb, approximate };
}

/**
 * Total net balance as of a given date.
 * When financialAccountId is provided, returns only that account's balance.
 */
export async function getTotalBalanceAsOf(
  userId: string,
  endDate?: Date,
  financialAccountId?: string,
): Promise<number> {
  const { thb } = await getTotalBalanceMeta(userId, endDate, financialAccountId);
  return thb;
}

/**
 * Net worth at end of each month for a given year.
 * Returns 12 data points for charting.
 */
export async function getNetWorthTrend(
  userId: string,
  options: NetWorthTrendOptions,
): Promise<NetWorthTrendItem[]> {
  const { year, timezone = "Asia/Bangkok", financialAccountId } = options;
  const { getDateRangeInTimezone } = await import("@/lib/date-range");

  const result: NetWorthTrendItem[] = [];
  for (let m = 0; m < 12; m++) {
    const lastDay = new Date(year, m + 1, 0).getDate();
    const dateStr = `${year}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const range = getDateRangeInTimezone(dateStr, timezone);
    const endOfMonth = range?.to;
    if (!endOfMonth) continue;
    const netWorth = await getTotalBalanceAsOf(userId, endOfMonth, financialAccountId);
    result.push({ monthIndex: m, netWorth });
  }
  return result;
}
