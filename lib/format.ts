/**
 * Format amount for display with thousand separators (e.g. 1,000,000.00).
 * Accepts number, string (from Prisma Decimal), or object with toNumber().
 */
export function formatAmount(value: number | string | { toNumber?: () => number }): string {
  const num =
    typeof value === "number"
      ? value
      : typeof value === "object" && value != null && "toNumber" in value
        ? (value as { toNumber: () => number }).toNumber()
        : Number(value);
  if (!Number.isFinite(num)) return "-";
  const fixed = num.toFixed(2);
  const [intPart, decPart] = fixed.split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return decPart !== undefined ? `${withCommas}.${decPart}` : withCommas;
}
