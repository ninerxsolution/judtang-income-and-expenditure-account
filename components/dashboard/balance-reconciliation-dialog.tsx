"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import { useIsMobile } from "@/hooks/use-mobile";
import { useVisualViewport } from "@/hooks/use-visual-viewport";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";
import { toast } from "sonner";

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.-]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function formatMoneyLabel(amount: number, currency: string): string {
  const formatted = formatAmount(amount);
  if (currency === "THB") return `฿${formatted}`;
  return `${currency} ${formatted}`;
}

export type BalanceReconciliationDialogAccount = {
  id: string;
  name: string;
  balance: number;
  currency: string;
};

type BalanceReconciliationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BalanceReconciliationDialogAccount | null;
  onSuccess?: () => void;
};

export function BalanceReconciliationDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: BalanceReconciliationDialogProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const viewport = useVisualViewport(open && isMobile);
  const [statedInput, setStatedInput] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (open && account) {
      setStatedInput("");
      setNote("");
    }
  }, [open, account]);

  const currency = account?.currency ?? "THB";
  const appBalance = account?.balance ?? 0;

  const statedParsed = (() => {
    const s = statedInput.replace(/,/g, "").trim();
    if (s === "" || s === "-" || s === "." || s === "-.") return Number.NaN;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
  })();

  const difference = Number.isFinite(statedParsed)
    ? Math.round((statedParsed - appBalance) * 100) / 100
    : Number.NaN;
  const showMismatch = Number.isFinite(difference) && Math.abs(difference) > 0.000_001;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;
    if (!Number.isFinite(statedParsed)) {
      toast.error(t("accounts.reconciliation.statedInvalid"));
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/financial-accounts/${account.id}/reconciliation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          statedBalance: statedParsed,
          note: note.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        errorCode?: string;
      };
      if (!res.ok) {
        if (data.errorCode === "RECONCILIATION_TABLE_MISSING") {
          toast.error(t("accounts.reconciliation.schemaPending"));
        } else if (data.errorCode === "RECONCILIATION_PRISMA_CLIENT_STALE") {
          toast.error(t("accounts.reconciliation.clientStale"));
        } else {
          toast.error(data.error ?? t("accounts.reconciliation.saveFailed"));
        }
        return;
      }
      toast.success(t("accounts.reconciliation.saveSuccess"));
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error(t("accounts.reconciliation.saveFailed"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
          "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none",
        )}
        style={
          isMobile && viewport
            ? { height: `${viewport.height}px`, maxHeight: `${viewport.height}px` }
            : undefined
        }
      >
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("accounts.reconciliation.dialogTitle")}</DialogTitle>
        </DialogHeader>
        {account && (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col min-h-0 overflow-hidden"
          >
            <DialogBody className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {account.name}
              </p>
              <div>
                <Label className="text-muted-foreground">
                  {t("accounts.reconciliation.appBalanceLabel")}
                </Label>
                <p className="mt-1 text-lg font-semibold tabular-nums">
                  {formatMoneyLabel(appBalance, currency)}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recon-stated-balance">
                  {t("accounts.reconciliation.statedBalanceLabel")}
                </Label>
                <input
                  id="recon-stated-balance"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={statedInput}
                  onChange={(e) => setStatedInput(sanitizeAmountInput(e.target.value))}
                  placeholder={t("accounts.reconciliation.statedBalancePlaceholder")}
                  aria-invalid={statedInput.length > 0 && !Number.isFinite(statedParsed)}
                />
              </div>
              {Number.isFinite(difference) && (
                <div>
                  <Label className="text-muted-foreground">
                    {t("accounts.reconciliation.differenceLabel")}
                  </Label>
                  <p
                    className={cn(
                      "mt-1 text-sm font-medium tabular-nums",
                      showMismatch && "text-amber-700 dark:text-amber-400",
                    )}
                  >
                    {formatMoneyLabel(difference, currency)}
                  </p>
                </div>
              )}
              {showMismatch && (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
                  {t("accounts.reconciliation.mismatchHint")}
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="recon-note">{t("accounts.reconciliation.noteLabel")}</Label>
                <Textarea
                  id="recon-note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("accounts.reconciliation.notePlaceholder")}
                  maxLength={2000}
                  className="resize-none"
                />
              </div>
            </DialogBody>
            <DialogFooter className="shrink-0 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? t("accounts.reconciliation.saving") : t("accounts.reconciliation.submit")}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
