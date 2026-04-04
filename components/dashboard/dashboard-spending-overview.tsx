"use client";

import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { formatAmount, formatAmountCompact } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const WEEK_DAY_KEYS = [
  "dashboard.spendingOverview.dayMon",
  "dashboard.spendingOverview.dayTue",
  "dashboard.spendingOverview.dayWed",
  "dashboard.spendingOverview.dayThu",
  "dashboard.spendingOverview.dayFri",
  "dashboard.spendingOverview.daySat",
  "dashboard.spendingOverview.daySun",
] as const;

export function DashboardSpendingOverview() {
  const { t } = useI18n();
  const { spendingOverview, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="mt-3">
        <Card className="border-[#D4C9B0] dark:border-stone-700 py-0 shadow-sm">
          <CardContent className="space-y-2.5 p-3 sm:p-3.5">
            <div className="flex gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/40">
                <Wallet className="h-4 w-4 text-red-500 dark:text-red-400" />
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-[11px] font-medium leading-tight text-[#6B5E4E] dark:text-stone-400">
                    {t("dashboard.spendingOverview.todayTitle")}
                  </p>
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="min-w-0 space-y-0.5 text-right sm:text-left">
                  <p className="text-[11px] font-medium leading-tight text-[#6B5E4E] dark:text-stone-400">
                    {t("dashboard.spendingOverview.weekTitle")}
                  </p>
                  <Skeleton className="ml-auto h-5 w-24 sm:ml-0" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {WEEK_DAY_KEYS.map((key) => (
                <div
                  key={key}
                  className="flex flex-col items-center justify-center rounded-md border border-[#E8E0C8] bg-[#FDFAF4]/50 px-0.5 py-1 dark:border-stone-800 dark:bg-stone-900/40"
                >
                  <span className="text-[9px] font-medium leading-none text-[#6B5E4E] dark:text-stone-500">
                    {t(key)}
                  </span>
                  <Skeleton className="mt-1 h-2.5 w-6" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const todayExpense = spendingOverview?.todayExpense ?? 0;
  const weekTotal = spendingOverview?.weekTotalExpense ?? 0;
  const weekDays = spendingOverview?.weekDays ?? [];

  return (
    <div className="mt-3">
      <Card className="border-[#D4C9B0] dark:border-stone-700 py-0 shadow-sm">
        <CardContent className="space-y-2.5 p-3 sm:p-3.5">
          <div className="flex gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-red-50 dark:bg-red-950/40">
              <Wallet className="h-4 w-4 text-red-500 dark:text-red-400" />
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-medium leading-tight text-[#6B5E4E] dark:text-stone-400">
                  {t("dashboard.spendingOverview.todayTitle")}
                </p>
                <p className="text-base font-bold tabular-nums leading-tight text-[#3D3020] dark:text-stone-100 sm:text-[17px]">
                  ฿{formatAmount(todayExpense)}
                </p>
              </div>
              <div className="min-w-0 text-right sm:text-left">
                <p className="text-[11px] font-medium leading-tight text-[#6B5E4E] dark:text-stone-400">
                  {t("dashboard.spendingOverview.weekTitle")}
                </p>
                <p className="text-base font-bold tabular-nums leading-tight text-[#3D3020] dark:text-stone-100 sm:text-[17px]">
                  ฿{formatAmount(weekTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {WEEK_DAY_KEYS.map((key, index) => {
              const d = weekDays[index];
              const spent = d?.spent ?? 0;
              const isToday = d?.isToday ?? false;
              const dateLabel = d?.date ?? "";
              return (
                <div
                  key={key}
                  title={dateLabel || undefined}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-md border bg-[#FDFAF4]/50 px-0.5 py-1 dark:bg-stone-900/40",
                    isToday
                      ? "border-[#3D4A3A] dark:border-stone-100"
                      : "border-[#E8E0C8] dark:border-stone-800",
                  )}
                >
                  <span className="text-[9px] font-medium leading-none text-[#6B5E4E] dark:text-stone-500">
                    {t(key)}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[9px] font-semibold leading-none tabular-nums sm:text-[10px]",
                      spent > 0
                        ? "text-[#3D3020] dark:text-stone-200"
                        : "text-[#C4B8A8] dark:text-stone-600",
                    )}
                  >
                    {formatAmountCompact(spent)}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
