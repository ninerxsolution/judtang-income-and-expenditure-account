import { DEFAULT_THB_PER_USD } from "@/lib/currency";

export type FxRateResult = {
  thbPerUnit: number;
  /** True when value came from network API; false when using hardcoded fallback. */
  fromApi: boolean;
};

/**
 * Suggested THB per 1 unit of `currency` (USD only supported for API path; others fall back).
 */
export async function fetchSuggestedThbPerUnit(currency: string): Promise<FxRateResult> {
  const c = currency.trim().toUpperCase();
  if (c === "THB") {
    return { thbPerUnit: 1, fromApi: true };
  }
  if (c !== "USD") {
    return { thbPerUnit: DEFAULT_THB_PER_USD, fromApi: false };
  }

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return { thbPerUnit: DEFAULT_THB_PER_USD, fromApi: false };
    }
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    const thb = data.rates?.THB;
    if (typeof thb !== "number" || !Number.isFinite(thb) || thb <= 0) {
      return { thbPerUnit: DEFAULT_THB_PER_USD, fromApi: false };
    }
    return { thbPerUnit: thb, fromApi: true };
  } catch {
    return { thbPerUnit: DEFAULT_THB_PER_USD, fromApi: false };
  }
}
