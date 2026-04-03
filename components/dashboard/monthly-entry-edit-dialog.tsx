"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  Loader2,
  Trash2,
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
import { FormField } from "@/components/auth/form-field";
import { AccountCombobox, type AccountOption } from "@/components/dashboard/account-combobox";
import { saveRecentFinancialAccountId } from "@/lib/recent-financial-accounts";
import { RowSelect } from "@/components/dashboard/row-select";
import { CategoryRowSelect } from "@/components/dashboard/category-row-select";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/use-i18n";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type Category = { id: string; name: string; nameEn?: string | null };

type ExistingTransaction = {
  id: string;
  type: string;
  amount: number;
  financialAccount?: {
    id: string;
    name: string;
    type?: string;
    bankName?: string | null;
    cardNetwork?: string | null;
  } | null;
  transferAccount?: {
    id: string;
    name: string;
    type?: string;
    bankName?: string | null;
    cardNetwork?: string | null;
  } | null;
  categoryRef?: { id: string; name: string; nameEn?: string | null } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
};

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function TypeIcon({ type, className }: { type: TransactionType; className?: string }) {
  switch (type) {
    case "INCOME":
      return <ArrowDownCircle className={cn("text-emerald-600 dark:text-emerald-400", className)} />;
    case "EXPENSE":
      return <ArrowUpCircle className={cn("text-red-600 dark:text-red-400", className)} />;
    case "TRANSFER":
      return <ArrowLeftRight className={cn("text-blue-600 dark:text-blue-400", className)} />;
  }
}

const TYPE_OPTIONS: TransactionType[] = ["INCOME", "EXPENSE", "TRANSFER"];

type MonthlyEntryEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ExistingTransaction | null;
  day: number;
  year: number;
  month: number;
  defaultAccountId: string;
  categories: Category[];
  accounts: AccountOption[];
  onSuccess?: () => void;
};

export function MonthlyEntryEditDialog({
  open,
  onOpenChange,
  transaction,
  day,
  year,
  month,
  defaultAccountId,
  categories,
  accounts,
  onSuccess,
}: MonthlyEntryEditDialogProps) {
  const { t, language } = useI18n();
  const localeKey: "th" | "en" = language === "th" ? "th" : "en";

  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [financialAccountId, setFinancialAccountId] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !transaction) return;
    setType(transaction.type as TransactionType);
    setAmount(String(transaction.amount));
    setCategoryId(transaction.categoryRef?.id ?? "");
    setFinancialAccountId(transaction.financialAccount?.id ?? defaultAccountId);
    setTransferAccountId(transaction.transferAccount?.id ?? "");
    setNote(transaction.note ?? "");
  }, [open, transaction, defaultAccountId]);

  const amountError =
    amount && (Number.isNaN(parseFloat(amount)) || parseFloat(amount) <= 0)
      ? t("monthlyEntry.validationAmountRequired")
      : null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return;
    }
    if (!transaction) return;

    setPending(true);
    try {
      const dateObj = new Date(year, month, day);
      const nowTime = new Date();
      dateObj.setHours(nowTime.getHours(), nowTime.getMinutes(), nowTime.getSeconds());

      const body = {
        type,
        amount: amt,
        financialAccountId: financialAccountId || defaultAccountId,
        occurredAt: dateObj.toISOString(),
        categoryId: categoryId || null,
        note: note.trim() || null,
        ...(type === "TRANSFER" && {
          transferAccountId: transferAccountId || null,
        }),
      };

      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const fid = financialAccountId || defaultAccountId;
        if (fid) {
          saveRecentFinancialAccountId(fid);
        }
        if (type === "TRANSFER" && transferAccountId) {
          saveRecentFinancialAccountId(transferAccountId);
        }
        toast.success(t("monthlyEntry.editSuccess"));
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(t("monthlyEntry.editFailed"));
      }
    } catch {
      toast.error(t("monthlyEntry.editFailed"));
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(t("monthlyEntry.deleteSuccess"));
        onSuccess?.();
        onOpenChange(false);
      } else {
        toast.error(t("monthlyEntry.deleteFailed"));
      }
    } catch {
      toast.error(t("monthlyEntry.deleteFailed"));
    } finally {
      setDeleting(false);
    }
  }

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
        <DialogHeader className="shrink-0">
          <DialogTitle>{t("monthlyEntry.editTransaction")}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSave}
          className="flex flex-1 flex-col min-h-0 overflow-hidden"
        >
          <DialogBody className="space-y-4 pb-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("monthlyEntry.type")}</label>
              <RowSelect
                value={type}
                onChange={(v) => setType(v as TransactionType)}
                options={TYPE_OPTIONS.map((opt) => ({
                  value: opt,
                  label:
                    opt === "INCOME"
                      ? localeKey === "th"
                        ? "รายรับ"
                        : "Income"
                      : opt === "EXPENSE"
                        ? localeKey === "th"
                          ? "รายจ่าย"
                          : "Expense"
                        : localeKey === "th"
                          ? "โอน"
                          : "Transfer",
                }))}
                renderOptionIcon={(opt) => (
                  <TypeIcon type={opt.value as TransactionType} className="h-4 w-4" />
                )}
                className="h-11 py-1 text-sm"
              />
            </div>

            <FormField
              id="monthly-edit-amount"
              label={t("monthlyEntry.amount")}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(v) => setAmount(sanitizeAmountInput(v))}
              error={amountError ?? undefined}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("monthlyEntry.category")}</label>
              <CategoryRowSelect
                value={categoryId}
                onChange={setCategoryId}
                categories={categories}
                language={localeKey}
                allowEmpty
                emptyLabel={t("monthlyEntry.category")}
                className="h-11 py-1 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t("monthlyEntry.account")}</label>
              <AccountCombobox
                value={financialAccountId}
                onChange={setFinancialAccountId}
                accounts={accounts}
                className="!py-1 !text-sm !h-11"
              />
            </div>

            {type === "TRANSFER" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("transactions.new.toAccount")}
                </label>
                <AccountCombobox
                  value={transferAccountId}
                  onChange={setTransferAccountId}
                  accounts={accounts}
                  excludeIds={financialAccountId ? [financialAccountId] : []}
                  allowEmpty
                  emptyLabel={`→ ${t("transactions.new.toAccount")}`}
                  className="!py-1 !text-sm !h-11"
                />
              </div>
            )}

            <FormField
              id="monthly-edit-note"
              label={t("monthlyEntry.note")}
              type="text"
              value={note}
              onChange={setNote}
            />
          </DialogBody>
          <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="destructive"
              className="w-full sm:w-auto sm:mr-auto"
              onClick={handleDelete}
              disabled={pending || deleting}
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("monthlyEntry.removeRow")}
                </>
              )}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                {t("monthlyEntry.cancel")}
              </Button>
              <Button type="submit" disabled={pending || !!amountError}>
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("monthlyEntry.saveEdit")
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
