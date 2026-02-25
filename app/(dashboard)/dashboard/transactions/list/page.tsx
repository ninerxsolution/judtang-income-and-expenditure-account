"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  List,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  CalendarRange,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  category: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
};

function formatDate(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatAmount(amount: number, locale: string) {
  if (Number.isNaN(amount)) return "-";
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransactionsListPage() {
  const { t, locale } = useI18n();

  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchTransactions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/transactions?limit=100");
      if (!res.ok) {
        if (res.status === 401) {
          setError(t("common.errors.unauthenticated"));
        } else {
          setError(t("transactions.list.loadFailed"));
        }
        setItems([]);
        return;
      }
      const data = (await res.json()) as Transaction[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError(t("transactions.list.loadFailed"));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <List className="h-5 w-5" />
            {t("dashboard.pageTitle.transactionsList")}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {t("transactions.list.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <CalendarRange className="h-4 w-4" />
            {t("transactions.list.calendarView")}
          </Link>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            {t("transactions.list.newTransaction")}
          </Link>
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
          <p className="text-muted-foreground text-sm">
            {t("transactions.list.loading")}
          </p>
        </div>
      )}

      {error && !loading && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          {t("transactions.list.empty")}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  {t("transactions.list.columns.date")}
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  {t("transactions.list.columns.type")}
                </th>
                <th className="px-4 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  {t("transactions.list.columns.amount")}
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  {t("transactions.list.columns.category")}
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  {t("transactions.list.columns.note")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => {
                const isIncome = tx.type === "INCOME";
                return (
                  <tr
                    key={tx.id}
                    className="border-t border-zinc-100 dark:border-zinc-800"
                  >
                    <td className="px-4 py-2 align-top text-zinc-800 dark:text-zinc-100">
                      {formatDate(tx.occurredAt, locale)}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                      >
                        {isIncome ? (
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        )}
                        {isIncome
                          ? t("transactions.common.income")
                          : t("transactions.common.expense")}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatAmount(tx.amount, locale)}
                    </td>
                    <td className="px-4 py-2 align-top text-zinc-700 dark:text-zinc-200">
                      {tx.category ?? "—"}
                    </td>
                    <td className="px-4 py-2 align-top text-zinc-600 dark:text-zinc-300">
                      {tx.note
                        ? tx.note.length > 60
                          ? `${tx.note.slice(0, 57)}…`
                          : tx.note
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

