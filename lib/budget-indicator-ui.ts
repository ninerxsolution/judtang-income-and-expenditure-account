/**
 * Tailwind class helpers for budget progress indicators (client-safe).
 */
import type { BudgetProgressIndicator } from "@/lib/budget-shared";

function normalizeIndicator(indicator: string): BudgetProgressIndicator {
  if (
    indicator === "over" ||
    indicator === "critical" ||
    indicator === "warning" ||
    indicator === "normal"
  ) {
    return indicator;
  }
  return "normal";
}

/** Progress bar fill (used on settings/budget and dashboard budget card). */
export function budgetIndicatorProgressBarClass(indicator: string): string {
  switch (normalizeIndicator(indicator)) {
    case "over":
      return "bg-red-500 dark:bg-red-600";
    case "critical":
      return "bg-orange-500 dark:bg-orange-600";
    case "warning":
      return "bg-amber-500 dark:bg-amber-600";
    default:
      return "bg-emerald-500 dark:bg-emerald-600";
  }
}

/** Pill badge on total remaining (settings/budget). */
export function budgetIndicatorBadgeClass(indicator: string): string {
  switch (normalizeIndicator(indicator)) {
    case "over":
      return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400";
    case "critical":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400";
    case "warning":
      return "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400";
    default:
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400";
  }
}

/** Large remaining amount: over budget gets destructive emphasis. */
export function budgetIndicatorRemainingAmountClass(indicator: string): string {
  return normalizeIndicator(indicator) === "over"
    ? "text-red-600 dark:text-red-400"
    : "text-[#3D3020] dark:text-stone-100";
}

/** Dashboard: inline percentage / meta text next to amounts. */
export function budgetIndicatorMetaTextClass(indicator: string): string {
  switch (normalizeIndicator(indicator)) {
    case "over":
      return "text-red-600 dark:text-red-400";
    case "critical":
      return "text-orange-600 dark:text-orange-400";
    case "warning":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-[#6B5E4E] dark:text-stone-400";
  }
}

/** Category budget card: footer label (spent vs remaining line). */
export function budgetIndicatorCategoryRowLabelClass(indicator: string): string {
  const base = "font-medium ";
  return (
    base +
    (normalizeIndicator(indicator) === "over"
      ? "text-red-600 dark:text-red-400"
      : "text-[#6B5E4E] dark:text-stone-400")
  );
}

type TranslateFn = (key: string) => string;

export function budgetIndicatorLabel(
  indicator: string,
  t: TranslateFn,
): string {
  switch (normalizeIndicator(indicator)) {
    case "over":
      return t("settings.budget.overBudget");
    case "critical":
      return t("settings.budget.critical");
    case "warning":
      return t("settings.budget.warning");
    default:
      return t("settings.budget.normal");
  }
}
