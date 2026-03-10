"use client";

/**
 * Dashboard home: summary cards + calendar.
 * Protected by proxy — requires login. URL: /dashboard
 */
import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, List, Wallet } from "lucide-react";
import { TransactionsCalendar } from "@/components/dashboard/transactions-calendar";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { RecurringDueWidget } from "@/components/dashboard/recurring-due-widget";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";

export default function DashboardPage() {
  const { t } = useI18n();
  const { summary, recentTransactions, accountCount, loading: summaryLoading, refresh } = useDashboardData();
  const balance =
    summary?.totalBalance ?? (summary ? summary.income - summary.expense : 0);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitialType, _setFormInitialType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [budgetOverview, setBudgetOverview] = useState<{
    totalSpent: number;
    totalBudget: number | null;
    totalProgress: number;
    totalIndicator: "normal" | "warning" | "critical" | "over";
  } | null>(null);
  const [budgetLoading, setBudgetLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    fetch(`/api/budgets?year=${now.getFullYear()}&month=${now.getMonth() + 1}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { totalSpent: number; totalBudget: number | null; totalProgress: number; totalIndicator: string } | null) => {
        if (data) setBudgetOverview({ totalSpent: data.totalSpent, totalBudget: data.totalBudget, totalProgress: data.totalProgress, totalIndicator: data.totalIndicator as "normal" | "warning" | "critical" | "over" });
      })
      .catch(() => { })
      .finally(() => setBudgetLoading(false));
  }, []);

  function handleFormSuccess() {
    refresh();
  }

  return (
    <div className="space-y-6 pt-4 sm:pt-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left column: Balance + Quick Actions + Calendar */}
        <div className="space-y-6">
          {summaryLoading ? (
            <>
              {/* Balance card skeleton */}
              <Card className="relative overflow-hidden space-y-0 gap-1 bg-[#4A5E40] dark:bg-[#3D4F33] border-0 text-white">
                <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10" />
                <div className="absolute right-8 top-4 h-16 w-16 rounded-full bg-white/5" />
                <CardHeader className="relative pb-1">
                  <CardTitle className="text-sm font-medium justify-between flex items-center text-white/90">
                    {t("dashboard.summary.balance")}
                    <Skeleton className="h-3 w-24 bg-white/10" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <Skeleton className="h-10 w-40 bg-white/20 rounded-md" />
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Balance card - dark olive green, prominent */}
              <Card className="relative overflow-hidden space-y-0 gap-1 bg-[#4A5E40] dark:bg-[#3D4F33] border-0 text-white">
                <div className="absolute right-0 top-0 h-24 w-24 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10" />
                <div className="absolute right-8 top-4 h-16 w-16 rounded-full bg-white/5" />
                <CardHeader className="relative pb-1">
                  <CardTitle className="text-sm font-medium justify-between flex items-center text-white/90">
                    {t("dashboard.summary.balance")}
                    <Link href="/dashboard/accounts" className="text-xs text-white/50 hover:text-white transition-all hover:underline">
                      {t("dashboard.summary.fromAllAccounts", { count: accountCount })}
                    </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative">
                  <p
                    className={`text-3xl sm:text-4xl font-bold tabular-nums ${balance >= 0 ? "text-white" : "text-red-200"
                      }`}
                  >
                    ฿ {summary ? formatAmount(balance) : "0.00"}
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          <div className="mt-4">
            <RecurringDueWidget />
          </div>

          {/* Budget overview card — current month */}
          <div className="mt-4">
            {budgetLoading ? (
              <Card className="border-[#D4C9B0] dark:border-stone-700">
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
              <Card className="border-[#D4C9B0] dark:border-stone-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-[#5C6B52] dark:text-stone-400" />
                    {t("settings.budget.title")} ({t("dashboard.summary.title")})
                  </CardTitle>
                  <Link
                    href={`/dashboard/settings/budget?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`}
                    className="text-xs font-medium text-[#5C6B52] hover:underline dark:text-stone-400 dark:hover:text-stone-300"
                  >
                    {t("settings.budget.open")}
                  </Link>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-lg font-semibold tabular-nums">
                    ฿ {formatAmount(budgetOverview.totalSpent)} / ฿ {formatAmount(budgetOverview.totalBudget)}
                    <span
                      className={`ml-2 text-sm font-normal ${budgetOverview.totalIndicator === "over"
                        ? "text-red-600 dark:text-red-400"
                        : budgetOverview.totalIndicator === "critical"
                          ? "text-orange-600 dark:text-orange-400"
                          : budgetOverview.totalIndicator === "warning"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-[#6B5E4E] dark:text-stone-400"
                        }`}
                    >
                      ({Math.round(budgetOverview.totalProgress * 100)}%)
                    </span>
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8E0D0] dark:bg-stone-700">
                    <div
                      className={`h-full ${budgetOverview.totalIndicator === "over"
                        ? "bg-red-500"
                        : budgetOverview.totalIndicator === "critical"
                          ? "bg-orange-500"
                          : budgetOverview.totalIndicator === "warning"
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                      style={{ width: `${Math.min(100, budgetOverview.totalProgress * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-[#D4C9B0] dark:border-stone-700">
                <CardContent className="pt-4">
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

          {/* Recent account activity */}
          {/* <div className="space-y-2">
            <p className="text-sm font-medium text-[#5C6B52] dark:text-stone-300">
              {t("dashboard.summary.recentAccountActivity")}
            </p>
            <div className="flex flex-wrap gap-2">
              {summaryLoading ? (
                <>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-28 rounded-lg" />
                  ))}
                </>
              ) : accountItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  {t("dashboard.summary.recentAccountActivityEmpty")}
                </p>
              ) : (
                accountItems.map(({ account, txType }, i) => (
                  <Link
                    key={`${account.id}-${i}`}
                    href={`/dashboard/accounts/${account.id}`}
                    className="flex items-center gap-2 rounded-lg border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 text-sm font-medium text-[#3D3020] transition-colors hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <AccountIcon account={account} size="sm" />
                    <div className="flex flex-col items-start min-w-0">
                      <span className="truncate max-w-full">{account.name}</span>
                      <div className="flex items-center gap-1.5 text-xs">
                        {account.accountNumberMasked && (
                          <>
                            <span className="text-muted-foreground">{account.accountNumberMasked}</span>
                            <span aria-hidden className="text-muted-foreground">·</span>
                          </>
                        )}
                        <span
                          className={
                            txType === "INCOME"
                              ? "font-medium text-emerald-600 dark:text-emerald-400"
                              : txType === "EXPENSE"
                                ? "font-medium text-red-600 dark:text-red-400"
                                : "font-medium text-amber-600 dark:text-amber-400"
                          }
                        >
                          {txType === "INCOME" && t("transactions.common.income")}
                          {txType === "EXPENSE" && t("transactions.common.expense")}
                          {txType === "TRANSFER" && t("transactions.common.transfer")}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div> */}

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

        {/* Right column: Income + Expense + Transactions list */}
        <div className="space-y-6">
          <div>
            {/* <h2 className="mb-3 text-sm font-medium text-[#3D3020] dark:text-stone-300">
              {t("dashboard.summary.title")}
            </h2> */}
            {summaryLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Income card skeleton */}
                <Card className="relative overflow-hidden space-y-0 gap-1 border-[#D4C9B0] bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <div className="absolute right-0 top-0 h-20 w-20 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-200/30 dark:bg-emerald-800/20" />
                  <CardHeader className="flex flex-row items-center gap-2 pb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200/60 dark:bg-emerald-800/40">
                      <ArrowDownCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      {t("dashboard.summary.income")} {t("dashboard.summary.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-24" />
                  </CardContent>
                </Card>

                {/* Expense card skeleton */}
                <Card className="relative overflow-hidden space-y-0 gap-1 border-[#D4C9B0] bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30">
                  <div className="absolute right-0 top-0 h-20 w-20 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-200/30 dark:bg-red-800/20" />
                  <CardHeader className="flex flex-row items-center gap-2 pb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200/60 dark:bg-red-800/40">
                      <ArrowUpCircle className="h-4 w-4 text-red-700 dark:text-red-300" />
                    </div>
                    <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">
                      {t("dashboard.summary.expense")} {t("dashboard.summary.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-7 w-24" />
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Income card - light green */}
                <Card className="relative overflow-hidden space-y-0 gap-1 border-[#D4C9B0] bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/30">
                  <div className="absolute right-0 top-0 h-20 w-20 -translate-y-1/2 translate-x-1/2 rounded-full bg-emerald-200/30 dark:bg-emerald-800/20" />
                  <CardHeader className="flex flex-row items-center gap-2 pb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-200/60 dark:bg-emerald-800/40">
                      <ArrowDownCircle className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      {t("dashboard.summary.income")} {t("dashboard.summary.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                      {summary ? formatAmount(summary.income) : "0.00"}
                    </p>
                  </CardContent>
                </Card>

                {/* Expense card - light brown/pink */}
                <Card className="relative overflow-hidden space-y-0 gap-1 border-[#D4C9B0] bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/30">
                  <div className="absolute right-0 top-0 h-20 w-20 -translate-y-1/2 translate-x-1/2 rounded-full bg-red-200/30 dark:bg-red-800/20" />
                  <CardHeader className="flex flex-row items-center gap-2 pb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-200/60 dark:bg-red-800/40">
                      <ArrowUpCircle className="h-4 w-4 text-red-700 dark:text-red-300" />
                    </div>
                    <CardTitle className="text-sm font-medium text-red-800 dark:text-red-200">
                      {t("dashboard.summary.expense")} {t("dashboard.summary.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold tabular-nums text-red-800 dark:text-red-200">
                      {summary ? formatAmount(summary.expense) : "0.00"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <TransactionsCalendar showNewTransactionButton={false} showQuickActions={true} />
        </div>
      </div>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialType={formInitialType}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
