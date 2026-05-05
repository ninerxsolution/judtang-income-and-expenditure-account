/**
 * Pure eligibility / completeness rules for financial accounts (no Prisma).
 * Safe to import from Client Components — must not pull in `@/lib/prisma` or DB drivers.
 */

const REQUIRES_BANK_AND_NUMBER: string[] = ["BANK", "CREDIT_CARD", "WALLET"];

type AccountForIncompleteCheck = {
  type: string;
  bankName?: string | null;
  accountNumber?: string | null;
  creditLimit?: number | string | { toNumber?: () => number } | null;
  interestRate?: number | string | { toNumber?: () => number } | null;
  cardAccountType?: string | null;
  linkedAccountId?: string | null;
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
 * CREDIT_CARD (credit): bank + account number + card type + credit limit + interest rate.
 * CREDIT_CARD (debit): bank + account number + card type + linked bank/wallet account id.
 * Callers that pass a partial Prisma select must include `linkedAccountId` when type may be debit.
 */
export function isAccountIncomplete(acc: AccountForIncompleteCheck): boolean {
  if (!REQUIRES_BANK_AND_NUMBER.includes(acc.type)) return false;
  const hasBank = Boolean(acc.bankName?.trim());
  const hasAccountNumber = Boolean(
    acc.accountNumber && String(acc.accountNumber).replace(/\D/g, "").length >= 4
  );
  if (!hasBank || !hasAccountNumber) return true;

  if (acc.type === "CREDIT_CARD") {
    const hasCardAccountType = Boolean(acc.cardAccountType?.trim());
    if (!hasCardAccountType) return true;

    const isDebit = acc.cardAccountType?.toLowerCase() === "debit";
    if (isDebit) {
      const hasLinkedAccount = Boolean(acc.linkedAccountId?.trim());
      return !hasLinkedAccount;
    }

    const limit = toNum(acc.creditLimit);
    const rate = toNum(acc.interestRate);
    const hasCreditLimit = limit != null && limit >= 0;
    const hasInterestRate = rate != null && rate >= 0;
    return !hasCreditLimit || !hasInterestRate;
  }

  return false;
}

const RECONCILIATION_ELIGIBLE_TYPES = new Set(["BANK", "WALLET", "CASH", "OTHER"]);

/**
 * Asset-style accounts (and debit cards) can record balance reconciliation rounds.
 * Credit cards (non-debit) are excluded.
 */
export function isFinancialAccountBalanceReconciliationEligible(acc: {
  type: string;
  cardAccountType?: string | null;
}): boolean {
  if (acc.type === "CREDIT_CARD") {
    return acc.cardAccountType?.toLowerCase() === "debit";
  }
  return RECONCILIATION_ELIGIBLE_TYPES.has(acc.type);
}
