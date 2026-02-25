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

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  category: string | null;
  note: string | null;
  occurredAt: string;
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatAmount(amount: number) {
  if (Number.isNaN(amount)) return "-";
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransactionsListPage() {
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
          setError("You are not signed in.");
        } else {
          setError("Failed to load transactions");
        }
        setItems([]);
        return;
      }
      const data = (await res.json()) as Transaction[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setError("Failed to load transactions");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchTransactions();
  }, []);

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold">
            <List className="h-5 w-5" />
            Transactions
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            All recorded income and expenses for your account.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/calendar"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <CalendarRange className="h-4 w-4" />
            Calendar view
          </Link>
          <Link
            href="/dashboard/transactions"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            New transaction
          </Link>
        </div>
      </div>

      {loading && (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
          <p className="text-muted-foreground text-sm">Loading transactions…</p>
        </div>
      )}

      {error && !loading && (
        <p className="mt-6 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          No transactions recorded yet.
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/80">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Type
                </th>
                <th className="px-4 py-2 text-right font-medium text-zinc-500 dark:text-zinc-400">
                  Amount
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Category
                </th>
                <th className="px-4 py-2 text-left font-medium text-zinc-500 dark:text-zinc-400">
                  Note
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
                      {formatDate(tx.occurredAt)}
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
                        {isIncome ? "Income" : "Expense"}
                      </span>
                    </td>
                    <td className="px-4 py-2 align-top text-right tabular-nums text-zinc-900 dark:text-zinc-50">
                      {formatAmount(tx.amount)}
                    </td>
                    <td className="px-4 py-2 align-top text-zinc-700 dark:text-zinc-200">
                      {tx.category ?? "-"}
                    </td>
                    <td className="px-4 py-2 align-top text-zinc-600 dark:text-zinc-300">
                      {tx.note
                        ? tx.note.length > 60
                          ? `${tx.note.slice(0, 57)}…`
                          : tx.note
                        : "-"}
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

