"use client";

import { useState, useEffect } from "react";
import { CheckCircle2Icon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AccountCombobox } from "@/components/dashboard/account-combobox";
import { useI18n } from "@/hooks/use-i18n";
import type { AccountOption } from "@/components/dashboard/account-combobox";

type RecurringItem = {
  id: string;
  name: string;
  amount: number | string;
  financialAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
};

type RecurringConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RecurringItem | null;
  defaultDate?: string;
  onSuccess?: () => void;
};

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function todayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function RecurringConfirmDialog({
  open,
  onOpenChange,
  item,
  defaultDate,
  onSuccess,
}: RecurringConfirmDialogProps) {
  const { t } = useI18n();
  const r = t.recurring;

  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultDate ?? todayString());
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [note, setNote] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !item) return;

    setAmount(String(item.amount ?? ""));
    setFinancialAccountId(item.financialAccountId ?? "");
    setNote(item.note ?? "");
    setOccurredAt(defaultDate ?? todayString());
    setError(null);

    fetch("/api/financial-accounts")
      .then((r) => r.json())
      .then((data) => {
        const list = (data.accounts ?? data ?? []).filter(
          (a: { isActive: boolean }) => a.isActive,
        );
        setAccounts(list);
        if (!item.financialAccountId) {
          const def = list.find((a: AccountOption) => a.isDefault);
          if (def) setFinancialAccountId(def.id);
        }
      })
      .catch(() => {});
  }, [open, item, defaultDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError(null);
    setPending(true);

    // Combine selected date with current time so occurredAt reflects when user clicked save (not 00:00 UTC = 07:00 Bangkok)
    const dateStr = occurredAt;
    const [y, m, day] = dateStr.split("-").map(Number);
    const now = new Date();
    const occurredAtValue = new Date(
      y,
      m - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
      now.getMilliseconds()
    ).toISOString();

    try {
      const res = await fetch(`/api/recurring-transactions/${item.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          occurredAt: occurredAtValue,
          financialAccountId,
          categoryId: item.categoryId ?? null,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? r.confirmError);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(r.confirmError);
    } finally {
      setPending(false);
    }
  }

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
          "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
        )}
      >
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            {r.confirmDialog.title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0 overflow-hidden">
          <DialogBody className="space-y-4 pb-2">
            <p className="text-sm text-muted-foreground">
              {r.confirmDialog.description.replace("{name}", item.name)}
            </p>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-amount">{r.confirmDialog.amount}</Label>
              <input
                id="confirm-amount"
                type="text"
                inputMode="decimal"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={amount}
                onChange={(e) => setAmount(sanitizeAmountInput(e.target.value))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-date">{r.confirmDialog.date}</Label>
              <input
                id="confirm-date"
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{r.confirmDialog.account}</Label>
              <AccountCombobox
                value={financialAccountId}
                onChange={setFinancialAccountId}
                accounts={accounts}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-note">{r.confirmDialog.note}</Label>
              <input
                id="confirm-note"
                type="text"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </DialogBody>

          <DialogFooter className="shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.common.actions.cancel}
            </Button>
            <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={pending}>
              {pending ? "…" : r.confirmDialog.confirmButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
