"use client";

import { ArrowDownCircle, ArrowUpCircle, ImagePlus, MoreHorizontal } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type CalendarQuickActionsProps = {
  onQuickAdd: (type: TransactionType) => void;
  onSlipUpload: () => void;
};

export function CalendarQuickActions({
  onQuickAdd,
  onSlipUpload,
}: CalendarQuickActionsProps) {
  const { t } = useI18n();

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onQuickAdd("INCOME")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/80 bg-emerald-600/80 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:border-transparent dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
      >
        <ArrowDownCircle className="h-4.5 w-4.5" />
        <span className="hidden sm:block">
          {t("transactions.common.income")}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onQuickAdd("EXPENSE")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-600/80 bg-red-600/80 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:border-transparent dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
      >
        <ArrowUpCircle className="h-4.5 w-4.5" />
        <span className="hidden sm:block">
          {t("transactions.common.expense")}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl bg-[#FDFAF4] px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium text-[#6B5E4E] transition-colors hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900/80 dark:text-stone-300 dark:hover:bg-stone-800"
            aria-label={t("notifications.moreOptions")}
          >
            <MoreHorizontal className="h-4.5 w-4.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onSlipUpload}>
            <ImagePlus className="h-4 w-4" />
            {t("dashboard.slipUpload.title")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
