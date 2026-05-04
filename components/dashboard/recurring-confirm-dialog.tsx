"use client";

import { useState, useEffect } from "react";
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
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  AccountSelectorTrigger,
  AccountSlidePickerPanel,
} from "@/components/dashboard/account-slide-picker";
import {
  RecurringLinkPickerTrigger,
  RecurringLinkSlidePickerPanel,
  type RecurringLinkCandidateRow,
} from "@/components/dashboard/recurring-link-slide-picker";
import { useI18n } from "@/hooks/use-i18n";
import type { AccountOption } from "@/components/dashboard/account-combobox";
import { saveRecentFinancialAccountId } from "@/lib/recent-financial-accounts";
import { formatAmount } from "@/lib/format";

type RecurringItem = {
  id: string;
  name: string;
  amount: number | string;
  financialAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
};

type LinkCandidate = RecurringLinkCandidateRow;

type ConfirmMode = "create" | "link";

type RecurringConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: RecurringItem | null;
  defaultDate?: string;
  dueYear: number;
  dueMonth: number;
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

function occurredAtToDateString(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayString();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RecurringConfirmDialog({
  open,
  onOpenChange,
  item,
  defaultDate,
  dueYear,
  dueMonth,
  onSuccess,
}: RecurringConfirmDialogProps) {
  const { t, language } = useI18n();
  const r = t.recurring;

  const [mode, setMode] = useState<ConfirmMode>("create");
  const [amount, setAmount] = useState("");
  const [occurredAt, setOccurredAt] = useState(defaultDate ?? todayString());
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [note, setNote] = useState("");
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountPickerOpen, setAccountPickerOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkTransactionId, setLinkTransactionId] = useState<string>("");
  const [linkedRowPreview, setLinkedRowPreview] = useState<LinkCandidate | null>(null);

  const overlayChromeOpen = accountPickerOpen || linkPickerOpen;

  useEffect(() => {
    if (!open || !item) {
      setAccountPickerOpen(false);
      setLinkPickerOpen(false);
      return;
    }

    setMode("create");
    setAmount(String(item.amount ?? ""));
    setFinancialAccountId(item.financialAccountId ?? "");
    setNote(item.note ?? "");
    setOccurredAt(defaultDate ?? todayString());
    setError(null);
    setLinkTransactionId("");
    setLinkedRowPreview(null);

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

  function applyCandidate(c: LinkCandidate) {
    setLinkTransactionId(c.id);
    setLinkedRowPreview(c);
    const amtRaw = c.amount;
    const amtNum =
      typeof amtRaw === "object" && amtRaw != null && "toNumber" in amtRaw
        ? (amtRaw as { toNumber: () => number }).toNumber()
        : Number(amtRaw);
    setAmount(Number.isFinite(amtNum) ? String(amtNum) : "");
    setOccurredAt(occurredAtToDateString(c.occurredAt));
    if (c.financialAccountId) setFinancialAccountId(c.financialAccountId);
    setNote(c.note ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    if (mode === "link" && !linkTransactionId) {
      setError(r.confirmDialog.linkPickRequired);
      return;
    }
    setError(null);
    setPending(true);

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
      now.getMilliseconds(),
    ).toISOString();

    try {
      const res = await fetch(`/api/recurring-transactions/${item.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dueYear,
          dueMonth,
          amount: parseFloat(amount),
          occurredAt: occurredAtValue,
          financialAccountId,
          categoryId: item.categoryId ?? null,
          note: note.trim() || null,
          linkTransactionId: mode === "link" ? linkTransactionId : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? r.confirmError);
        return;
      }

      if (financialAccountId) {
        saveRecentFinancialAccountId(financialAccountId);
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

  const dateLocale = language === "th" ? "th-TH" : "en-US";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
          "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none",
        )}
      >
        <div className="relative flex min-h-0 flex-1 flex-col overflow-visible">
          <DialogHeader
            className={cn(
              "shrink-0",
              overlayChromeOpen && "pointer-events-none invisible",
            )}
          >
            <DialogTitle className="flex items-center gap-2">{r.confirmDialog.title}</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={handleSubmit}
            className={cn(
              "flex flex-1 flex-col min-h-0 overflow-hidden",
              overlayChromeOpen && "pointer-events-none invisible",
            )}
          >
            <DialogBody className="space-y-4 pb-2">
              <p className="text-sm text-muted-foreground">
                {r.confirmDialog.description.replace("{name}", item.name)}
              </p>

              <div className="flex gap-2 rounded-lg border border-border p-1">
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === "create"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    setMode("create");
                    setError(null);
                    setLinkPickerOpen(false);
                    setLinkTransactionId("");
                    setLinkedRowPreview(null);
                    setAmount(String(item.amount ?? ""));
                    setFinancialAccountId(item.financialAccountId ?? "");
                    setNote(item.note ?? "");
                    setOccurredAt(defaultDate ?? todayString());
                  }}
                >
                  {r.confirmDialog.modeCreate}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    mode === "link"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                  onClick={() => {
                    setMode("link");
                    setError(null);
                  }}
                >
                  {r.confirmDialog.modeLink}
                </button>
              </div>

              {mode === "link" && (
                <RecurringLinkPickerTrigger
                  label={r.confirmDialog.linkPickLabel}
                  summary={
                    linkedRowPreview
                      ? (() => {
                          const amt = formatAmount(linkedRowPreview.amount);
                          const d = new Date(linkedRowPreview.occurredAt);
                          const dateLabel = Number.isNaN(d.getTime())
                            ? linkedRowPreview.occurredAt
                            : d.toLocaleDateString(dateLocale, {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              });
                          const acct = linkedRowPreview.financialAccount?.name ?? "—";
                          return `${dateLabel} · ${linkedRowPreview.currency} ${amt} · ${acct}`;
                        })()
                      : null
                  }
                  placeholder={r.confirmDialog.linkPlaceholder}
                  onClick={() => {
                    setLinkPickerOpen(true);
                    setAccountPickerOpen(false);
                    setError(null);
                  }}
                />
              )}

              <div className="space-y-1.5">
                <Label htmlFor="confirm-date">{r.confirmDialog.date}</Label>
                <div>
                  <DatePicker
                    id="confirm-date"
                    label={r.confirmDialog.date}
                    value={occurredAt}
                    onChange={setOccurredAt}
                    required
                    variant="inline"
                  />
                </div>
              </div>

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

              <AccountSelectorTrigger
                label={r.confirmDialog.account}
                account={accounts.find((a) => a.id === financialAccountId)}
                onClick={() => {
                  setAccountPickerOpen(true);
                  setLinkPickerOpen(false);
                }}
                defaultLabel={t("accounts.default")}
                selectPlaceholder={t("accounts.selectAccountPlaceholder")}
              />

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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t.common.actions.cancel}
              </Button>
              <Button type="submit" className="bg-emerald-500 hover:bg-emerald-600" disabled={pending}>
                {pending ? "…" : r.confirmDialog.confirmButton}
              </Button>
            </DialogFooter>
          </form>
          {linkPickerOpen ? (
            <RecurringLinkSlidePickerPanel
              recurringId={item.id}
              dueYear={dueYear}
              dueMonth={dueMonth}
              selectedId={linkTransactionId}
              displayLocale={dateLocale}
              onSelect={(row) => {
                applyCandidate(row);
                setLinkPickerOpen(false);
                setError(null);
              }}
              onBack={() => setLinkPickerOpen(false)}
              title={r.confirmDialog.linkPickerTitle}
              searchPlaceholder={r.confirmDialog.linkSearchPlaceholder}
              filterDateAriaLabel={r.confirmDialog.linkFilterDateAria}
              clearDateAriaLabel={r.confirmDialog.linkClearDateAria}
              filterDateHint={r.confirmDialog.linkFilterDateHint}
              loadingText={r.confirmDialog.linkLoading}
              noResultsText={r.confirmDialog.linkNoCandidates}
            />
          ) : null}
          {accountPickerOpen ? (
            <AccountSlidePickerPanel
              accounts={accounts}
              selectedId={financialAccountId}
              onSelect={(id) => {
                setFinancialAccountId(id);
                setAccountPickerOpen(false);
              }}
              onBack={() => setAccountPickerOpen(false)}
              title={r.confirmDialog.account}
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
