"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatAmount } from "@/lib/format";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { useI18n } from "@/hooks/use-i18n";

type Transaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  category: string | null;
  note?: string | null;
  occurredAt?: string;
};

type TransactionDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  onConfirm?: () => void;
};

export function TransactionDeleteDialog({
  open,
  onOpenChange,
  transaction,
  onConfirm,
}: TransactionDeleteDialogProps) {
  const { t, locale, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!transaction) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onOpenChange(false);
        onConfirm?.();
      } else {
        setError(t("transactions.list.deleteFailed"));
      }
    } catch {
      setError(t("transactions.list.deleteFailed"));
    } finally {
      setPending(false);
    }
  }

  const isIncome = transaction?.type === "INCOME";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("transactions.delete.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {transaction ? (
              <>
                {t("transactions.delete.message")}{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {isIncome
                    ? t("transactions.common.income")
                    : t("transactions.common.expense")}{" "}
                  {formatAmount(transaction.amount)}
                  {transaction.category && ` · ${getCategoryDisplayName(transaction.category, localeKey)}`}
                </span>
              </>
            ) : (
              t("transactions.list.deleteConfirm")
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>
            {t("common.actions.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleConfirm();
            }}
            disabled={pending}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {pending ? t("transactions.delete.pending") : t("transactions.delete.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
