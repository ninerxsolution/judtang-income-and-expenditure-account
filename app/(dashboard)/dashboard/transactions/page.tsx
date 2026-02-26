"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { FormField } from "@/components/auth/form-field";
import { useI18n } from "@/hooks/use-i18n";

type TransactionType = "INCOME" | "EXPENSE";

function formatTodayAsInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateToInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatTodayAsInputDate();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TransactionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t } = useI18n();

  const editId = searchParams.get("id");
  const initialDateFromQuery = searchParams.get("date");
  const initialDate =
    initialDateFromQuery && /^\d{4}-\d{2}-\d{2}$/.test(initialDateFromQuery)
      ? initialDateFromQuery
      : formatTodayAsInputDate();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState(initialDate);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "done" | "error">(
    editId ? "loading" : "idle",
  );

  const amountError = useMemo(() => {
    if (!amount) return null;
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return t("transactions.new.amountInvalid");
    }
    return null;
  }, [amount, t]);

  useEffect(() => {
    if (!editId) {
      setLoadState("idle");
      return;
    }
    let cancelled = false;
    setLoadState("loading");
    setError(null);
    fetch(`/api/transactions/${editId}`)
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setLoadState("error");
          setError(t("transactions.edit.loadFailed"));
          return;
        }
        return res.json();
      })
      .then((data: { type: string; amount: number; category: string | null; note: string | null; occurredAt: string } | undefined) => {
        if (cancelled || !data) return;
        setType(data.type === "INCOME" ? "INCOME" : "EXPENSE");
        setAmount(String(data.amount));
        setCategory(data.category ?? "");
        setNote(data.note ?? "");
        setOccurredAt(formatDateToInput(data.occurredAt));
        setLoadState("done");
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("error");
          setError(t("transactions.edit.loadFailed"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [editId, t]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!type) {
      setError(t("transactions.new.typeRequired"));
      return;
    }

    if (!amount || amountError) {
      setError(amountError ?? t("transactions.new.amountRequired"));
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
      if (editId) {
        const res = await fetch(`/api/transactions/${editId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? t("transactions.new.saveFailed"));
          return;
        }
        setSuccessMessage(t("transactions.edit.saveSuccess"));
        setTimeout(() => router.push("/dashboard/transactions/list"), 1000);
      } else {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string } | { id: string };
        if (!res.ok) {
          setError(
            "error" in data && data.error
              ? data.error
              : t("transactions.new.saveFailed"),
          );
          return;
        }
        setSuccessMessage(t("transactions.new.saveSuccess"));
        setAmount("");
        setCategory("");
        setNote("");
      }
    } catch {
      setError(t("transactions.new.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  const isEdit = Boolean(editId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">
            {isEdit ? t("transactions.edit.title") : t("dashboard.pageTitle.transactionsNew")}
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {isEdit ? t("transactions.edit.subtitle") : t("transactions.new.subtitle")}
          </p>
        </div>
        <Link
          href="/dashboard/transactions/list"
          className="text-sm font-medium text-zinc-700 hover:underline dark:text-zinc-200"
        >
          {t("transactions.new.viewAll")}
        </Link>
      </div>

      {loadState === "loading" && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("transactions.edit.loading")}
        </p>
      )}
      {loadState === "error" && error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-4"
        style={{ display: loadState === "loading" ? "none" : undefined }}
      >
        <div>
          <span className="mb-1 block text-sm font-medium">
            {t("transactions.new.typeLabel")}
          </span>
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
              {t("transactions.new.income")}
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
              {t("transactions.new.expense")}
            </button>
          </div>
        </div>

        <FormField
          id="transaction-amount"
          label={t("transactions.new.amountLabel")}
          type="number"
          required
          value={amount}
          onChange={setAmount}
          error={amountError}
        />

        <FormField
          id="transaction-category"
          label={t("transactions.new.categoryLabel")}
          type="text"
          value={category}
          onChange={setCategory}
        />

        <FormField
          id="transaction-date"
          label={t("transactions.new.dateLabel")}
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
            {t("transactions.new.noteLabel")}
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
          disabled={pending || loadState === "loading"}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {pending
            ? t("transactions.new.pending")
            : isEdit
              ? t("transactions.edit.submit")
              : t("transactions.new.submit")}
        </button>
      </form>
    </div>
  );
}

