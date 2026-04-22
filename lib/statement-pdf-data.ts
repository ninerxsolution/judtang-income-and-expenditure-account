import type { TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAccountBalanceAsOf, getTotalBalanceAsOf } from "@/lib/balance";
import type { StatementPdfData } from "@/lib/statement-pdf";
import { formatAmountWithOptionalThbParenthesis } from "@/lib/fx-display";
import { decimalLikeToNumber, isBaseCurrency, normalizeCurrencyCode } from "@/lib/currency";

type TransactionWithRelations = {
  id: string;
  type: string;
  amount: unknown;
  currency?: string;
  exchangeRate?: unknown;
  baseAmount?: unknown;
  transferLeg?: string | null;
  category: string | null;
  note: string | null;
  occurredAt: Date;
  financialAccountId: string | null;
  transferAccountId: string | null;
  financialAccount: { name: string } | null;
  transferAccount: { name: string } | null;
};

function toNum(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatPdfMoney(n: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Debit/credit cell: primary in row currency + (THB) when snapshot base exists. */
function formatStatementCell(
  value: number,
  tx: Pick<
    TransactionWithRelations,
    "amount" | "currency" | "exchangeRate" | "baseAmount"
  >,
): string {
  if (value <= 0) return "";
  const cur = normalizeCurrencyCode(tx.currency ?? "THB");
  const baseSnap = decimalLikeToNumber(tx.baseAmount);
  const baseParen =
    !isBaseCurrency(cur) && baseSnap != null ? Math.abs(baseSnap) : null;
  return formatAmountWithOptionalThbParenthesis({
    amount: value,
    currency: cur,
    baseAmount: baseParen,
    formatMoney: formatPdfMoney,
  });
}

/**
 * Credit types: INCOME, TRANSFER-in (transferAccountId = our account), PAYMENT (on card)
 * Debit types: EXPENSE, TRANSFER-out (financialAccountId = our account), INTEREST, PAYMENT from bank
 */
function getDebitCredit(
  tx: TransactionWithRelations,
  filteredAccountId: string | undefined,
): { debit: number; credit: number } {
  const amount = toNum(tx.amount);
  const type = String(tx.type).toUpperCase();

  if (filteredAccountId) {
    const isSource = tx.financialAccountId === filteredAccountId;
    const isDest = tx.transferAccountId === filteredAccountId;

    if (type === "INCOME") {
      return { debit: 0, credit: isSource ? amount : 0 };
    }
    if (type === "EXPENSE") {
      return { debit: isSource ? amount : 0, credit: 0 };
    }
    if (type === "TRANSFER") {
      const leg = tx.transferLeg;
      if (leg === "OUT" && tx.financialAccountId === filteredAccountId) {
        return { debit: amount, credit: 0 };
      }
      if (leg === "IN" && tx.financialAccountId === filteredAccountId) {
        return { debit: 0, credit: amount };
      }
      if (leg == null || leg === "") {
        if (isSource) return { debit: amount, credit: 0 };
        if (isDest) return { debit: 0, credit: amount };
      }
      return { debit: 0, credit: 0 };
    }
    if (type === "PAYMENT") {
      // PAYMENT: financialAccountId = card (receiving payment)
      return { debit: 0, credit: isSource ? amount : 0 };
    }
    if (type === "INTEREST") {
      return { debit: isSource ? amount : 0, credit: 0 };
    }
    if (type === "ADJUSTMENT") {
      return { debit: isSource ? amount : 0, credit: 0 };
    }
  }

  // No account filter: show debit/credit by type
  if (type === "INCOME") return { debit: 0, credit: amount };
  if (type === "EXPENSE" || type === "INTEREST") return { debit: amount, credit: 0 };
  if (type === "TRANSFER") {
    if (tx.financialAccountId) return { debit: amount, credit: 0 };
    if (tx.transferAccountId) return { debit: 0, credit: amount };
    return { debit: 0, credit: 0 };
  }
  if (type === "PAYMENT") return { debit: 0, credit: amount };
  if (type === "ADJUSTMENT") return { debit: amount, credit: 0 };
  return { debit: 0, credit: 0 };
}

export async function buildStatementPdfData(params: {
  userId: string;
  fromDate?: Date;
  toDate?: Date;
  typeFilter?: string;
  financialAccountId?: string;
  locale?: string;
}): Promise<StatementPdfData> {
  const {
    userId,
    fromDate,
    toDate,
    typeFilter,
    financialAccountId,
    locale = "th",
  } = params;

  const [user, account, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),
    financialAccountId
      ? prisma.financialAccount.findUnique({
          where: { id: financialAccountId },
          select: { name: true, type: true },
        })
      : null,
    prisma.transaction.findMany({
      where: {
        userId,
        ...(fromDate || toDate
          ? {
              occurredAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        ...(typeFilter ? { type: typeFilter as TransactionType } : {}),
        ...(financialAccountId
          ? {
              OR: [
                { financialAccountId },
                { transferAccountId: financialAccountId },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
      include: {
        financialAccount: { select: { name: true } },
        transferAccount: { select: { name: true } },
      },
    }),
  ]);

  const generatedAt = new Date();

  let openingBalance: number | null = null;
  let closingBalance: number | null = null;

  if (financialAccountId && account) {
    const dayBeforeFrom = fromDate
      ? new Date(fromDate.getTime() - 24 * 60 * 60 * 1000)
      : undefined;
    openingBalance = await getAccountBalanceAsOf(
      financialAccountId,
      dayBeforeFrom,
    );
  } else if (!financialAccountId && (fromDate || toDate)) {
    const startOfRange = fromDate ?? new Date(0);
    const endOfRange = toDate ?? new Date();
    openingBalance = await getTotalBalanceAsOf(userId, startOfRange);
    closingBalance = await getTotalBalanceAsOf(userId, endOfRange);
  }

  let totalCredits = 0;
  let totalDebits = 0;

  const txRows = transactions.map((tx) => {
    const { debit, credit } = getDebitCredit(tx, financialAccountId);
    totalCredits += credit;
    totalDebits += debit;

    return {
      id: tx.id,
      type: tx.type,
      amount: toNum(tx.amount),
      category: tx.category,
      note: tx.note,
      occurredAt: tx.occurredAt,
      debit,
      credit,
      debitDisplay: formatStatementCell(debit, tx),
      creditDisplay: formatStatementCell(credit, tx),
      accountName: tx.financialAccount?.name,
      transferAccountName: tx.transferAccount?.name,
    };
  });

  if (financialAccountId && openingBalance != null) {
    closingBalance = openingBalance + totalCredits - totalDebits;
  }

  return {
    user: {
      name: user?.name ?? null,
      email: user?.email ?? null,
    },
    account: account
      ? { name: account.name, type: account.type }
      : undefined,
    fromDate: fromDate ?? null,
    toDate: toDate ?? null,
    generatedAt,
    openingBalance,
    totalCredits,
    totalDebits,
    closingBalance,
    transactions: txRows,
    locale,
  };
}
