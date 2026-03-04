"use client";

/**
 * Dashboard home: summary cards + calendar.
 * Protected by proxy — requires login. URL: /dashboard
 */
import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Plus, Minus } from "lucide-react";
import { TransactionsCalendar } from "@/components/dashboard/transactions-calendar";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { AccountIcon } from "@/components/dashboard/account-combobox";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import type { DashboardTransactionAccount } from "@/components/dashboard/dashboard-data-context";
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
  const [formInitialType, setFormInitialType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");

  function openQuickAdd(type: "INCOME" | "EXPENSE" | "TRANSFER") {
    setFormInitialType(type);
    setFormOpen(true);
  }

  function handleFormSuccess() {
    refresh();
  }

  const accountItems = useMemo(() => {
    const items: { account: DashboardTransactionAccount; txType: "INCOME" | "EXPENSE" | "TRANSFER" }[] = [];
    const txTypeMap = { INCOME: "INCOME" as const, EXPENSE: "EXPENSE" as const, TRANSFER: "TRANSFER" as const };
    for (const tx of recentTransactions) {
      const txType = txTypeMap[tx.type as keyof typeof txTypeMap] ?? "EXPENSE";
      if (tx.financialAccount) items.push({ account: tx.financialAccount, txType });
      if (tx.type === "TRANSFER" && tx.transferAccount) items.push({ account: tx.transferAccount, txType });
      if (items.length >= 6) break;
    }
    return items.slice(0, 6);
  }, [recentTransactions]);

  return (
    <div className="space-y-6 pt-4 sm:pt-8">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left column: Balance + Quick Actions + Calendar */}
        <div className="space-y-6">
          {summaryLoading ? (
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("dashboard.summary.loading")}
            </p>
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

              {/* Quick actions card */}
              <Card className="border-[#D4C9B0] bg-[#FDFAF4] dark:border-stone-700 dark:bg-stone-900/60">
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between gap-2 text-sm font-medium text-[#5C6B52] dark:text-stone-300">
                    {t("dashboard.summary.quickAddTitle")} 
                    <Link
                    href="/dashboard/accounts"
                    className="flex justify-end text-xs text-[#6B5E4E] hover:text-[#5C6B52] dark:text-stone-400 dark:hover:text-stone-300"
                  >
                    {t("dashboard.summary.manageAccounts")} &rarr;
                  </Link>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 w-full gap-2">
                    <Button
                      variant="outline"
                      className="flex h-auto flex-col items-center gap-1.5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/15 py-3 text-emerald-700 shadow-sm transition-all hover:border-emerald-500/70 hover:bg-emerald-500/25 hover:shadow-md active:scale-[0.98] dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:border-emerald-500/60 dark:hover:bg-emerald-500/30"
                      onClick={() => openQuickAdd("INCOME")}
                    >
                      <Plus className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium text-wrap">{t("dashboard.summary.recordIncome")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex h-auto flex-col items-center gap-1.5 rounded-2xl border-2 border-red-500/40 bg-red-500/15 py-3 text-red-700 shadow-sm transition-all hover:border-red-500/70 hover:bg-red-500/25 hover:shadow-md active:scale-[0.98] dark:border-red-500/30 dark:bg-red-500/20 dark:text-red-300 dark:hover:border-red-500/60 dark:hover:bg-red-500/30"
                      onClick={() => openQuickAdd("EXPENSE")}
                    >
                      <Minus className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium text-wrap">{t("dashboard.summary.recordExpense")}</span>
                    </Button>
                    <Button
                      variant="outline"
                      className="flex h-auto flex-col items-center gap-1.5 rounded-2xl border-2 border-amber-500/40 bg-amber-500/15 py-3 text-amber-700 shadow-sm transition-all hover:border-amber-500/70 hover:bg-amber-500/25 hover:shadow-md active:scale-[0.98] dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:border-amber-500/60 dark:hover:bg-amber-500/30"
                      onClick={() => openQuickAdd("TRANSFER")}
                    >
                      <ArrowLeftRight className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-medium text-wrap">{t("dashboard.summary.transferBetweenAccounts")}</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Recent account activity */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#5C6B52] dark:text-stone-300">
              {t("dashboard.summary.recentAccountActivity")}
            </p>
            <div className="flex flex-wrap gap-2">
              {accountItems.length === 0 ? (
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
          </div>

          {summaryLoading ? (
            <div className="rounded-xl border border-[#D4C9B0] bg-[#FDFAF4] p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900/80">
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
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
              <p className="text-sm text-[#A09080] dark:text-stone-400">
                {t("dashboard.summary.loading")}
              </p>
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
                <Card className="relative overflow-hidden space-y-0 gap-1 border-[#D4C9B0] bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/30">
                  <div className="absolute right-0 top-0 h-20 w-20 -translate-y-1/2 translate-x-1/2 rounded-full bg-amber-200/30 dark:bg-amber-800/20" />
                  <CardHeader className="flex flex-row items-center gap-2 pb-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200/60 dark:bg-amber-800/40">
                      <ArrowUpCircle className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                    </div>
                    <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {t("dashboard.summary.expense")} {t("dashboard.summary.title")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                      {summary ? formatAmount(summary.expense) : "0.00"}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          <TransactionsCalendar showNewTransactionButton={false}/>
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
