/**
 * Grace period days for account deactivation. Safe to use on client (no Prisma).
 * Server uses ACCOUNT_GRACE_PERIOD_DAYS env; client falls back to 30.
 */
export function getGracePeriodDays(): number {
  if (typeof process !== "undefined" && process.env?.ACCOUNT_GRACE_PERIOD_DAYS != null) {
    const n = Number(process.env.ACCOUNT_GRACE_PERIOD_DAYS);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 30;
}
