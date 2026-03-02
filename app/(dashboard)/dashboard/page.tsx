"use client";

/**
 * Dashboard home: summary cards + calendar.
 * Protected by proxy — requires login. URL: /dashboard
 */
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { TransactionsCalendar } from "@/components/dashboard/transactions-calendar";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";

export default function DashboardPage() {
  const { t } = useI18n();
  const { summary, recentTransactions, loading: summaryLoading } = useDashboardData();
  const balance =
    summary?.totalBalance ?? (summary ? summary.income - summary.expense : 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <TransactionsCalendar />
       <div className="space-y-6">
       <div>
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("dashboard.summary.title")}
        </h2>
        {summaryLoading ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("dashboard.summary.loading")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="flex flex-row sm:block sm:flex-col items-center justify-between gap-1">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ArrowDownCircle className="min-w-4 min-h-4 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-sm font-medium text-nowrap">
                  {t("dashboard.summary.income")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {summary ? formatAmount(summary.income) : "0.00"}
                </p>
              </CardContent>
            </Card>
            <Card className="flex flex-row sm:block sm:flex-col items-center justify-between gap-1">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ArrowUpCircle className="min-w-4 min-h-4 w-4 h-4 text-red-600 dark:text-red-400" />
                <CardTitle className="text-sm font-medium text-nowrap">
                  {t("dashboard.summary.expense")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums text-red-700 dark:text-red-300">
                  {summary ? formatAmount(summary.expense) : "0.00"}
                </p>
              </CardContent>
            </Card>
            <Card className="flex flex-row sm:block sm:flex-col items-center justify-between gap-1">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Wallet className="min-w-4 min-h-4 w-4 h-4 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-sm font-medium text-nowrap">
                  {t("dashboard.summary.balance")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={`text-xl font-semibold tabular-nums ${
                    balance >= 0
                      ? "text-zinc-900 dark:text-zinc-50"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {summary ? formatAmount(balance) : "0.00"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
       {summaryLoading ? (
         <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
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
      </div>
    </div>
  );
}
