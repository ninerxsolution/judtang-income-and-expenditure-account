"use client";

import { Wallet, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import {
  budgetIndicatorBadgeClass,
  budgetIndicatorLabel,
  budgetIndicatorProgressBarClass,
  budgetIndicatorRemainingAmountClass,
} from "@/lib/budget-indicator-ui";
import type { BudgetResponse } from "@/components/dashboard/budget/types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  loadingBudget: boolean;
  budget: BudgetResponse | null;
  totalBudgetNum: number | null;
  totalSpent: number;
  selectedPeriodLabel: string;
  onEditTotalBudget: () => void;
};

export function BudgetTotalCard({
  t,
  loadingBudget,
  budget,
  totalBudgetNum,
  totalSpent,
  selectedPeriodLabel,
  onEditTotalBudget,
}: Props) {
  return (
    <section className="col-span-1 flex flex-col lg:col-span-4 xl:col-span-4">
      <div className="mb-4 flex min-h-[32px] h-full items-center justify-between">
        <h2 className="text-base font-semibold text-[#3D3020] dark:text-stone-100">
          {t("settings.budget.totalBudget")}
        </h2>
        <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
          {selectedPeriodLabel}
        </p>
      </div>

      <div className="flex flex-col rounded-xl border border-[#D4C9B0] bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-950">
        {loadingBudget ? (
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <Skeleton className="mb-2 h-4 w-24" />
                <Skeleton className="h-10 w-48" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex gap-6">
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {totalBudgetNum != null && totalBudgetNum > 0 ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#6B5E4E] dark:text-stone-400">
                      {t("settings.budget.remaining")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-2">
                      <span
                        className={`text-3xl font-bold tracking-tight ${budgetIndicatorRemainingAmountClass(
                          budget?.totalIndicator ?? "normal",
                        )}`}
                        title={`฿${formatAmount((budget?.totalBudget ?? 0) - (budget?.totalSpent ?? 0))}`}
                      >
                        ฿
                        {formatAmount(
                          (budget?.totalBudget ?? 0) - (budget?.totalSpent ?? 0),
                        )}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${budgetIndicatorBadgeClass(
                          budget?.totalIndicator ?? "normal",
                        )}`}
                      >
                        {budgetIndicatorLabel(
                          budget?.totalIndicator ?? "normal",
                          t,
                        )}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-2 h-8 w-8 text-[#A09080] hover:bg-[#F5F0E8] hover:text-[#3D3020] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    onClick={onEditTotalBudget}
                    aria-label={t("settings.budget.editTotalBudget")}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[#A09080] dark:text-stone-400">
                      {Math.round((budget?.totalProgress ?? 0) * 100)}%{" "}
                      {t("settings.budget.totalSpent").toLowerCase()}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F0E8] dark:bg-stone-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${budgetIndicatorProgressBarClass(
                        budget?.totalIndicator ?? "normal",
                      )}`}
                      style={{
                        width: `${Math.min(100, (budget?.totalProgress ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-8 gap-y-4 border-t border-[#F5F0E8] pt-4 dark:border-stone-800">
                  <div>
                    <p className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                      {t("settings.budget.totalSpent")}
                    </p>
                    <p
                      className="mt-1 text-base font-semibold text-[#3D3020] dark:text-stone-200"
                      title={`฿${formatAmount(totalSpent)}`}
                    >
                      ฿{formatAmount(totalSpent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                      {t("settings.budget.totalBudget")}
                    </p>
                    <p
                      className="mt-1 text-base font-semibold text-[#6B5E4E] dark:text-stone-300"
                      title={`฿${formatAmount(totalBudgetNum)}`}
                    >
                      ฿{formatAmount(totalBudgetNum)}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Wallet className="mb-3 h-10 w-10 text-[#D4C9B0] dark:text-stone-700" />
                <p className="mb-4 text-sm text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.budget.setBudget")}
                </p>
                <Button variant="outline" onClick={onEditTotalBudget}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("settings.budget.editTotalBudget")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
