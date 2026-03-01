import type { FinancialAccount } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const REQUIRES_BANK_AND_NUMBER: string[] = ["BANK", "CREDIT_CARD", "WALLET"];

type AccountForIncompleteCheck = {
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  creditLimit?: number | string | { toNumber?: () => number } | null;
  interestRate?: number | string | { toNumber?: () => number } | null;
  cardType?: string | null;
};

function toNum(
  v: number | string | { toNumber?: () => number; toString?: () => string } | null | undefined
): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v != null) {
    if ("toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
      return (v as { toNumber: () => number }).toNumber();
    }
    if ("toString" in v && typeof (v as { toString: () => string }).toString === "function") {
      const n = Number((v as { toString: () => string }).toString());
      return Number.isFinite(n) ? n : null;
    }
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Returns true if the account is incomplete and cannot be used.
 * BANK/WALLET: requires bank + account number.
 * CREDIT_CARD: requires bank + account number + credit limit + interest rate + card type.
 */
export function isAccountIncomplete(acc: AccountForIncompleteCheck): boolean {
  if (!REQUIRES_BANK_AND_NUMBER.includes(acc.type)) return false;
  const hasBank = Boolean(acc.bankName?.trim());
  const hasAccountNumber = Boolean(
    acc.accountNumber && String(acc.accountNumber).replace(/\D/g, "").length >= 4
  );
  if (!hasBank || !hasAccountNumber) return true;

  if (acc.type === "CREDIT_CARD") {
    const limit = toNum(acc.creditLimit);
    const rate = toNum(acc.interestRate);
    const hasCreditLimit = limit != null && limit >= 0;
    const hasInterestRate = rate != null && rate >= 0;
    const hasCardType = Boolean(acc.cardType?.trim());
    return !hasCreditLimit || !hasInterestRate || !hasCardType;
  }

  return false;
}

const DEFAULT_ACCOUNT_NAME = "บัญชีหลัก";

/**
 * Ensures the user has at least one FinancialAccount (default).
 * Creates one if none exist. Returns the default or first account.
 */
export async function ensureUserHasDefaultFinancialAccount(
  userId: string
): Promise<FinancialAccount> {
  const existing = await prisma.financialAccount.findFirst({
    where: { userId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (existing) {
    return existing;
  }

  return prisma.financialAccount.create({
    data: {
      userId,
      name: DEFAULT_ACCOUNT_NAME,
      type: "CASH",
      initialBalance: 0,
      isDefault: true,
      isActive: true,
    },
  });
}

export async function getDefaultFinancialAccount(
  userId: string
): Promise<FinancialAccount | null> {
  return prisma.financialAccount.findFirst({
    where: { userId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}
