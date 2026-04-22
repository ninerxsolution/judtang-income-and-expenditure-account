import {
  BASE_CURRENCY,
  DEFAULT_THB_PER_USD,
  decimalLikeToNumber,
  normalizeCurrencyCode,
  roundMoney2,
} from "@/lib/currency";

/**
 * Converts an account balance (in account native currency) to THB for **display / net-worth estimate** only.
 * Not the same as per-transaction snapshot baseAmount.
 */
export function approximateBalanceThb(
  balanceInAccountCurrency: number,
  accountCurrency: string,
): { thb: number; approximate: boolean } {
  const cur = normalizeCurrencyCode(accountCurrency);
  if (cur === BASE_CURRENCY) {
    return { thb: roundMoney2(balanceInAccountCurrency), approximate: false };
  }
  if (cur === "USD") {
    return {
      thb: roundMoney2(balanceInAccountCurrency * DEFAULT_THB_PER_USD),
      approximate: true,
    };
  }
  return {
    thb: roundMoney2(balanceInAccountCurrency * DEFAULT_THB_PER_USD),
    approximate: true,
  };
}

export function formatAmountWithOptionalThbParenthesis(input: {
  amount: unknown;
  currency: string | null | undefined;
  baseAmount: unknown;
  formatMoney: (n: number) => string;
}): string {
  const cur = normalizeCurrencyCode(input.currency ?? BASE_CURRENCY);
  const amt = decimalLikeToNumber(input.amount) ?? 0;
  const primary = `${input.formatMoney(amt)} ${cur}`;
  if (cur === BASE_CURRENCY) {
    return primary;
  }
  const base = decimalLikeToNumber(input.baseAmount);
  if (base == null) {
    return primary;
  }
  return `${primary} (${input.formatMoney(base)} ${BASE_CURRENCY})`;
}
