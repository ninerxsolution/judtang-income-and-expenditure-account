/**
 * Date range utilities for timezone-aware queries.
 * Uses Intl + manual calculation (no extra packages).
 */

/**
 * Get the offset in milliseconds for a timezone at a given date.
 * offset = local_time - utc_time (positive when timezone is ahead of UTC).
 */
function getTimezoneOffsetMs(date: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    second: "numeric",
  });
  const parts = fmt.formatToParts(date);
  const tzHour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const tzMinute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  const tzSecond = parseInt(parts.find((p) => p.type === "second")?.value ?? "0", 10);

  const localMs = tzHour * 3600000 + tzMinute * 60000 + tzSecond * 1000;
  const utcMs =
    date.getUTCHours() * 3600000 +
    date.getUTCMinutes() * 60000 +
    date.getUTCSeconds() * 1000;

  return localMs - utcMs;
}

/**
 * Parse YYYY-MM-DD as a date in the given timezone and return
 * [startOfDay, endOfDay] as Date objects (UTC timestamps for DB query).
 */
export function getDateRangeInTimezone(
  dateStr: string,
  timezone: string = "Asia/Bangkok",
): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return null;

  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;

  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  const offsetMs = getTimezoneOffsetMs(utcNoon, timezone);

  const utcMidnight = Date.UTC(y, m - 1, d, 0, 0, 0, 0);
  const fromMs = utcMidnight - offsetMs;
  const toMs = fromMs + 24 * 3600000 - 1;

  return {
    from: new Date(fromMs),
    to: new Date(toMs),
  };
}

/**
 * Parse occurredAt from API body. If the value is date-only (YYYY-MM-DD),
 * merge with current UTC time so the transaction time reflects "now" instead
 * of midnight UTC (which displays as 07:00 in Bangkok).
 */
export function parseOccurredAt(value: string | undefined): Date {
  const now = new Date();
  if (!value || typeof value !== "string" || value.trim() === "") {
    return now;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const d = new Date(trimmed + "T00:00:00.000Z");
    if (Number.isNaN(d.getTime())) return now;
    d.setUTCHours(
      now.getUTCHours(),
      now.getUTCMinutes(),
      now.getUTCSeconds(),
      now.getUTCMilliseconds(),
    );
    return d;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? now : parsed;
}

/**
 * Convert a Date (UTC) to YYYY-MM-DD string in the given timezone.
 * Used for grouping transactions by local date.
 */
export function toDateStringInTimezone(d: Date, timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  const day = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}
