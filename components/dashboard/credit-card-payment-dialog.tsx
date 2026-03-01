"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { DatePicker } from "@/components/ui/date-picker";
import { useI18n } from "@/hooks/use-i18n";
import { getBankDisplayName } from "@/lib/thai-banks";

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

/** Round to 2 decimal places to avoid floating point display issues (e.g. 0.5100000000093132 → "0.51") */
function roundAmountForDisplay(n: number): string {
  return Number.isFinite(n) ? n.toFixed(2) : "";
}

function formatTodayAsInputDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

type CreditCardPaymentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  accountName: string;
  maxAmount?: number;
  onSuccess?: () => void;
};

export function CreditCardPaymentDialog({
  open,
  onOpenChange,
  accountId,
  accountName,
  maxAmount,
  onSuccess,
}: CreditCardPaymentDialogProps) {
  const { t, locale } = useI18n();
  const localeKey = locale?.startsWith("th") ? "th" : "en";
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(formatTodayAsInputDate());
  const [fromAccountId, setFromAccountId] = useState("");
  const [accounts, setAccounts] = useState<
    { id: string; name: string; bankName?: string | null; accountNumberMasked?: string }[]
  >([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setOccurredAt(formatTodayAsInputDate());
    setError(null);
    fetch("/api/financial-accounts")
      .then((r) => (r.ok ? r.json() : []))
      .then(
        (data: {
          id: string;
          name: string;
          type: string;
          bankName?: string | null;
          accountNumberMasked?: string;
          isIncomplete?: boolean;
        }[]) => {
          const nonCreditCard = Array.isArray(data)
            ? data.filter(
                (a) =>
                  a.type !== "CREDIT_CARD" &&
                  a.id !== accountId &&
                  !a.isIncomplete
              )
            : [];
          setAccounts(
            nonCreditCard.map((a) => ({
              id: a.id,
              name: a.name,
              bankName: a.bankName ?? null,
              accountNumberMasked: a.accountNumberMasked ?? "",
            }))
          );
          setFromAccountId(nonCreditCard[0]?.id ?? "");
        }
      );
  }, [open, accountId]);

  const amountNum = Number.parseFloat(amount.replace(/,/g, ""));
  const amountValid = Number.isFinite(amountNum) && amountNum > 0;
  const amountExceedsMax = maxAmount != null && amountNum > maxAmount;

  function handleAmountChange(value: string) {
    const sanitized = sanitizeAmountInput(value);
    if (maxAmount != null && sanitized) {
      const parsed = Number.parseFloat(sanitized);
      if (Number.isFinite(parsed) && parsed > maxAmount) {
        setAmount(roundAmountForDisplay(maxAmount));
        return;
      }
    }
    setAmount(sanitized);
  }

  function handlePayFull() {
    if (maxAmount != null && maxAmount > 0) {
      setAmount(roundAmountForDisplay(maxAmount));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!amountValid) {
      setError(t("transactions.new.amountInvalid"));
      return;
    }
    if (amountExceedsMax) {
      setError(
        t("accounts.paymentExceedsOutstanding") ??
          "Payment cannot exceed outstanding balance"
      );
      return;
    }

    setPending(true);
    try {
      const res = await fetch(`/api/credit-card/${accountId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          occurredAt: occurredAt || formatTodayAsInputDate(),
          fromAccountId: fromAccountId || undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("common.errors.generic"));
        return;
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(t("common.errors.generic"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("accounts.paymentDialogTitle")}</DialogTitle>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{accountName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField
            id="payment-amount"
            label={t("accounts.paymentAmountLabel")}
            type="text"
            value={amount}
            onChange={handleAmountChange}
            required
            inputMode="decimal"
          />
          {maxAmount != null && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("accounts.currentOutstanding")}:{" "}
                {Number(roundAmountForDisplay(maxAmount)).toLocaleString()}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePayFull}
                disabled={maxAmount <= 0}
              >
                {t("accounts.payFullAmount")}
              </Button>
            </div>
          )}
          <DatePicker
            id="payment-date"
            label={t("accounts.paymentDateLabel")}
            value={occurredAt}
            onChange={setOccurredAt}
            required
          />
          {accounts.length > 0 && (
            <div>
              <label htmlFor="payment-from-account" className="mb-1 block text-sm font-medium">
                {t("accounts.paymentFromAccountLabel")}
              </label>
              <select
                id="payment-from-account"
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">—</option>
                {accounts.map((acc) => {
                  const bankLabel =
                    getBankDisplayName(acc.bankName ?? undefined, localeKey) ?? acc.bankName ?? "";
                  const suffix = [bankLabel, acc.accountNumberMasked].filter(Boolean).join(" · ");
                  return (
                    <option key={acc.id} value={acc.id}>
                      {suffix ? `${acc.name} (${suffix})` : acc.name}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
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
            <Button type="submit" disabled={pending || !amountValid || amountExceedsMax}>
              {pending ? t("common.actions.save") : t("accounts.paymentSubmit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
