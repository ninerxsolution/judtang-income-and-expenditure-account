 "use client";

import { ArrowDownCircle, ArrowUpCircle, ImagePlus } from "lucide-react";
import { useI18n } from "@/hooks/use-i18n";

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
        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-600/80 bg-emerald-600/80 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
      >
        <ArrowDownCircle className="h-4.5 w-4.5" />
        <span className="hidden sm:block">
        {t("transactions.common.income")}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onQuickAdd("EXPENSE")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-red-600/80 bg-red-600/80 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/50"
      >
        <ArrowUpCircle className="h-4.5 w-4.5" />
        <span className="hidden sm:block">
        {t("transactions.common.expense")}
        </span>
      </button>
      <button
        type="button"
        onClick={onSlipUpload}
        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600/80 bg-blue-600/80 px-2 sm:px-3 py-2 sm:py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/50"
        aria-label={t("dashboard.slipUpload.title")}
      >
        <ImagePlus className="h-4.5 w-4.5" />
        <span className="hidden sm:block">
          {t("dashboard.slipUpload.title")}
        </span>
      </button>
      {/* <button
        type="button"
        onClick={() => onQuickAdd("TRANSFER")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-blue-600/80 bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/50"
      >
        <ArrowLeftRight className="h-4.5 w-4.5" />
        <span className="hidden sm:block">
        {t("transactions.common.transfer")}
        </span>
      </button> */}
    </div>
  );
}
