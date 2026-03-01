/**
 * Mask account or card number for display (show only last 4 digits).
 * Returns "****1234" or empty string if input is too short.
 */
export function maskAccountNumber(value: string | null | undefined): string {
  if (!value || typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "";
  return `****${digits.slice(-4)}`;
}

/** Format card number for display: "1234567890123456" -> "1234 5678 9012 3456" */
export function formatCardNumber(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = String(digits).replace(/\D/g, "");
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

/** Format bank account for display: "1234567890" -> "123-4-56789-0" (Thai format 3-1-5-1) */
export function formatBankAccountNumber(digits: string | null | undefined): string {
  if (!digits) return "";
  const d = String(digits).replace(/\D/g, "");
  if (d.length <= 3) return d;
  if (d.length <= 4) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}-${d.slice(3, 4)}-${d.slice(4)}`;
  const base = `${d.slice(0, 3)}-${d.slice(3, 4)}-${d.slice(4, 9)}-${d.slice(9, 10)}`;
  if (d.length <= 10) return base;
  return `${base}-${d.slice(10)}`;
}

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
