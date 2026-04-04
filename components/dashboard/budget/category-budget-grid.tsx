"use client";

import { Wallet, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import {
  budgetIndicatorCategoryRowLabelClass,
  budgetIndicatorProgressBarClass,
} from "@/lib/budget-indicator-ui";
import type { BudgetResponse } from "@/components/dashboard/budget/types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  loadingBudget: boolean;
  budget: BudgetResponse | null;
  onAddClick: () => void;
  onEditCategory: (id: string, limitAmount: number) => void;
  onDeleteCategory: (id: string) => void;
};

export function CategoryBudgetGrid({
  t,
  loadingBudget,
  budget,
  onAddClick,
  onEditCategory,
  onDeleteCategory,
}: Props) {
  return (
    <section className="col-span-1 flex flex-col lg:col-span-8 xl:col-span-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#3D3020] dark:text-stone-100">
            {t("settings.budget.categoryLimit")}
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="bg-white hover:bg-[#F5F0E8] dark:bg-stone-950 dark:hover:bg-stone-900"
          onClick={onAddClick}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("settings.budget.addCategoryBudget")}
        </Button>
      </div>

      {loadingBudget ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (budget?.categoryBudgets?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#D4C9B0] bg-[#FAF5EC]/50 p-10 text-center dark:border-stone-800 dark:bg-stone-900/20">
          <Wallet className="mb-3 h-10 w-10 text-[#D4C9B0] dark:text-stone-700" />
          <p className="mb-4 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("settings.budget.noCategoryBudgets")}
          </p>
          <Button variant="outline" size="sm" onClick={onAddClick}>
            <Plus className="mr-2 h-4 w-4" />
            {t("settings.budget.addCategoryBudget")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(budget?.categoryBudgets ?? []).map((cb) => (
            <div
              key={cb.id}
              className="group relative flex flex-col justify-between rounded-xl border border-[#F5F0E8] bg-white p-5 shadow-xs transition-shadow hover:shadow-sm dark:border-stone-800 dark:bg-stone-950"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-[#3D3020] dark:text-stone-200">
                    {cb.categoryName ?? t("settings.budget.categoryLimit")}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-lg font-semibold text-[#3D3020] dark:text-stone-100">
                      ฿{formatAmount(cb.spent)}
                    </span>
                    <span className="text-xs text-[#A09080] dark:text-stone-400">
                      / ฿{formatAmount(cb.limitAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:opacity-100 lg:opacity-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#A09080] hover:bg-[#F5F0E8] hover:text-[#3D3020] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
                    onClick={() =>
                      onEditCategory(cb.id, cb.limitAmount)
                    }
                    aria-label={t("settings.budget.editCategoryBudget")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-[#A09080] hover:bg-red-50 hover:text-red-600 dark:text-stone-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    onClick={() => onDeleteCategory(cb.id)}
                    aria-label={t("settings.budget.deleteCategoryBudget")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-end justify-between text-xs">
                  <span className={budgetIndicatorCategoryRowLabelClass(cb.indicator)}>
                    {cb.indicator === "over"
                      ? t("settings.budget.overBudget")
                      : `${t("settings.budget.remaining")} ฿${formatAmount(cb.limitAmount - cb.spent)}`}
                  </span>
                  <span className="font-semibold text-[#A09080] dark:text-stone-500">
                    {Math.round(cb.progress * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F5F0E8] dark:bg-stone-800">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${budgetIndicatorProgressBarClass(cb.indicator)}`}
                    style={{
                      width: `${Math.min(100, cb.progress * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
