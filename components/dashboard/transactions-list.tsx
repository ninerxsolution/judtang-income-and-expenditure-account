"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { List, ArrowDownCircle, ArrowUpCircle, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  category: string | null;
  note: string | null;
  occurredAt: string;
};

const LIMIT = 8;

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

export function TransactionsList() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", String(LIMIT));
    params.set("offset", "0");

    fetch(`/api/transactions?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error(t("common.errors.unauthenticated"));
          throw new Error(t("transactions.list.loadFailed"));
        }
        return res.json();
      })
      .then((data: Transaction[]) => {
        if (!cancelled) {
          setItems(Array.isArray(data) ? data : []);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("transactions.list.loadFailed"));
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          <List className="h-4 w-4" />
          {t("dashboard.recentTransactions")}
        </h2>
        <Link
          href="/dashboard/transactions"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {t("transactions.new.viewAll")}
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("transactions.list.empty")}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((tx) => {
            const isIncome = tx.type === "INCOME";
            return (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-md border border-zinc-100 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
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
                  <div className="min-w-0 flex-1">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      {formatDate(tx.occurredAt, locale)}
                    </span>
                    {tx.category && (
                      <span className="ml-2 text-zinc-700 dark:text-zinc-200">
                        · {tx.category}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 tabular-nums font-medium ${
                    isIncome
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatAmount(tx.amount, locale)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
