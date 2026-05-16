"use client";

/**
 * Dashboard home: summary cards + calendar.
 * Protected by proxy — requires login. URL: /dashboard
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, ImagePlus, List, Settings, Wallet } from "lucide-react";
import { TransactionsCalendar } from "@/components/dashboard/transactions-calendar";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { useSlipUpload } from "@/components/dashboard/slip-upload-context";
import { RecurringDueWidget } from "@/components/dashboard/recurring-due-widget";
import { DashboardSummaryCard } from "@/components/dashboard/dashboard-summary-card";
import { DashboardSpendingOverview } from "@/components/dashboard/dashboard-spending-overview";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { useBalanceVisibility } from "@/components/dashboard/balance-visibility-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import type { BudgetProgressIndicator } from "@/lib/budget-shared";
import {
  budgetIndicatorMetaTextClass,
  budgetIndicatorProgressBarClass,
} from "@/lib/budget-indicator-ui";
import { useI18n } from "@/hooks/use-i18n";
export default function DashboardPage() {
  const { t } = useI18n();
  const {
    summary,
    recentTransactions,
    accountCount,
    loading: summaryLoading,
    refresh,
    invalidateTransactionViews,
  } = useDashboardData();
  const balance =
    summary?.totalBalance ?? (summary ? summary.income - summary.expense : 0);
  const { balanceVisible } = useBalanceVisibility();

  const [formOpen, setFormOpen] = useState(false);
  const [formInitialType, setFormInitialType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const { openSlipUpload } = useSlipUpload();
  const [budgetOverview, setBudgetOverview] = useState<{
    totalSpent: number;
    totalBudget: number | null;
    totalProgress: number;
    totalIndicator: BudgetProgressIndicator;
  } | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    fetch(`/api/budgets?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { totalSpent: number; totalBudget: number | null; totalProgress: number; totalIndicator: string } | null) => {
        if (data) {
          setBudgetOverview({
            totalSpent: data.totalSpent,
            totalBudget: data.totalBudget,
            totalProgress: data.totalProgress,
            totalIndicator: data.totalIndicator as BudgetProgressIndicator,
          });
        }
      })
      .catch(() => { })
      .finally(() => setBudgetLoading(false));
  }, []);

  function handleAfterTransactionChange() {
    refresh();
    invalidateTransactionViews();
  }

  return (
    <div className="space-y-6 pt-4 sm:pt-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left column: Balance + Quick Actions + Calendar */}
        <div className="space-y-6">
          <DashboardSummaryCard
            loading={summaryLoading}
            balanceVisible={balanceVisible}
            data={
              summary
                ? {
                    balance,
                    income: summary.income,
                    expense: summary.expense,
                    accountCount,
                    totalBalanceApproximate: summary.totalBalanceApproximate,
                  }
                : undefined
            }
          />

          {/* quick actions INCOME & EXPENSE & SLIP UPLOAD */}
          <div className="hidden md:flex xl:hidden gap-2 h-12">
            <button
              type="button"
              onClick={() => {
                setFormInitialType("INCOME");
                setFormOpen(true);
              }}
              className="inline-flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/80 bg-emerald-600/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:border-transparent dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              <ArrowDownCircle className="h-4 w-4 shrink-0" />
              <span>{t("transactions.common.income")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFormInitialType("EXPENSE");
                setFormOpen(true);
              }}
              className="inline-flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-red-600/80 bg-red-600/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:border-transparent dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <ArrowUpCircle className="h-4 w-4 shrink-0" />
              <span>{t("transactions.common.expense")}</span>
            </button>
            <button
              type="button"
              onClick={() => openSlipUpload({ onSuccess: handleAfterTransactionChange })}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border bg-[#FDFAF4] px-2 sm:px-3 py-2 sm:py-1.5 text-[#6B5E4E] transition-colors hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-300 dark:hover:bg-stone-800"
              aria-label={t("dashboard.slipUpload.title")}
            >
              <ImagePlus className="h-4.5 w-4.5 shrink-0" aria-hidden />
            </button>
          </div>

          <DashboardSpendingOverview />

          <div className="mt-4">
            <RecurringDueWidget />
          </div>

          {/* Budget overview card — current month */}
          <div className="mt-4">
            {budgetLoading ? (
              <Card className="border-[#D4C9B0] dark:border-stone-700 gap-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#5C6B52] dark:text-stone-400" />
                    {t("settings.budget.title")} ({t("dashboard.summary.title")})
                  </CardTitle>
                  <Skeleton className="h-3 w-16" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </CardContent>
              </Card>
            ) : budgetOverview?.totalBudget != null && budgetOverview.totalBudget > 0 ? (
              <Card className="border-[#D4C9B0] dark:border-stone-700 gap-2">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#5C6B52] dark:text-stone-400" />
                    {t("settings.budget.title")} ({t("dashboard.summary.title")})
                  </CardTitle>
                  <Link
                    href={`/dashboard/settings/budget?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#5C6B52] hover:underline dark:text-stone-400 dark:hover:text-stone-300"
                  >
                    <Settings className="h-3 w-3" />
                    {t("settings.budget.open")}
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-lg font-semibold tabular-nums">
                    {balanceVisible ? (
                      <>
                        ฿ {formatAmount(budgetOverview.totalSpent)} / ฿ {formatAmount(budgetOverview.totalBudget)}
                        <span
                          className={`ml-2 text-sm font-normal ${budgetIndicatorMetaTextClass(budgetOverview.totalIndicator)}`}
                        >
                          ({Math.round(budgetOverview.totalProgress * 100)}%)
                        </span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true">฿ •••• / ฿ ••••</span>
                        <span className="sr-only">{t("dashboard.balance.hidden")}</span>
                      </>
                    )}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8E0D0] dark:bg-stone-700">
                    <div
                      className={`h-full ${budgetIndicatorProgressBarClass(budgetOverview.totalIndicator)}`}
                      style={{ width: `${Math.min(100, budgetOverview.totalProgress * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[#D4C9B0] dark:border-stone-700">
                <CardContent className="">
                  <p className="text-sm text-[#6B5E4E] dark:text-stone-400 mb-2">
                    {t("settings.budget.description")}
                  </p>
                  <Link
                    href={`/dashboard/settings/budget?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`}
                  >
                    <Button variant="outline" size="sm">
                      <Wallet className="h-4 w-4 mr-1" />
                      {t("settings.budget.setBudget")}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>

        </div>

        {/* Right column: Transactions Calendar */}
        <div className="space-y-6">
          {/* quick actions INCOME & EXPENSE & SLIP UPLOAD */}
          <div className="hidden xl:flex flex-col sm:flex-row gap-2 h-12">
            <button
              type="button"
              onClick={() => {
                setFormInitialType("INCOME");
                setFormOpen(true);
              }}
              className="inline-flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-emerald-600/80 bg-emerald-600/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:border-transparent dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
            >
              <ArrowDownCircle className="h-4 w-4 shrink-0" />
              <span>{t("transactions.common.income")}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setFormInitialType("EXPENSE");
                setFormOpen(true);
              }}
              className="inline-flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-red-600/80 bg-red-600/80 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:border-transparent dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
            >
              <ArrowUpCircle className="h-4 w-4 shrink-0" />
              <span>{t("transactions.common.expense")}</span>
            </button>
            <button
              type="button"
              onClick={() => openSlipUpload({ onSuccess: handleAfterTransactionChange })}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border bg-[#FDFAF4] px-2 sm:px-3 py-2 sm:py-1.5 text-[#6B5E4E] transition-colors hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-300 dark:hover:bg-stone-800"
              aria-label={t("dashboard.slipUpload.title")}
            >
              <ImagePlus className="h-4.5 w-4.5 shrink-0" aria-hidden />
            </button>
          </div>

          <TransactionsCalendar showNewTransactionButton={false} showQuickActions={false} />

          {summaryLoading ? (
            <div className="rounded-xl border border-[#D4C9B0] bg-[#FDFAF4] p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-sm font-medium text-[#3D3020] dark:text-stone-300">
                  <List className="h-4 w-4" />
                  {t("dashboard.recentTransactions")}
                </h2>
                <Link
                  href="/dashboard/transactions"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#6B5E4E] hover:text-[#3D3020] dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {t("transactions.new.viewAll")}
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
              <div className="space-y-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-md border border-[#E8E0C8] px-3 py-2 dark:border-stone-800">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-6 w-14 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <TransactionsList initialData={recentTransactions} />
          )}
        </div>
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialType={formInitialType}
        onSuccess={handleAfterTransactionChange}
      />
    </div>
  );
}
