"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/auth/form-field";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { AccountCombobox } from "@/components/dashboard/account-combobox";
import { cn } from "@/lib/utils";
import { MAX_NOTE_LENGTH } from "@/lib/validation";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getRecentFinancialAccountIds,
  pickPreferredAccountId,
  saveRecentFinancialAccountId,
} from "@/lib/recent-financial-accounts";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

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

const RECENT_CATEGORIES_KEY = "judtang_recent_categories";
const MAX_RECENT_CATEGORIES = 20;
const INITIAL_CATEGORY_COUNT = 3;

function getRecentCategoryIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function saveRecentCategoryId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentCategoryIds();
    const filtered = recent.filter((x) => x !== id);
    const updated = [id, ...filtered].slice(0, MAX_RECENT_CATEGORIES);
    window.localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

type CategoryItem = { id: string; name: string; nameEn?: string | null };

function sortCategoriesByRecent(
  categories: CategoryItem[],
  recentIds: string[],
): CategoryItem[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered: CategoryItem[] = [];
  for (const id of recentIds) {
    const cat = byId.get(id);
    if (cat) {
      ordered.push(cat);
      byId.delete(id);
    }
  }
  const rest = Array.from(byId.values());
  return [...ordered, ...rest];
}

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  initialDate?: string | null;
  initialType?: "INCOME" | "EXPENSE" | "TRANSFER";
  onSuccess?: () => void;
};

export function TransactionFormDialog({
  open,
  onOpenChange,
  editId,
  initialDate,
  initialType,
  onSuccess,
}: TransactionFormDialogProps) {
  const { t, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";

  const resolvedInitialDate =
    initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
      ? initialDate
      : formatTodayAsInputDate();

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
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
    {
      id: string;
      name: string;
      isDefault: boolean;
      type: string;
      bankName?: string | null;
      cardNetwork?: string | null;
    }[]
  >([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [status, setStatus] = useState<"PENDING" | "POSTED">("POSTED");
  const [formDataLoading, setFormDataLoading] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  const sortedCategories = useMemo(
    () => sortCategoriesByRecent(categories, recentCategoryIds),
    [categories, recentCategoryIds],
  );

  const visibleCategories = categoriesExpanded
    ? sortedCategories
    : sortedCategories.slice(0, INITIAL_CATEGORY_COUNT);
  const hasMoreCategories = sortedCategories.length > INITIAL_CATEGORY_COUNT;

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setRecentCategoryIds(getRecentCategoryIds());
    }
    if (!open) {
      setCategoriesExpanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || (loadState !== "idle" && loadState !== "done")) return;
    const id = window.setTimeout(() => {
      amountInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, loadState]);
  const viewport = useVisualViewport(open && isMobile);

  const amountError = useMemo(() => {
    if (!amount) return null;
    const value = Number.parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      return t("transactions.new.amountInvalid");
    }
    return null;
  }, [amount, t]);

  const transferableAccounts = useMemo(
    () => accounts.filter((a) => a.type !== "CREDIT_CARD"),
    [accounts],
  );

  useEffect(() => {
    if (type === "TRANSFER" && transferableAccounts.length > 0) {
      const fromId = financialAccountId;
      const firstOther = transferableAccounts.find((a) => a.id !== fromId);
      setTransferAccountId((prev) => {
        if (!prev || prev === fromId) return firstOther?.id ?? "";
        const stillValid = transferableAccounts.some(
          (a) => a.id === prev && a.id !== fromId,
        );
        return stillValid ? prev : firstOther?.id ?? "";
      });
    } else if (type !== "TRANSFER") {
      setTransferAccountId("");
    }
  }, [type, financialAccountId, transferableAccounts]);

  useEffect(() => {
    if (!open) return;
    setOccurredAt(
      initialDate && /^\d{4}-\d{2}-\d{2}$/.test(initialDate)
        ? initialDate
        : formatTodayAsInputDate(),
    );
    if (!editId) {
      setType(initialType ?? "EXPENSE");
      setAmount("");
      setFinancialAccountId("");
      setTransferAccountId("");
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
                transferAccountId?: string | null;
                categoryId: string | null;
                category: string | null;
                note: string | null;
                occurredAt: string;
              }
            | undefined,
        ) => {
          if (cancelled || !data) return;
          const txType =
            data.type === "INCOME"
              ? "INCOME"
              : data.type === "TRANSFER"
                ? "TRANSFER"
                : "EXPENSE";
          setType(txType);
          setAmount(sanitizeAmountInput(String(data.amount)));
          setFinancialAccountId(data.financialAccountId ?? "");
          setTransferAccountId(data.transferAccountId ?? "");
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
  }, [open, editId, initialDate, initialType, t]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setFormDataLoading(true);
    Promise.all([
      fetch("/api/financial-accounts").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([accData, catData]) => {
        if (cancelled) return;
        const accs = Array.isArray(accData)
          ? accData.filter(
              (a: {
                isActive?: boolean;
                isIncomplete?: boolean;
                isHidden?: boolean;
              }) =>
                a.isActive !== false &&
                !a.isIncomplete &&
                (a.isHidden !== true)
            )
          : [];
        setAccounts(
          accs.map(
            (a: {
              id: string;
              name: string;
              isDefault?: boolean;
              type?: string;
              bankName?: string | null;
              cardNetwork?: string | null;
            }) => ({
              id: a.id,
              name: a.name,
              isDefault: a.isDefault ?? false,
              type: a.type ?? "CASH",
              bankName: a.bankName ?? null,
              cardNetwork: a.cardNetwork ?? null,
            })
          )
        );
        setCategories(
          Array.isArray(catData)
            ? catData.map((c: { id: string; name: string; nameEn?: string | null }) => ({
                id: c.id,
                name: c.name,
                nameEn: c.nameEn,
              }))
            : []
        );
        if (!editId && accs.length > 0) {
          const recent = getRecentFinancialAccountIds();
          const txTypeInitial = initialType ?? "EXPENSE";

          if (txTypeInitial === "TRANSFER") {
            const transferable = accs.filter(
              (a: { type?: string }) => a.type !== "CREDIT_CARD",
            );
            if (transferable.length > 0) {
              const fromAcc =
                pickPreferredAccountId(transferable, recent) ??
                transferable.find(
                  (a: { isDefault?: boolean }) => a.isDefault,
                ) ??
                transferable[0];
              setFinancialAccountId(fromAcc.id);
              const others = transferable.filter(
                (a: { id: string }) => a.id !== fromAcc.id,
              );
              const toAcc =
                pickPreferredAccountId(others, recent) ?? others[0];
              if (toAcc) setTransferAccountId(toAcc.id);
            }
          } else {
            const chosen =
              pickPreferredAccountId(accs, recent) ??
              accs.find(
                (a: { isDefault?: boolean; isHidden?: boolean }) =>
                  a.isDefault && a.isHidden !== true,
              ) ??
              accs[0];
            setFinancialAccountId(chosen.id);
            const transferable = accs.filter(
              (a: { type?: string }) => a.type !== "CREDIT_CARD",
            );
            const secondTransferable =
              pickPreferredAccountId(
                transferable.filter((a: { id: string }) => a.id !== chosen.id),
                recent,
              ) ?? transferable.find((a: { id: string }) => a.id !== chosen.id);
            if (secondTransferable) setTransferAccountId(secondTransferable.id);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setFormDataLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, editId, initialType]);

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

    if (type === "TRANSFER") {
      if (!transferAccountId) {
        setError(t("transactions.new.transferToAccountRequired"));
        return;
      }
      if (transferAccountId === financialAccountId) {
        setError(t("transactions.new.transferAccountsSame"));
        return;
      }
    }

    const value = Number.parseFloat(amount);
    const selectedAccount = accounts.find((a) => a.id === financialAccountId);
    const isCreditCard = selectedAccount?.type === "CREDIT_CARD";

    // Combine selected date with current time so occurredAt reflects when user clicked save
    const occurredAtValue = occurredAt
      ? (() => {
          const [y, m, day] = occurredAt.split("-").map(Number);
          const now = new Date();
          const combined = new Date(
            y,
            m - 1,
            day,
            now.getHours(),
            now.getMinutes(),
            now.getSeconds(),
            now.getMilliseconds()
          );
          return combined.toISOString();
        })()
      : undefined;

    const body: Record<string, unknown> = {
      type,
      amount: value,
      financialAccountId: financialAccountId || undefined,
      categoryId: type !== "TRANSFER" ? (categoryId.trim() || undefined) : undefined,
      category: type !== "TRANSFER" ? (category.trim() || undefined) : undefined,
      note: note.trim() || undefined,
      occurredAt: occurredAtValue,
    };
    if (type === "TRANSFER") {
      body.transferAccountId = transferAccountId || undefined;
    }
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
        if (type !== "TRANSFER" && categoryId) {
          saveRecentCategoryId(categoryId);
        }
        if (financialAccountId) {
          saveRecentFinancialAccountId(financialAccountId);
        }
        if (type === "TRANSFER" && transferAccountId) {
          saveRecentFinancialAccountId(transferAccountId);
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
        if (type !== "TRANSFER" && categoryId) {
          saveRecentCategoryId(categoryId);
        }
        if (financialAccountId) {
          saveRecentFinancialAccountId(financialAccountId);
        }
        if (type === "TRANSFER" && transferAccountId) {
          saveRecentFinancialAccountId(transferAccountId);
        }
        setAmount("");
        setCategoryId("");
        setCategory("");
        setTransferAccountId("");
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
      <DialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
        className={cn(
          "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
          "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
        )}
        style={
          isMobile && viewport
            ? {
                height: viewport.height,
                top: viewport.offsetTop,
                left: 0,
                width: "100%",
                maxWidth: "100%",
              }
            : undefined
        }
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>
            {isEdit
              ? t("transactions.edit.title")
              : t("dashboard.pageTitle.transactionsNew")}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col min-h-0 overflow-hidden"
        >
          <DialogBody className="space-y-4">
            {loadState === "loading" && (
              <div className="space-y-4">
                <div>
                  <Skeleton className="mb-1 h-4 w-16" />
                  <Skeleton className="h-9 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="mb-1 h-4 w-20" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="mb-1 h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="mb-1 h-4 w-16" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="mb-1 h-4 w-12" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div>
                  <Skeleton className="mb-1 h-4 w-16" />
                  <Skeleton className="h-20 w-full rounded-md" />
                </div>
              </div>
            )}
            {loadState === "error" && error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
            {(loadState === "idle" || loadState === "done") && (
              <>
                <div>
                  <DatePicker
                    id="transaction-modal-date"
                    label={t("transactions.new.dateLabel")}
                    value={occurredAt}
                    onChange={setOccurredAt}
                    required
                    variant="inline"
                    placeholder={t("transactions.new.dateSelectPlaceholder")}
                  />
                </div>

                <div>
            <span className="mb-1 block text-sm font-medium">
              {t("transactions.new.typeLabel")}
            </span>
            <div className="inline-flex rounded-md border overflow-hidden border-[#D4C9B0] bg-[#FDFAF4] text-sm dark:border-stone-700 dark:bg-stone-900">
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 transition-all ${
                  type === "INCOME"
                    ? "bg-emerald-500 text-white"
                    : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                <ArrowDownCircle className="h-4 w-4" />
                {t("transactions.new.income")}
              </button>
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={`inline-flex items-center gap-1 border-l border-[#D4C9B0] px-3 py-1.5 dark:border-stone-700 transition-all ${
                  type === "EXPENSE"
                    ? "bg-red-500 text-white"
                    : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                <ArrowUpCircle className="h-4 w-4" />
                {t("transactions.new.expense")}
              </button>
              <button
                type="button"
                onClick={() => setType("TRANSFER")}
                className={`inline-flex items-center gap-1 border-l border-[#D4C9B0] px-3 py-1.5 dark:border-stone-700 transition-all ${
                  type === "TRANSFER"
                    ? "bg-blue-500 text-white"
                    : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                <ArrowLeftRight className="h-4 w-4" />
                {t("transactions.new.transfer")}
              </button>
            </div>
          </div>

          {formDataLoading ? (
            <>
              {type === "TRANSFER" ? (
                <>
                  <div>
                    <Skeleton className="mb-1 h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                  <div>
                    <Skeleton className="mb-1 h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-md" />
                  </div>
                </>
              ) : (
                <div>
                  <Skeleton className="mb-1 h-4 w-24" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
              )}
            </>
          ) : type === "TRANSFER" ? (
            <>
              <div>
                <label htmlFor="transaction-modal-from-account" className="mb-1 block text-sm font-medium">
                  {t("transactions.new.fromAccount")}
                </label>
                <AccountCombobox
                  id="transaction-modal-from-account"
                  value={financialAccountId}
                  onChange={setFinancialAccountId}
                  accounts={accounts}
                  filterByType={(accType) => accType !== "CREDIT_CARD"}
                  defaultLabel={t("accounts.default")}
                  className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
              <div>
                <label htmlFor="transaction-modal-to-account" className="mb-1 block text-sm font-medium">
                  {t("transactions.new.toAccount")}
                </label>
                <AccountCombobox
                  id="transaction-modal-to-account"
                  value={transferAccountId}
                  onChange={setTransferAccountId}
                  accounts={accounts}
                  excludeIds={[financialAccountId]}
                  filterByType={(accType) => accType !== "CREDIT_CARD"}
                  allowEmpty
                  emptyLabel="—"
                  defaultLabel={t("accounts.default")}
                  className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
                />
              </div>
            </>
          ) : (
            <div>
              <label htmlFor="transaction-modal-account" className="mb-1 block text-sm font-medium">
                {t("transactions.new.accountLabel")}
              </label>
              <AccountCombobox
                id="transaction-modal-account"
                value={financialAccountId}
                onChange={setFinancialAccountId}
                accounts={accounts}
                defaultLabel={t("accounts.default")}
                className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
          )}

          {(() => {
            const sel = accounts.find((a) => a.id === financialAccountId);
            const showStatus = sel?.type === "CREDIT_CARD" && type === "EXPENSE";
            return showStatus ? (
              <div>
                <span className="mb-1 block text-sm font-medium">
                  {t("transactions.new.statusLabel")}
                </span>
                <div className="inline-flex rounded-md border overflow-hidden border-[#D4C9B0] bg-[#FDFAF4] text-sm dark:border-stone-700 dark:bg-stone-900">
                  <button
                    type="button"
                    onClick={() => setStatus("PENDING")}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 transition-all ${
                      status === "PENDING"
                        ? "bg-amber-500 text-white"
                        : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                    }`}
                  >
                    {t("transactions.new.statusPending")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatus("POSTED")}
                    className={`inline-flex items-center gap-1 border-l border-[#D4C9B0] px-3 py-1.5 dark:border-stone-700 transition-all ${
                      status === "POSTED"
                        ? "bg-emerald-500 text-white"
                        : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
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
            inputRef={amountInputRef}
          />

          {type !== "TRANSFER" &&
            (formDataLoading ? (
              <div>
                <Skeleton className="mb-1 h-4 w-20" />
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
            ) : (
              <div>
                <span className="mb-1 block text-sm font-medium">
                  {t("transactions.new.categoryLabel")}
                </span>
                <div
                  id="transaction-modal-category"
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label={t("transactions.new.categoryLabel")}
                >
                  {visibleCategories.map((cat) => {
                    const isSelected = categoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setCategoryId("");
                            setCategory("");
                          } else {
                            setCategoryId(cat.id);
                            setCategory(getCategoryDisplayName(cat.name, localeKey, cat.nameEn));
                          }
                        }}
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-all",
                          "border-[#D4C9B0] dark:border-stone-700",
                          isSelected
                            ? "bg-[#5C6B52] text-white border-[#5C6B52] dark:bg-stone-600 dark:border-stone-600"
                            : "bg-[#FDFAF4] text-[#3D3020] hover:bg-[#F5F0E8] dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
                        )}
                      >
                        {getCategoryDisplayName(cat.name, localeKey, cat.nameEn)}
                      </button>
                    );
                  })}
                  {hasMoreCategories && (
                    <button
                      type="button"
                      onClick={() => setCategoriesExpanded((e) => !e)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-all",
                        "border-[#D4C9B0] dark:border-stone-700",
                        "bg-[#FDFAF4] text-[#3D3020] hover:bg-[#F5F0E8] dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
                      )}
                      aria-expanded={categoriesExpanded}
                      aria-label={
                        categoriesExpanded
                          ? t("transactions.new.categoryShowLess")
                          : t("transactions.new.categoryShowMore")
                      }
                    >
                      {categoriesExpanded
                        ? t("transactions.new.categoryShowLess")
                        : t("transactions.new.categoryShowMore")}
                    </button>
                  )}
                </div>
              </div>
            ))}

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
              className="w-full rounded-md border border-[#D4C9B0] px-3 py-2 text-sm text-[#3D3020] focus:border-[#5C6B52] focus:outline-none focus:ring-1 focus:ring-[#5C6B52] dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            />
          </div>

                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </>
            )}
          </DialogBody>
          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={pending || loadState === "loading" || formDataLoading}>
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
