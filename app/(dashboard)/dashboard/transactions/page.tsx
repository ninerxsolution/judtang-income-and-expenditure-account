"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { FormField } from "@/components/auth/form-field";

type TransactionType = "INCOME" | "EXPENSE";

function formatTodayAsInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TransactionsPage() {
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState(formatTodayAsInputDate());
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const amountError = useMemo(() => {
    if (!amount) return null;
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return "Amount must be a positive number";
    }
    return null;
  }, [amount]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!type) {
      setError("Please select income or expense");
      return;
    }

    if (!amount || amountError) {
      setError(amountError ?? "Please enter an amount");
      return;
    }

    const value = Number.parseFloat(amount);
    const body = {
      type,
      amount: value,
      category: category.trim() || undefined,
      note: note.trim() || undefined,
      occurredAt: occurredAt || undefined,
    };

    setPending(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = (await res.json()) as { error?: string } | { id: string };

      if (!res.ok) {
        setError("error" in data && data.error ? data.error : "Failed to save transaction");
        return;
      }

      setSuccessMessage("Transaction saved");
      setAmount("");
      setCategory("");
      setNote("");
    } catch {
      setError("Failed to save transaction");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">New Transaction</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Quickly record your income and expenses.
          </p>
        </div>
        <Link
          href="/dashboard/transactions/list"
          className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-200"
        >
          View all
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <span className="mb-1 block text-sm font-medium">Type</span>
          <div className="inline-flex rounded-md border border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setType("INCOME")}
              className={`inline-flex items-center gap-1 px-3 py-1.5 ${
                type === "INCOME"
                  ? "bg-emerald-500 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Income
            </button>
            <button
              type="button"
              onClick={() => setType("EXPENSE")}
              className={`inline-flex items-center gap-1 border-l border-zinc-300 px-3 py-1.5 dark:border-zinc-700 ${
                type === "EXPENSE"
                  ? "bg-red-500 text-white"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Expense
            </button>
          </div>
        </div>

        <FormField
          id="transaction-amount"
          label="Amount"
          type="number"
          required
          value={amount}
          onChange={setAmount}
          error={amountError}
        />

        <FormField
          id="transaction-category"
          label="Category (optional)"
          type="text"
          value={category}
          onChange={setCategory}
        />

        <FormField
          id="transaction-date"
          label="Date"
          type="date"
          required
          value={occurredAt}
          onChange={setOccurredAt}
        />

        <div>
          <label
            htmlFor="transaction-note"
            className="mb-1 block text-sm font-medium"
          >
            Note (optional)
          </label>
          <textarea
            id="transaction-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {successMessage && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {successMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending ? "Saving…" : "Save transaction"}
        </button>
      </form>
    </div>
  );
}

