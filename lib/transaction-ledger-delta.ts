/**
 * Signed effect of a transaction row on a given account's running balance (asset / bank view).
 * Mirrors filtered-account rules in statement-pdf-data getDebitCredit: net = credit − debit.
 */
export type LedgerDeltaRow = {
  type: string;
  amount: unknown;
  financialAccountId: string | null;
  transferAccountId: string | null;
  transferLeg: string | null;
};

function toNum(amount: unknown): number {
  if (amount != null && typeof amount === "object" && "toNumber" in amount) {
    return (amount as { toNumber: () => number }).toNumber();
  }
  return Number(amount);
}

export function ledgerNetChangeForAccount(row: LedgerDeltaRow, accountId: string): number {
  const amount = toNum(row.amount);
  const type = String(row.type).toUpperCase();
  const isSource = row.financialAccountId === accountId;
  const isDest = row.transferAccountId === accountId;

  if (type === "INCOME") {
    return isSource ? amount : 0;
  }
  if (type === "EXPENSE") {
    return isSource ? -amount : 0;
  }
  if (type === "TRANSFER") {
    const leg = row.transferLeg;
    if (leg === "OUT" && row.financialAccountId === accountId) {
      return -amount;
    }
    if (leg === "IN" && row.financialAccountId === accountId) {
      return amount;
    }
    if (leg == null || leg === "") {
      if (isSource) return -amount;
      if (isDest) return amount;
    }
    return 0;
  }
  if (type === "PAYMENT") {
    return isSource ? amount : 0;
  }
  if (type === "INTEREST") {
    return isSource ? -amount : 0;
  }
  if (type === "ADJUSTMENT") {
    return isSource ? -amount : 0;
  }
  return 0;
}
