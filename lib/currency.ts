/**
 * Multi-currency: base is always THB. exchangeRate = THB per 1 unit of transaction.currency.
 */
export const BASE_CURRENCY = "THB" as const;

/** Fallback THB per 1 USD when FX API unavailable (product default). */
export const DEFAULT_THB_PER_USD = 32;

const ISO4217_LEN = 3;

export type SupportedCurrency = typeof BASE_CURRENCY | "USD";

export function normalizeCurrencyCode(raw: string | null | undefined): string {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (s.length !== ISO4217_LEN) {
    return BASE_CURRENCY;
  }
  return s;
}

export function isBaseCurrency(currency: string): boolean {
  return normalizeCurrencyCode(currency) === BASE_CURRENCY;
}

/** Symbol shown in amount inputs (leading adornment). */
export function getCurrencyInputSymbol(currency: string | null | undefined): string {
  const c = normalizeCurrencyCode(currency);
  if (c === BASE_CURRENCY) return "฿";
  if (c === "USD") return "$";
  return c;
}

export function decimalLikeToNumber(
  v: unknown,
): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && "toNumber" in v && typeof (v as { toNumber: () => number }).toNumber === "function") {
    const n = (v as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * THB equivalent for one transaction row (for budgets / cross-currency summaries).
 * When baseAmount is null (pre-migration), uses amount if currency is THB; otherwise null (caller may approximate).
 */
export function getEffectiveBaseAmountThb(input: {
  amount: unknown;
  currency: string | null | undefined;
  baseAmount: unknown;
  exchangeRate?: unknown;
}): number | null {
  const base = decimalLikeToNumber(input.baseAmount);
  if (base != null) {
    return base;
  }
  const cur = normalizeCurrencyCode(input.currency ?? BASE_CURRENCY);
  const amt = decimalLikeToNumber(input.amount);
  if (amt == null) return null;
  if (cur === BASE_CURRENCY) {
    return amt;
  }
  const rate = decimalLikeToNumber(input.exchangeRate);
  if (rate != null && rate > 0) {
    return roundMoney2(amt * rate);
  }
  return null;
}

/** Round to 2 decimal places (THB / display money). */
export function roundMoney2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Store FX as THB per 1 foreign unit (aligns with DB Decimal(18,8)). */
export function roundRate8(n: number): number {
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("rate must be a positive finite number");
  }
  return Math.round(n * 1e8) / 1e8;
}

/** Rough sanity bounds for THB per 1 USD (reject obvious typos when deriving from amounts). */
const USD_THB_RATE_MIN = 15;
const USD_THB_RATE_MAX = 120;

function assertUsdThbRateSensible(thbPerUsd: number, context: string): void {
  if (thbPerUsd < USD_THB_RATE_MIN || thbPerUsd > USD_THB_RATE_MAX) {
    throw new Error(
      `${context} (${thbPerUsd.toFixed(4)} THB/USD) looks unrealistic; check amounts or enter the bank exchange rate.`,
    );
  }
}

export type CrossCurrencyResolved = {
  fromAmount: number;
  toAmount: number;
  thbPerUnitSource: number;
  thbPerUnitDestination: number;
  baseOut: number;
  baseIn: number;
};

/**
 * Resolve cross-currency transfer legs so base THB nets to zero.
 * - One leg is always THB (product constraint).
 * - Without bank rate: use both amounts as truth; derive THB/foreign rate on the foreign leg.
 * - With bank rate (THB per 1 foreign): derive the THB leg from foreign amount × rate.
 */
export function resolveCrossCurrencyTransferLegs(input: {
  fromCurrency: string;
  toCurrency: string;
  fromAmount: number;
  toAmount: number;
  bankRateThbPerForeignUnit?: number | null;
}): CrossCurrencyResolved {
  const cFrom = normalizeCurrencyCode(input.fromCurrency);
  const cTo = normalizeCurrencyCode(input.toCurrency);
  const fromIsThb = isBaseCurrency(cFrom);
  const toIsThb = isBaseCurrency(cTo);
  if (fromIsThb === toIsThb) {
    throw new Error("Cross-currency transfer requires one THB account and one non-THB account");
  }

  const bankRate =
    input.bankRateThbPerForeignUnit != null &&
    Number.isFinite(input.bankRateThbPerForeignUnit) &&
    input.bankRateThbPerForeignUnit > 0
      ? input.bankRateThbPerForeignUnit
      : null;

  if (bankRate != null && (cFrom === "USD" || cTo === "USD")) {
    assertUsdThbRateSensible(bankRate, "Bank THB/USD rate");
  }

  if (fromIsThb && !toIsThb) {
    const toForeign = input.toAmount;
    if (!Number.isFinite(toForeign) || toForeign <= 0) {
      throw new Error("toAmount must be a positive number");
    }
    let fromThb: number;
    if (bankRate != null) {
      fromThb = roundMoney2(toForeign * bankRate);
    } else {
      fromThb = roundMoney2(input.fromAmount);
      if (!Number.isFinite(fromThb) || fromThb <= 0) {
        throw new Error("fromAmount must be a positive number");
      }
    }
    const baseOut = -fromThb;
    const baseIn = -baseOut;
    const thbPerDest = roundRate8(baseIn / toForeign);
    if (cTo === "USD") {
      assertUsdThbRateSensible(thbPerDest, "Derived THB/USD rate");
    }
    return {
      fromAmount: fromThb,
      toAmount: toForeign,
      thbPerUnitSource: 1,
      thbPerUnitDestination: thbPerDest,
      baseOut,
      baseIn,
    };
  }

  const fromForeign = input.fromAmount;
  if (!Number.isFinite(fromForeign) || fromForeign <= 0) {
    throw new Error("fromAmount must be a positive number");
  }
  let toThb: number;
  if (bankRate != null) {
    toThb = roundMoney2(fromForeign * bankRate);
  } else {
    toThb = roundMoney2(input.toAmount);
    if (!Number.isFinite(toThb) || toThb <= 0) {
      throw new Error("toAmount must be a positive number");
    }
  }
  const baseIn = toThb;
  const baseOut = -baseIn;
  const thbPerSource = roundRate8(-baseOut / fromForeign);
  if (cFrom === "USD") {
    assertUsdThbRateSensible(thbPerSource, "Derived THB/USD rate");
  }
  return {
    fromAmount: fromForeign,
    toAmount: toThb,
    thbPerUnitSource: thbPerSource,
    thbPerUnitDestination: 1,
    baseOut,
    baseIn,
  };
}

/**
 * Compute baseAmount in THB from leg amount and THB-per-unit rate.
 */
export function computeBaseAmountThb(
  amountPositive: number,
  currency: string,
  exchangeRateThbPerUnit: number,
): number {
  const cur = normalizeCurrencyCode(currency);
  const amt = amountPositive;
  if (!Number.isFinite(amt) || amt < 0) {
    throw new Error("amount must be a non-negative finite number");
  }
  if (cur === BASE_CURRENCY) {
    return roundMoney2(amt);
  }
  if (!Number.isFinite(exchangeRateThbPerUnit) || exchangeRateThbPerUnit <= 0) {
    throw new Error("exchangeRate must be positive when currency is not THB");
  }
  return roundMoney2(amt * exchangeRateThbPerUnit);
}

export function defaultExchangeRateThbPerUnit(currency: string): number {
  const cur = normalizeCurrencyCode(currency);
  if (cur === BASE_CURRENCY) return 1;
  if (cur === "USD") return DEFAULT_THB_PER_USD;
  return DEFAULT_THB_PER_USD;
}

const SUM_BASE_EPS = 0.02;

/** After rounding, paired TRANSFER legs should sum to ~0 in THB. */
export function assertTransferPairBaseBalanced(baseOut: number, baseIn: number): void {
  const sum = baseOut + baseIn;
  if (Math.abs(sum) > SUM_BASE_EPS) {
    throw new Error(
      `Cross-currency transfer base amounts must net to zero in THB (got ${sum.toFixed(4)})`,
    );
  }
}
