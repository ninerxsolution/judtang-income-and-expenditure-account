"use client";

import type { Dispatch, SetStateAction } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatYearForDisplay } from "@/lib/format-year";
import type { Language } from "@/i18n";
import { BUDGET_PAGE_MONTHS } from "@/components/dashboard/budget/types";

type Translate = (key: string, params?: Record<string, string | number>) => string;

type Props = {
  t: Translate;
  language: Language;
  year: number;
  month: number;
  setYear: Dispatch<SetStateAction<number>>;
  setMonth: Dispatch<SetStateAction<number>>;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
};

export function BudgetMonthToolbar({
  t,
  language,
  year,
  month,
  setYear,
  setMonth,
  goToPreviousMonth,
  goToNextMonth,
}: Props) {
  return (
    <div className="inline-flex items-center gap-1 self-start rounded-lg border border-[#D4C9B0] bg-[#FDFAF4] p-1 dark:border-stone-700 dark:bg-stone-900">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPreviousMonth}
        aria-label={t("settings.budget.prevMonth")}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Select
        value={String(month)}
        onValueChange={(v) => setMonth(parseInt(v, 10))}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-24 border-0 bg-transparent px-2 shadow-none hover:bg-[#F5F0E8] dark:hover:bg-stone-800 focus:ring-0"
          aria-label={t("settings.budget.month")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BUDGET_PAGE_MONTHS.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {t(`summary.months.${m - 1}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={String(year)}
        onValueChange={(v) => setYear(parseInt(v, 10))}
      >
        <SelectTrigger
          size="sm"
          className="h-8 min-w-18 border-0 bg-transparent px-2 shadow-none hover:bg-[#F5F0E8] dark:hover:bg-stone-800 focus:ring-0"
          aria-label={t("settings.budget.year")}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {[year - 2, year - 1, year, year + 1, year + 2].map((y) => (
            <SelectItem key={y} value={String(y)}>
              {formatYearForDisplay(y, language)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextMonth}
        aria-label={t("settings.budget.nextMonth")}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
