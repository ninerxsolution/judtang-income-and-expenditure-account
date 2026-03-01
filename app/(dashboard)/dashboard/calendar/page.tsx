"use client";

import { TransactionsCalendar } from "@/components/dashboard/transactions-calendar";
import { useI18n } from "@/hooks/use-i18n";

export default function TransactionsCalendarPage() {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("calendar.subtitle")}
          </p>
        </div>
      </div>

      <TransactionsCalendar />
    </div>
  );
}