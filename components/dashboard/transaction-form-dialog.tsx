"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CircleHelp,
} from "lucide-react";
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
import {
  AccountSelectorTrigger,
  AccountSlidePickerPanel,
} from "@/components/dashboard/account-slide-picker";
import { cn } from "@/lib/utils";
import { MAX_NOTE_LENGTH } from "@/lib/validation";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { Skeleton } from "@/components/ui/skeleton";
import { getRecentFinancialAccountIds, pickPreferredAccountId, saveRecentFinancialAccountId } from "@/lib/recent-financial-accounts";
import { saveRecentCategoryId } from "@/lib/recent-categories";
import { CategoryCapsulePicker } from "@/components/dashboard/category-capsule-picker";
import { getCurrencyInputSymbol } from "@/lib/currency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function sanitizeRateInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 8) : "";
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

type CategoryItem = { id: string; name: string; nameEn?: string | null };

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

  const [currentView, setCurrentView] = useState<"form" | "select-from" | "select-to">("form");

  const [accounts, setAccounts] = useState<
    {
      id: string;
      name: string;
      isDefault: boolean;
      type: string;
      currency: string;
      bankName?: string | null;
      cardNetwork?: string | null;
    }[]
  >([]);
  const [transferToAmount, setTransferToAmount] = useState("");
  const [crossCurrencyBankRate, setCrossCurrencyBankRate] = useState("");
  const [thbPerFrom, setThbPerFrom] = useState(1);
  const [thbPerTo, setThbPerTo] = useState(1);
  const [transferGroupIdEdit, setTransferGroupIdEdit] = useState<string | null>(null);
  const [suggestedThbPerUnit, setSuggestedThbPerUnit] = useState<number | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [status, setStatus] = useState<"PENDING" | "POSTED">("POSTED");
  const [formDataLoading, setFormDataLoading] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) {
      setCurrentView("form");
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

  const accountsForFromPicker = useMemo(() => {
    if (type === "TRANSFER") {
      return accounts.filter((a) => a.type !== "CREDIT_CARD");
    }
    return accounts;
  }, [accounts, type]);

  const accountsForToPicker = useMemo(
    () => accounts.filter((a) => a.type !== "CREDIT_CARD" && a.id !== financialAccountId),
    [accounts, financialAccountId],
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

  const fromAccountCurrency = useMemo(() => {
    const a = accounts.find((x) => x.id === financialAccountId);
    return a?.currency ?? "THB";
  }, [accounts, financialAccountId]);

  const toAccountCurrency = useMemo(() => {
    const a = accounts.find((x) => x.id === transferAccountId);
    return a?.currency ?? "THB";
  }, [accounts, transferAccountId]);

  const isCrossCurrencyTransfer = useMemo(
    () =>
      type === "TRANSFER" &&
      Boolean(financialAccountId) &&
      Boolean(transferAccountId) &&
      fromAccountCurrency !== toAccountCurrency,
    [
      type,
      financialAccountId,
      transferAccountId,
      fromAccountCurrency,
      toAccountCurrency,
    ],
  );

  const crossCurrencyForeignCode = useMemo(() => {
    if (fromAccountCurrency !== "THB") return fromAccountCurrency;
    if (toAccountCurrency !== "THB") return toAccountCurrency;
    return "USD";
  }, [fromAccountCurrency, toAccountCurrency]);

  const crossCurrencyBankRateError = useMemo(() => {
    if (!crossCurrencyBankRate.trim()) return null;
    const v = Number.parseFloat(crossCurrencyBankRate);
    if (!Number.isFinite(v) || v <= 0) {
      return t("transactions.new.amountInvalid");
    }
    return null;
  }, [crossCurrencyBankRate, t]);

  /** THB→foreign with valid bank rate: debit THB is computed; main amount field optional. */
  const skipThbSourceAmountRequired = useMemo(() => {
    if (type !== "TRANSFER" || !isCrossCurrencyTransfer) return false;
    if (fromAccountCurrency !== "THB" || toAccountCurrency === "THB") return false;
    const r = Number.parseFloat(crossCurrencyBankRate);
    return (
      Number.isFinite(r) &&
      r > 0 &&
      crossCurrencyBankRateError == null &&
      crossCurrencyBankRate.trim() !== ""
    );
  }, [
    crossCurrencyBankRate,
    crossCurrencyBankRateError,
    fromAccountCurrency,
    isCrossCurrencyTransfer,
    toAccountCurrency,
    type,
  ]);

  /** Foreign→THB with valid bank rate: credit THB is computed; destination amount optional. */
  const skipThbDestinationAmountRequired = useMemo(() => {
    if (type !== "TRANSFER" || !isCrossCurrencyTransfer) return false;
    if (fromAccountCurrency === "THB" || toAccountCurrency !== "THB") return false;
    const r = Number.parseFloat(crossCurrencyBankRate);
    return (
      Number.isFinite(r) &&
      r > 0 &&
      crossCurrencyBankRateError == null &&
      crossCurrencyBankRate.trim() !== ""
    );
  }, [
    crossCurrencyBankRate,
    crossCurrencyBankRateError,
    fromAccountCurrency,
    isCrossCurrencyTransfer,
    toAccountCurrency,
    type,
  ]);

  const crossCurrencyRatePreview = useMemo(() => {
    if (!isCrossCurrencyTransfer || crossCurrencyBankRateError) return null;
    const r = Number.parseFloat(crossCurrencyBankRate);
    if (!Number.isFinite(r) || r <= 0) return null;
    const fromVal = Number.parseFloat(amount);
    const toVal = Number.parseFloat(transferToAmount);
    const fmt = (n: number) =>
      new Intl.NumberFormat(localeKey === "th" ? "th-TH" : "en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    if (fromAccountCurrency === "THB" && toAccountCurrency !== "THB") {
      if (!Number.isFinite(toVal) || toVal <= 0) return null;
      const debitThb = Math.round(toVal * r * 100) / 100;
      return t("transactions.new.crossCurrencyPreviewDebitThb", {
        amount: fmt(debitThb),
      });
    }
    if (fromAccountCurrency !== "THB" && toAccountCurrency === "THB") {
      if (!Number.isFinite(fromVal) || fromVal <= 0) return null;
      const creditThb = Math.round(fromVal * r * 100) / 100;
      return t("transactions.new.crossCurrencyPreviewCreditThb", {
        amount: fmt(creditThb),
      });
    }
    return null;
  }, [
    amount,
    crossCurrencyBankRate,
    crossCurrencyBankRateError,
    fromAccountCurrency,
    isCrossCurrencyTransfer,
    localeKey,
    t,
    toAccountCurrency,
    transferToAmount,
  ]);

  const transferToAmountError = useMemo(() => {
    if (!transferToAmount.trim()) return null;
    const v = Number.parseFloat(transferToAmount);
    if (!Number.isFinite(v) || v <= 0) return t("transactions.new.amountInvalid");
    return null;
  }, [transferToAmount, t]);

  useEffect(() => {
    if (!isCrossCurrencyTransfer) {
      setTransferToAmount("");
      setCrossCurrencyBankRate("");
    }
  }, [isCrossCurrencyTransfer]);

  useEffect(() => {
    if (!open || type === "TRANSFER" || !financialAccountId) {
      setSuggestedThbPerUnit(null);
      return;
    }
    if (fromAccountCurrency === "THB") {
      setSuggestedThbPerUnit(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/fx/suggest?currency=${encodeURIComponent(fromAccountCurrency)}`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((d: { thbPerUnit?: number }) => {
        if (
          !cancelled &&
          typeof d.thbPerUnit === "number" &&
          Number.isFinite(d.thbPerUnit) &&
          d.thbPerUnit > 0
        ) {
          setSuggestedThbPerUnit(d.thbPerUnit);
        }
      })
      .catch(() => {
        if (!cancelled) setSuggestedThbPerUnit(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, type, financialAccountId, fromAccountCurrency]);

  useEffect(() => {
    if (!open || !isCrossCurrencyTransfer || !financialAccountId || !transferAccountId) {
      setThbPerFrom(1);
      setThbPerTo(1);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetch(`/api/fx/suggest?currency=${encodeURIComponent(fromAccountCurrency)}`).then((r) =>
        r.ok ? r.json() : {},
      ),
      fetch(`/api/fx/suggest?currency=${encodeURIComponent(toAccountCurrency)}`).then((r) =>
        r.ok ? r.json() : {},
      ),
    ])
      .then(([a, b]: [{ thbPerUnit?: number }, { thbPerUnit?: number }]) => {
        if (cancelled) return;
        setThbPerFrom(
          typeof a.thbPerUnit === "number" && a.thbPerUnit > 0 ? a.thbPerUnit : 1,
        );
        setThbPerTo(typeof b.thbPerUnit === "number" && b.thbPerUnit > 0 ? b.thbPerUnit : 1);
      })
      .catch(() => {
        if (!cancelled) {
          setThbPerFrom(1);
          setThbPerTo(1);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    open,
    isCrossCurrencyTransfer,
    financialAccountId,
    transferAccountId,
    fromAccountCurrency,
    toAccountCurrency,
  ]);

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
      setTransferToAmount("");
      setCrossCurrencyBankRate("");
      setTransferGroupIdEdit(null);
      setSuggestedThbPerUnit(null);
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
                transferGroupId?: string | null;
              }
            | undefined,
        ) => {
          if (cancelled || !data) return;
          setTransferGroupIdEdit(
            typeof data.transferGroupId === "string" && data.transferGroupId.trim() !== ""
              ? data.transferGroupId
              : null,
          );
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
              currency?: string;
              bankName?: string | null;
              cardNetwork?: string | null;
            }) => ({
              id: a.id,
              name: a.name,
              isDefault: a.isDefault ?? false,
              type: a.type ?? "CASH",
              currency:
                String(a.currency ?? "THB")
                  .trim()
                  .toUpperCase() === "USD"
                  ? "USD"
                  : "THB",
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

    const structuralLocked = Boolean(editId && transferGroupIdEdit);

    if (!type) {
      setError(t("transactions.new.typeRequired"));
      return;
    }

    if (!structuralLocked) {
      const earlyFromA = accounts.find((a) => a.id === financialAccountId);
      const earlyToA = accounts.find((a) => a.id === transferAccountId);
      const earlyCF = earlyFromA?.currency ?? "THB";
      const earlyCT = earlyToA?.currency ?? "THB";
      const earlyCross = type === "TRANSFER" && earlyCF !== earlyCT;
      const earlyBankParsed = crossCurrencyBankRate.trim()
        ? Number.parseFloat(crossCurrencyBankRate)
        : NaN;
      const earlyHasBank =
        Number.isFinite(earlyBankParsed) && earlyBankParsed > 0;

      if (earlyCross && earlyHasBank) {
        if (crossCurrencyBankRateError) {
          setError(crossCurrencyBankRateError);
          return;
        }
        if (earlyCF === "THB" && earlyCT !== "THB") {
          if (!transferToAmount.trim() || transferToAmountError) {
            setError(
              transferToAmountError ?? t("transactions.new.amountRequired"),
            );
            return;
          }
        } else if (earlyCF !== "THB" && earlyCT === "THB") {
          if (!amount.trim() || amountError) {
            setError(amountError ?? t("transactions.new.amountRequired"));
            return;
          }
        } else if (!amount.trim() || amountError) {
          setError(amountError ?? t("transactions.new.amountRequired"));
          return;
        }
      } else if (!amount || amountError) {
        setError(amountError ?? t("transactions.new.amountRequired"));
        return;
      }
    }

    if (!occurredAt) {
      setError(t("transactions.new.dateRequired"));
      return;
    }

    if (!structuralLocked && type === "TRANSFER") {
      if (!transferAccountId) {
        setError(t("transactions.new.transferToAccountRequired"));
        return;
      }
      if (transferAccountId === financialAccountId) {
        setError(t("transactions.new.transferAccountsSame"));
        return;
      }
      const fromA = accounts.find((a) => a.id === financialAccountId);
      const toA = accounts.find((a) => a.id === transferAccountId);
      const cFrom = fromA?.currency ?? "THB";
      const cTo = toA?.currency ?? "THB";
      if (cFrom !== cTo) {
        const bankChk = crossCurrencyBankRate.trim()
          ? Number.parseFloat(crossCurrencyBankRate)
          : NaN;
        const hasBankChk = Number.isFinite(bankChk) && bankChk > 0;
        const toAmountOptional =
          cFrom !== "THB" && cTo === "THB" && hasBankChk;
        if (!toAmountOptional) {
          if (!transferToAmount.trim() || transferToAmountError) {
            setError(
              transferToAmountError ?? t("transactions.new.amountRequired"),
            );
            return;
          }
        }
      }
    }

    const value = Number.parseFloat(amount);
    const selectedAccount = accounts.find((a) => a.id === financialAccountId);
    const isCreditCard = selectedAccount?.type === "CREDIT_CARD";

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
            now.getMilliseconds(),
          );
          return combined.toISOString();
        })()
      : undefined;

    const fromA = accounts.find((a) => a.id === financialAccountId);
    const toA = accounts.find((a) => a.id === transferAccountId);
    const curFrom = fromA?.currency ?? "THB";
    const curTo = toA?.currency ?? "THB";
    const submitIsCrossTransfer = type === "TRANSFER" && curFrom !== curTo;

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
    if (
      type !== "TRANSFER" &&
      suggestedThbPerUnit != null &&
      suggestedThbPerUnit > 0 &&
      curFrom !== "THB"
    ) {
      body.exchangeRateThbPerUnit = suggestedThbPerUnit;
    }

    setPending(true);
    try {
      if (editId && structuralLocked) {
        const pairBody: Record<string, unknown> = {
          note: note.trim() || undefined,
          occurredAt: occurredAtValue,
        };
        const res = await fetch(`/api/transactions/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(pairBody),
        });
        const pdata = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(pdata.error ?? t("transactions.new.saveFailed"));
          return;
        }
        onOpenChange(false);
        onSuccess?.();
        return;
      }

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
      } else if (type === "TRANSFER" && submitIsCrossTransfer) {
        const toVal = Number.parseFloat(transferToAmount);
        const bankParsed = crossCurrencyBankRate.trim()
          ? Number.parseFloat(crossCurrencyBankRate)
          : NaN;
        const hasBankRate =
          Number.isFinite(bankParsed) &&
          bankParsed > 0 &&
          !crossCurrencyBankRateError;

        let crossFromAmt = value;
        let crossToAmt = toVal;
        if (hasBankRate && curFrom === "THB" && curTo !== "THB") {
          crossFromAmt = Math.round(toVal * bankParsed * 100) / 100;
        } else if (hasBankRate && curFrom !== "THB" && curTo === "THB") {
          crossToAmt = Math.round(value * bankParsed * 100) / 100;
        }

        const payload: Record<string, unknown> = {
          fromAccountId: financialAccountId,
          toAccountId: transferAccountId,
          fromAmount: crossFromAmt,
          toAmount: crossToAmt,
          occurredAt: occurredAtValue,
          note: note.trim() || undefined,
        };
        if (hasBankRate) {
          payload.bankRateThbPerForeignUnit = bankParsed;
        }

        const res = await fetch("/api/transactions/cross-currency-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? t("transactions.new.saveFailed"));
          return;
        }
        if (financialAccountId) {
          saveRecentFinancialAccountId(financialAccountId);
        }
        if (transferAccountId) {
          saveRecentFinancialAccountId(transferAccountId);
        }
        setAmount("");
        setTransferToAmount("");
        setCrossCurrencyBankRate("");
        setCategoryId("");
        setCategory("");
        setTransferAccountId("");
        setNote("");
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
        setTransferToAmount("");
        setCrossCurrencyBankRate("");
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
  const structuralLocked = Boolean(editId && transferGroupIdEdit);

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

        <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
        <DialogHeader className={cn("shrink-0", currentView !== "form" && "invisible pointer-events-none")}>
          <h2 className="text-lg font-semibold leading-snug tracking-tight px-4 py-0.5">
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
                {structuralLocked ? (
                  <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                    {t("transactions.new.crossCurrencyPairEditHint")}
                  </p>
                ) : null}
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
                disabled={structuralLocked}
                onClick={() => setType("INCOME")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 transition-all ${
                  type === "INCOME"
                    ? "bg-emerald-500 text-white"
                    : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                <ArrowDownCircle className="h-4 w-4" />
                {t("transactions.new.income")}
              </button>
              <button
                type="button"
                disabled={structuralLocked}
                onClick={() => setType("EXPENSE")}
                className={`inline-flex items-center gap-1 border-l border-[#D4C9B0] px-3 py-1.5 dark:border-stone-700 transition-all ${
                  type === "EXPENSE"
                    ? "bg-red-500 text-white"
                    : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                } disabled:opacity-50 disabled:pointer-events-none`}
              >
                <ArrowUpCircle className="h-4 w-4" />
                {t("transactions.new.expense")}
              </button>
              <button
                type="button"
                disabled={structuralLocked}
                onClick={() => setType("TRANSFER")}
                className={`inline-flex items-center gap-1 border-l border-[#D4C9B0] px-3 py-1.5 dark:border-stone-700 transition-all ${
                  type === "TRANSFER"
                    ? "bg-blue-500 text-white"
                    : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-300 dark:hover:bg-stone-800"
                } disabled:opacity-50 disabled:pointer-events-none`}
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
              <AccountSelectorTrigger
                label={t("transactions.new.fromAccount")}
                account={accounts.find((a) => a.id === financialAccountId)}
                onClick={() => setCurrentView("select-from")}
                defaultLabel={t("accounts.default")}
                selectPlaceholder={t("accounts.selectAccountPlaceholder")}
                disabled={structuralLocked}
              />
              <AccountSelectorTrigger
                label={t("transactions.new.toAccount")}
                account={accounts.find((a) => a.id === transferAccountId)}
                onClick={() => setCurrentView("select-to")}
                defaultLabel={t("accounts.default")}
                selectPlaceholder={t("accounts.selectAccountPlaceholder")}
                disabled={structuralLocked}
              />
            </>
          ) : (
            <AccountSelectorTrigger
              label={t("transactions.new.accountLabel")}
              account={accounts.find((a) => a.id === financialAccountId)}
              onClick={() => setCurrentView("select-from")}
              defaultLabel={t("accounts.default")}
              selectPlaceholder={t("accounts.selectAccountPlaceholder")}
              disabled={structuralLocked}
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
            label={
              type === "TRANSFER" && isCrossCurrencyTransfer
                ? t("transactions.new.crossCurrencyAmountFrom", {
                    currency: fromAccountCurrency,
                  })
                : t("transactions.new.amountLabel")
            }
            type="text"
            required={!structuralLocked && !skipThbSourceAmountRequired}
            value={amount}
            onChange={(v) => setAmount(sanitizeAmountInput(v))}
            error={amountError}
            inputMode="decimal"
            inputRef={amountInputRef}
            readOnly={structuralLocked}
            inputPrefix={
              financialAccountId
                ? getCurrencyInputSymbol(fromAccountCurrency)
                : getCurrencyInputSymbol("THB")
            }
          />

          {type === "TRANSFER" && isCrossCurrencyTransfer && !structuralLocked ? (
            <TooltipProvider delayDuration={200}>
              <div className="space-y-2 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-3 dark:border-stone-600 dark:bg-stone-900/50">
                <div className="flex items-start gap-1">
                  <p className="min-w-0 flex-1 text-sm font-medium leading-snug text-[#3D3020] dark:text-stone-100">
                    {t("transactions.new.crossCurrencySection")}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:hover:bg-stone-800/80"
                        aria-label={t("transactions.new.crossCurrencyHelpAria")}
                      >
                        <CircleHelp className="h-4 w-4" aria-hidden />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="top"
                      sideOffset={6}
                      className="max-w-[min(20rem,calc(100vw-2.5rem))] space-y-2 p-3 text-left text-xs leading-relaxed font-normal text-balance"
                    >
                      <p>{t("transactions.new.crossCurrencyBankRateHint")}</p>
                      <p>{t("transactions.new.crossCurrencyRatesNote")}</p>
                      <p>{t("transactions.new.crossCurrencyReferenceOnly")}</p>
                      <p className="border-t border-background/20 pt-2 text-[0.7rem] tabular-nums text-background/85">
                        1 {fromAccountCurrency} ≈ {thbPerFrom.toFixed(4)} THB · 1{" "}
                        {toAccountCurrency} ≈ {thbPerTo.toFixed(4)} THB
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormField
                  id="transaction-modal-transfer-to-amount"
                  label={t("transactions.new.crossCurrencyToAmount", {
                    currency: toAccountCurrency,
                  })}
                  type="text"
                  required={!skipThbDestinationAmountRequired}
                  value={transferToAmount}
                  onChange={(v) => setTransferToAmount(sanitizeAmountInput(v))}
                  error={transferToAmountError}
                  inputMode="decimal"
                  inputPrefix={getCurrencyInputSymbol(toAccountCurrency)}
                />
                <FormField
                  id="transaction-modal-cross-bank-rate"
                  label={t("transactions.new.crossCurrencyBankRateLabel", {
                    currency: crossCurrencyForeignCode,
                  })}
                  type="text"
                  required={false}
                  value={crossCurrencyBankRate}
                  onChange={(v) =>
                    setCrossCurrencyBankRate(sanitizeRateInput(v))
                  }
                  error={crossCurrencyBankRateError}
                  inputMode="decimal"
                />
                {crossCurrencyRatePreview ? (
                  <p className="text-xs font-medium tabular-nums text-[#3D3020] dark:text-stone-200">
                    {crossCurrencyRatePreview}
                  </p>
                ) : null}
              </div>
            </TooltipProvider>
          ) : null}

          {type !== "TRANSFER" && !structuralLocked ? (
            <CategoryCapsulePicker
              categories={categories}
              value={categoryId}
              onValueChange={(id) => {
                setCategoryId(id);
                if (!id) {
                  setCategory("");
                  return;
                }
                const cat = categories.find((c) => c.id === id);
                setCategory(
                  cat
                    ? getCategoryDisplayName(cat.name, localeKey, cat.nameEn)
                    : "",
                );
              }}
              localeKey={localeKey}
              loading={formDataLoading}
              dialogOpen={open}
              id="transaction-modal-category"
              ariaLabel={t("transactions.new.categoryLabel")}
              label={t("transactions.new.categoryLabel")}
            />
          ) : null}

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
            <Button
              type="submit"
              className="bg-emerald-500 hover:bg-emerald-600"
              disabled={
                pending ||
                loadState === "loading" ||
                formDataLoading ||
                Boolean(
                  isCrossCurrencyTransfer &&
                    !structuralLocked &&
                    crossCurrencyBankRateError,
                )
              }
            >
              {pending
                ? t("transactions.new.pending")
                : isEdit
                  ? t("transactions.edit.submit")
                  : t("transactions.new.submit")}
            </Button>
          </DialogFooter>
        </form>
        {currentView === "select-from" ? (
          <AccountSlidePickerPanel
            accounts={accountsForFromPicker}
            selectedId={financialAccountId}
            onSelect={(id) => {
              setFinancialAccountId(id);
              setCurrentView("form");
            }}
            onBack={() => setCurrentView("form")}
            title={
              type === "INCOME"
                ? t("transactions.new.accountLabel")
                : t("transactions.new.fromAccount")
            }
            searchPlaceholder={t("accounts.bankSearchPlaceholder")}
            noResultsText={t("accounts.bankNoResults")}
            defaultLabel={t("accounts.default")}
          />
        ) : null}
        {currentView === "select-to" ? (
          <AccountSlidePickerPanel
            accounts={accountsForToPicker}
            selectedId={transferAccountId}
            onSelect={(id) => {
              setTransferAccountId(id);
              setCurrentView("form");
            }}
            onBack={() => setCurrentView("form")}
            title={t("transactions.new.toAccount")}
            searchPlaceholder={t("accounts.bankSearchPlaceholder")}
            noResultsText={t("accounts.bankNoResults")}
            defaultLabel={t("accounts.default")}
          />
        ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
