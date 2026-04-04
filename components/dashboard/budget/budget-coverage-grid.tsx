"use client";

import type { Dispatch, SetStateAction } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { BudgetCoverageResponse } from "@/components/dashboard/budget/types";
import { BUDGET_PAGE_MONTHS } from "@/components/dashboard/budget/types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  loadingCoverage: boolean;
  initializedFromQuery: boolean;
  coverage: BudgetCoverageResponse | null;
  month: number;
  setMonth: Dispatch<SetStateAction<number>>;
  selectedPeriodLabel: string;
};

export function BudgetCoverageGrid({
  t,
  loadingCoverage,
  initializedFromQuery,
  coverage,
  month,
  setMonth,
  selectedPeriodLabel,
}: Props) {
  return (
    <section className="">
      {loadingCoverage || !initializedFromQuery ? (
        <div className="my-4 grid grid-cols-4 items-center justify-center gap-2 sm:grid-cols-6 lg:grid-cols-6 xl:grid-cols-12">
          {BUDGET_PAGE_MONTHS.map((coverageMonth) => (
            <Skeleton key={coverageMonth} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
            {t("settings.budget.viewingMonth", {
              period: selectedPeriodLabel,
            })}
          </p>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 xl:grid-cols-12">
            {(coverage?.months ?? []).map((coverageMonth) => {
              const isSelected = coverageMonth.month === month;

              return (
                <button
                  key={coverageMonth.month}
                  type="button"
                  onClick={() => setMonth(coverageMonth.month)}
                  className={cn(
                    "flex min-h-10 flex-col rounded-lg border p-3 text-left transition-colors",
                    coverageMonth.isConfigured
                      ? "border-[#D4C9B0] bg-[#F5F0E8] hover:bg-[#EFE6D7] dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800"
                      : "border-dashed border-[#D4C9B0] bg-white hover:bg-[#FAF5EC] dark:border-stone-700 dark:bg-stone-950/40 dark:hover:bg-stone-900/80",
                    isSelected &&
                      "border-solid border-[#6B5E4E] dark:border-stone-300",
                  )}
                >
                  <span className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {t(`summary.months.${coverageMonth.month - 1}`)}
                  </span>
                </button>
              );
            })}
          </div>

          {(coverage?.configuredMonthCount ?? 0) === 0 ? (
            <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
              {t("settings.budget.coverageEmptyYear")}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
