/**
 * Picks stored running balance for the row for UI: primary account when no filter,
 * or the balance for `filterFinancialAccountId` when listing one account.
 */
export function resolvedBalanceAfterSnapshot(params: {
  financialAccountId: string | null | undefined;
  transferAccountId: string | null | undefined;
  accountBalanceAfter: number | null | undefined;
  transferAccountBalanceAfter: number | null | undefined;
  filterFinancialAccountId?: string | null;
}): number | null {
  const fid = params.filterFinancialAccountId?.trim() ?? "";
  if (!fid) {
    return params.accountBalanceAfter ?? null;
  }
  if (params.financialAccountId === fid) {
    return params.accountBalanceAfter ?? null;
  }
  if (params.transferAccountId === fid) {
    return params.transferAccountBalanceAfter ?? null;
  }
  return null;
}
