"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { List, ArrowDownCircle, ArrowUpCircle, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  financialAccount?: { id: string; name: string } | null;
  categoryRef?: { id: string; name: string } | null;
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

type TransactionsListProps = {
  initialData?: Transaction[] | null;
};

export function TransactionsList({ initialData }: TransactionsListProps = {}) {
  const { t, locale, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";
  const isMobile = useIsMobile();
  const [items, setItems] = useState<Transaction[]>(
    Array.isArray(initialData) ? initialData : []
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData !== undefined && initialData !== null) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });

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
  }, [initialData, t]);

  return (
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

      {loading && (
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
      )}

      {error && !loading && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-[#A09080] dark:text-stone-400">
          {t("transactions.list.empty")}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-1">
          {items.map((tx) => {
            const isIncome = tx.type === "INCOME";
            const amountSpan = (
              <span
                className={`shrink-0 tabular-nums font-medium ${
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-300"
                    : "text-red-600 dark:text-red-300"
                }`}
              >
                {isIncome ? "+" : "-"}
                {formatAmount(tx.amount)}
              </span>
            );

            if (isMobile) {
              return (
                <li
                  key={tx.id}
                  className="flex flex-col gap-1 rounded-md border border-[#E8E0C8] px-3 py-2 text-sm dark:border-stone-800"
                >
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span
                        className={`inline-flex shrink-0 items-center justify-center rounded-full p-1 ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        }`}
                        aria-label={isIncome ? t("transactions.common.income") : t("transactions.common.expense")}
                      >
                        {isIncome ? (
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        {(tx.categoryRef?.name ?? tx.category) ? (
                          <>
                            <span className="text-[#3D3020] dark:text-stone-200">
                              {getCategoryDisplayName(
                                tx.categoryRef?.name ?? tx.category ?? "",
                                localeKey,
                                tx.categoryRef?.nameEn
                              )}
                            </span>
                            {tx.financialAccount && (
                              <span className="ml-1.5 text-[#A09080] dark:text-stone-400 text-xs">
                                ({tx.financialAccount.name})
                              </span>
                            )}
                          </>
                        ) : tx.financialAccount ? (
                          <span className="text-[#A09080] dark:text-stone-400 text-xs">
                            ({tx.financialAccount.name})
                          </span>
                        ) : (
                          <span className="text-[#A09080] dark:text-stone-400">—</span>
                        )}
                      </div>
                    </div>
                    {amountSpan}
                  </div>
                  <span className="text-[10px] text-[#A09080] dark:text-stone-400">
                    {formatDate(tx.occurredAt, locale)}
                  </span>
                </li>
              );
            }

            return (
              <li
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-md border border-[#E8E0C8] px-3 py-2 text-sm dark:border-stone-800"
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
                    <span className="text-[#A09080] dark:text-stone-400">
                      {formatDate(tx.occurredAt, locale)}
                    </span>
                    {(tx.categoryRef?.name ?? tx.category) && (
                      <span className="ml-2 text-[#3D3020] dark:text-stone-200">
                        · {getCategoryDisplayName(
                                tx.categoryRef?.name ?? tx.category ?? "",
                                localeKey,
                                tx.categoryRef?.nameEn
                              )}
                      </span>
                    )}
                    {tx.financialAccount && (
                      <span className="ml-2 text-[#A09080] dark:text-stone-400 text-xs">
                        ({tx.financialAccount.name})
                      </span>
                    )}
                  </div>
                </div>
                {amountSpan}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
