/**
 * Client-safe budget progress types and math (no Prisma / server-only imports).
 */

export type BudgetProgressIndicator = "normal" | "warning" | "critical" | "over";

/** Progress = spent / limit. PRD: <70% normal, 70–90% warning, >90% critical, >100% over. */
export function getBudgetIndicator(progress: number): BudgetProgressIndicator {
  if (progress >= 1) return "over";
  if (progress >= 0.9) return "critical";
  if (progress >= 0.7) return "warning";
  return "normal";
}
