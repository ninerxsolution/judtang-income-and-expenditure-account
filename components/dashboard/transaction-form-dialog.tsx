"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Search, ChevronLeft, ChevronRight, Check } from "lucide-react";
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
import { AccountCombobox, AccountIcon, type AccountOption } from "@/components/dashboard/account-combobox";
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
  sortAccountsByRecent,
} from "@/lib/recent-financial-accounts";
import {
  getRecentCategoryIds,
  saveRecentCategoryId,
  sortCategoriesByRecent,
} from "@/lib/recent-categories";

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

const INITIAL_CATEGORY_COUNT = 3;

type CategoryItem = { id: string; name: string; nameEn?: string | null };

type TransactionFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId?: string | null;
  initialDate?: string | null;
  initialType?: "INCOME" | "EXPENSE" | "TRANSFER";
  onSuccess?: () => void;
};

function AccountSelectorButton({
  label,
  account,
  onClick,
  disabled,
  defaultLabel,
}: {
  label: string;
  account?: { id: string; name: string; type: string; bankName?: string | null; cardNetwork?: string | null; isDefault: boolean } | null;
  onClick: () => void;
  disabled?: boolean;
  defaultLabel?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-md border border-[#D4C9B0] px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 transition-all text-left"
      >
        {account ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <AccountIcon account={account} size="sm" />
            <span className="font-medium text-[#3D3020] dark:text-stone-200 truncate">
              {account.name}
              {account.isDefault && defaultLabel ? ` (${defaultLabel})` : ""}
            </span>
          </div>
        ) : (
          <span className="text-[#6B5E4E] dark:text-stone-400">เลือกบัญชี...</span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-[#6B5E4E] dark:text-stone-400" />
      </button>
    </div>
  );
}

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

  const [currentView, setCurrentView] = useState<"form" | "select-from" | "select-to">("form");
  const [searchTerm, setSearchTerm] = useState("");

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
  /** Bumps after open / chip select so sortedCategories re-reads localStorage MRU. */
  const [categoryMruTick, setCategoryMruTick] = useState(0);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  const categoryRecentIds = useMemo(
    () => getRecentCategoryIds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-snapshot MRU after open or chip select
    [categories, categoryMruTick],
  );

  const sortedCategories = useMemo(
    () => sortCategoriesByRecent(categories, categoryRecentIds),
    [categories, categoryRecentIds],
  );

  const visibleCategories = categoriesExpanded
    ? sortedCategories
    : sortedCategories.slice(0, INITIAL_CATEGORY_COUNT);
  const hasMoreCategories = sortedCategories.length > INITIAL_CATEGORY_COUNT;

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      setCategoryMruTick((t) => t + 1);
    }
    if (!open) {
      setCategoriesExpanded(false);
      setCurrentView("form");
      setSearchTerm("");
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

  const renderSelectionView = (view: "select-from" | "select-to") => {
    const isFrom = view === "select-from";
    const selectedValue = isFrom ? financialAccountId : transferAccountId;
    
    let filtered = accounts.filter((acc) => {
      // Exclude credit cards if transfer
      if (type === "TRANSFER" && acc.type === "CREDIT_CARD") return false;
      // If selecting "to", exclude the "from" account
      if (!isFrom && acc.id === financialAccountId) return false;
      // Search
      if (searchTerm && !acc.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const recentIds = getRecentFinancialAccountIds();
    const sortedAccounts = sortAccountsByRecent(filtered, recentIds);

    return (
      <div className="absolute inset-0 z-10 flex flex-col w-full bg-[#FDFAF4] dark:bg-stone-950 animate-in slide-in-from-right-8 duration-200">
        <div className="flex items-center px-4 py-4 border-b border-[#D4C9B0] dark:border-stone-700 shrink-0 bg-[#FDFAF4] dark:bg-stone-950">
          <button 
            type="button"
            onClick={() => {
              setCurrentView("form");
              setSearchTerm("");
            }}
            className="p-2 -ml-2 text-[#6B5E4E] hover:text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-400 dark:hover:bg-stone-800 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-bold text-[#3D3020] dark:text-stone-100 ml-2">
            {isFrom ? (type === "INCOME" ? t("transactions.new.accountLabel") : t("transactions.new.fromAccount")) : t("transactions.new.toAccount")}
          </h2>
        </div>

        <div className="p-4 border-b border-[#D4C9B0] dark:border-stone-700 shrink-0 bg-[#FDFAF4] dark:bg-stone-950">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-5 h-5 text-stone-400" />
            <input
              type="text"
              placeholder={t("accounts.bankSearchPlaceholder") || "ค้นหาบัญชี..."}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#D4C9B0] rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all dark:bg-stone-900 dark:border-stone-600 dark:text-stone-100 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 bg-[#FDFAF4] dark:bg-stone-950">
          {sortedAccounts.length > 0 ? (
            <ul className="space-y-1">
              {sortedAccounts.map((account) => {
                const isSelected = selectedValue === account.id;
                
                return (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => {
                        if (isFrom) {
                          setFinancialAccountId(account.id);
                        } else {
                          setTransferAccountId(account.id);
                        }
                        saveRecentFinancialAccountId(account.id);
                        setCurrentView("form");
                        setSearchTerm("");
                      }}
                      className={cn(
                        "w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border",
                        isSelected 
                          ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900" 
                          : "border-transparent hover:bg-[#F5F0E8] dark:hover:bg-stone-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <AccountIcon account={account} size="md" />
                        <span className={cn("font-medium", isSelected ? "text-emerald-800 dark:text-emerald-300" : "text-[#3D3020] dark:text-stone-200")}>
                          {account.name}
                          {account.isDefault ? ` (${t("accounts.default")})` : ""}
                        </span>
                      </div>
                      {isSelected && <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-10 text-stone-500 text-sm">
              {t("accounts.bankNoResults") || "ไม่พบบัญชีที่ค้นหา"}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        <DialogTitle className="sr-only">
          {isEdit
            ? t("transactions.edit.title")
            : t("dashboard.pageTitle.transactionsNew")}
        </DialogTitle>

        <DialogHeader className={cn("shrink-0", currentView !== "form" && "invisible pointer-events-none")}>
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            {isEdit
              ? t("transactions.edit.title")
              : t("dashboard.pageTitle.transactionsNew")}
          </h2>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className={cn("flex flex-1 flex-col min-h-0 overflow-hidden", currentView !== "form" && "invisible pointer-events-none")}
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
              <AccountSelectorButton
                label={t("transactions.new.fromAccount")}
                account={accounts.find((a) => a.id === financialAccountId)}
                onClick={() => setCurrentView("select-from")}
                defaultLabel={t("accounts.default")}
              />
              <AccountSelectorButton
                label={t("transactions.new.toAccount")}
                account={accounts.find((a) => a.id === transferAccountId)}
                onClick={() => setCurrentView("select-to")}
                defaultLabel={t("accounts.default")}
              />
            </>
          ) : (
            <AccountSelectorButton
              label={t("transactions.new.accountLabel")}
              account={accounts.find((a) => a.id === financialAccountId)}
              onClick={() => setCurrentView("select-from")}
              defaultLabel={t("accounts.default")}
            />
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
                            saveRecentCategoryId(cat.id);
                            setCategoryMruTick((t) => t + 1);
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
        {currentView !== "form" && renderSelectionView(currentView)}
      </DialogContent>
    </Dialog>
  );
}
