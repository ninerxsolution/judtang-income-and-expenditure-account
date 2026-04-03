/**
 * Parse user-facing amount strings (may include thousands separators).
 */
export function parseAmountInput(value: string): number {
  const raw = value.replace(/,/g, "").trim();
  if (raw === "") return NaN;
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) ? n : NaN;
}
