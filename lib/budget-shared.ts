/**
 * Client-safe budget progress types and math (no Prisma / server-only imports).
 */

export type BudgetProgressIndicator =
  | "normal"
  | "warning"
  | "critical"
  | "full"
  | "over";

/**
 * Progress = spent / limit.
 * &lt;70% normal, 70–90% warning, 90%–&lt;100% critical, exactly 100% full, &gt;100% over.
 */
export function getBudgetIndicator(progress: number): BudgetProgressIndicator {
  if (progress > 1) return "over";
  if (progress >= 1) return "full";
  if (progress >= 0.9) return "critical";
  if (progress >= 0.7) return "warning";
  return "normal";
}
