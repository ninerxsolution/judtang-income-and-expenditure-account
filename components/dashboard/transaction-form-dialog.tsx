"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/auth/form-field";
import { MAX_CATEGORY_LENGTH, MAX_NOTE_LENGTH } from "@/lib/validation";
import { useI18n } from "@/hooks/use-i18n";

type TransactionType = "INCOME" | "EXPENSE";

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

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

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  initialDate?: string | null;
  onSuccess?: () => void;
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  editId,
  initialDate,
  onSuccess,
}: TransactionFormDialogProps) {
  const { t } = useI18n();

  const resolvedInitialDate =
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : formatTodayAsInputDate();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [category, setCategory] = useState("");
  const [occurredAt, setOccurredAt] = useState(resolvedInitialDate);
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "done" | "error"
  >(editId ? "loading" : "idle");

  const [accounts, setAccounts] = useState<
    { id: string; name: string; isDefault: boolean; type: string }[]
  >([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [status, setStatus] = useState<"PENDING" | "POSTED">("POSTED");

  const amountError = useMemo(() => {
    if (!amount) return null;
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return t("transactions.new.amountInvalid");
    }
    return null;
  }, [amount, t]);

  useEffect(() => {
    if (!open) return;
    setOccurredAt(
      initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
        ? initialDate
        : formatTodayAsInputDate(),
    );
    if (!editId) {
      setType("EXPENSE");
      setAmount("");
      setFinancialAccountId("");
      setCategoryId("");
      setCategory("");
      setNote("");
      setLoadState("idle");
      setError(null);
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
      .then(
        (
          data:
            | {
                type: string;
                amount: number;
                financialAccountId: string | null;
                categoryId: string | null;
                category: string | null;
                note: string | null;
                occurredAt: string;
              }
            | undefined,
        ) => {
          if (cancelled || !data) return;
          setType(data.type === "INCOME" ? "INCOME" : "EXPENSE");
          setAmount(sanitizeAmountInput(String(data.amount)));
          setFinancialAccountId(data.financialAccountId ?? "");
          setCategoryId(data.categoryId ?? "");
          setCategory(data.category ?? "");
          setNote(data.note ?? "");
          setOccurredAt(formatDateToInput(data.occurredAt));
          setStatus(
            (data as { status?: string }).status === "PENDING" ? "PENDING" : "POSTED"
          );
          setLoadState("done");
        },
      )
      .catch(() => {
        if (!cancelled) {
          setLoadState("error");
          setError(t("transactions.edit.loadFailed"));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, editId, initialDate, t]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      fetch("/api/financial-accounts").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
    ]).then(([accData, catData]) => {
      if (cancelled) return;
      const accs = Array.isArray(accData)
        ? accData.filter(
            (a: { isActive?: boolean; isIncomplete?: boolean }) =>
              a.isActive !== false && !a.isIncomplete
          )
        : [];
      setAccounts(
        accs.map(
          (a: { id: string; name: string; isDefault?: boolean; type?: string }) => ({
            id: a.id,
            name: a.name,
            isDefault: a.isDefault ?? false,
            type: a.type ?? "CASH",
          })
        )
      );
      setCategories(
        Array.isArray(catData)
          ? catData.map((c: { id: string; name: string }) => ({
              id: c.id,
              name: c.name,
            }))
          : []
      );
      if (!editId && accs.length > 0) {
        const defaultAcc =
          accs.find((a: { isDefault?: boolean }) => a.isDefault) ?? accs[0];
        setFinancialAccountId(defaultAcc.id);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, editId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!type) {
      setError(t("transactions.new.typeRequired"));
      return;
    }

    if (!amount || amountError) {
      setError(amountError ?? t("transactions.new.amountRequired"));
      return;
    }

    if (!occurredAt) {
      setError(t("transactions.new.dateRequired"));
      return;
    }

    const value = Number.parseFloat(amount);
    const selectedAccount = accounts.find((a) => a.id === financialAccountId);
    const isCreditCard = selectedAccount?.type === "CREDIT_CARD";

    const body: Record<string, unknown> = {
      type,
      amount: value,
      financialAccountId: financialAccountId || undefined,
      categoryId: categoryId.trim() || undefined,
      category: category.trim() || undefined,
      note: note.trim() || undefined,
      occurredAt: occurredAt || undefined,
    };
    if (isCreditCard && type === "EXPENSE") {
      body.status = status;
    }

    setPending(true);
    try {
      if (editId) {
        const res = await fetch(`/api/transactions/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? t("transactions.new.saveFailed"));
          return;
        }
        onOpenChange(false);
        onSuccess?.();
      } else {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json()) as
          | { error?: string }
          | { id: string };
        if (!res.ok) {
          setError(
            "error" in data && data.error
              ? data.error
              : t("transactions.new.saveFailed"),
          );
          return;
        }
        setAmount("");
        setCategoryId("");
        setCategory("");
        setNote("");
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      setError(t("transactions.new.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  const isEdit = Boolean(editId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t("transactions.edit.title")
              : t("dashboard.pageTitle.transactionsNew")}
          </DialogTitle>
        </DialogHeader>

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
          className="space-y-4"
          style={{ display: loadState === "loading" ? "none" : undefined }}
        >
          <div>
            <span className="mb-1 block text-sm font-medium">
              {t("transactions.new.typeLabel")}
            </span>
            <div className="inline-flex rounded-md border overflow-hidden border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 transition-all ${
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
                className={`inline-flex items-center gap-1 border-l border-zinc-300 px-3 py-1.5 dark:border-zinc-700 transition-all ${
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

          <div>
            <label htmlFor="transaction-modal-account" className="mb-1 block text-sm font-medium">
              {t("transactions.new.accountLabel")}
            </label>
            <select
              id="transaction-modal-account"
              value={financialAccountId}
              onChange={(e) => setFinancialAccountId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} {acc.isDefault ? `(${t("accounts.default")})` : ""}
                </option>
              ))}
            </select>
          </div>

          {(() => {
            const sel = accounts.find((a) => a.id === financialAccountId);
            const showStatus = sel?.type === "CREDIT_CARD" && type === "EXPENSE";
            return showStatus ? (
              <div>
                <span className="mb-1 block text-sm font-medium">
                  {t("transactions.new.statusLabel")}
                </span>
                <div className="inline-flex rounded-md border overflow-hidden border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setStatus("PENDING")}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 transition-all ${
                      status === "PENDING"
                        ? "bg-amber-500 text-white"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {t("transactions.new.statusPending")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("POSTED")}
                    className={`inline-flex items-center gap-1 border-l border-zinc-300 px-3 py-1.5 dark:border-zinc-700 transition-all ${
                      status === "POSTED"
                        ? "bg-emerald-500 text-white"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    }`}
                  >
                    {t("transactions.new.statusPosted")}
                  </button>
                </div>
              </div>
            ) : null;
          })()}

          <FormField
            id="transaction-modal-amount"
            label={t("transactions.new.amountLabel")}
            type="text"
            required
            value={amount}
            onChange={(v) => setAmount(sanitizeAmountInput(v))}
            error={amountError}
            inputMode="decimal"
          />

          <div>
            <label htmlFor="transaction-modal-category" className="mb-1 block text-sm font-medium">
              {t("transactions.new.categoryLabel")}
            </label>
            <select
              id="transaction-modal-category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="">—</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <DatePicker
            id="transaction-modal-date"
            label={t("transactions.new.dateLabel")}
            value={occurredAt}
            onChange={setOccurredAt}
            required
          />

          <div>
            <label
              htmlFor="transaction-modal-note"
              className="mb-1 block text-sm font-medium"
            >
              {t("transactions.new.noteLabel")}
            </label>
            <textarea
              id="transaction-modal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={MAX_NOTE_LENGTH}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={pending || loadState === "loading"}>
              {pending
                ? t("transactions.new.pending")
                : isEdit
                  ? t("transactions.edit.submit")
                  : t("transactions.new.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
