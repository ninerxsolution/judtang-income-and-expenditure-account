"use client";

/**
 * Dashboard home: summary cards + calendar.
 * Protected by proxy — requires login. URL: /dashboard
 */
import { useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { TransactionsCalendar } from "@/components/dashboard/transactions-calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/hooks/use-i18n";

type Summary = { income: number; expense: number } | null;

function formatMoney(value: number, locale: string): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const [summary, setSummary] = useState<Summary>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    fetch("/api/transactions/summary")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Summary) => {
        if (!cancelled && data) setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const balance = summary ? summary.income - summary.expense : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.pageTitle.dashboard")}</CardTitle>
          <CardDescription>
            {t("dashboard.home.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            {t("dashboard.home.body")}
          </p>
        </CardContent>
      </Card>

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
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ArrowDownCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.summary.income")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {summary ? formatMoney(summary.income, locale) : "0.00"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.summary.expense")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums text-red-700 dark:text-red-300">
                  {summary ? formatMoney(summary.expense, locale) : "0.00"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Wallet className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-sm font-medium">
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
                  {summary ? formatMoney(balance, locale) : "0.00"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <TransactionsCalendar />
    </div>
  );
}
