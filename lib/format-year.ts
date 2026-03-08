/** Buddhist Era = Gregorian + 543 */
const BUDDHIST_OFFSET = 543;

/**
 * Format year for display: Thai = พ.ศ. (Buddhist Era), English = ค.ศ. (Gregorian).
 * API and internal logic always use Gregorian — use this only for UI display.
 */
export function formatYearForDisplay(year: number, language: string): string {
  if (language === "th") {
    return String(year + BUDDHIST_OFFSET);
  }
  return String(year);
}
