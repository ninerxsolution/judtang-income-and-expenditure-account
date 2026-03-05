"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { enUS, th } from "date-fns/locale";
import type { Locale } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { BuddhistCalendar } from "@/components/ui/calendar-buddhist";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const dateFnsLocales: Record<string, Locale> = {
  "en-US": enUS,
  "th-TH": th,
  en: enUS,
  th: th,
};

const BUDDHIST_LOCALES = ["th-TH", "th"];

function isThaiLocale(locale: string): boolean {
  return BUDDHIST_LOCALES.includes(locale);
}

function formatDisplayDate(date: Date, locale: string, dateFnsLocale: Locale): string {
  if (isThaiLocale(locale)) {
    const dayMonth = format(date, "d MMM", { locale: th });
    const beYear = date.getFullYear() + 543;
    return `${dayMonth} ${beYear}`;
  }
  return format(date, "PPP", { locale: dateFnsLocale });
}

function parseDateValue(value: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export type DateRangeValue = {
  from?: string;
  to?: string;
};

type DateRangePickerProps = {
  id: string;
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
  /** Number of months to display. Default 2 for desktop, 1 on small screens. */
  numberOfMonths?: number;
};

export function DateRangePicker({
  id,
  label,
  value,
  onChange,
  placeholder = "Pick a date range",
  className,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const { locale, t } = useI18n();
  const [open, setOpen] = React.useState(false);

  const rangeValue: DateRange | undefined = React.useMemo(() => {
    const from = parseDateValue(value.from ?? "");
    const to = parseDateValue(value.to ?? "");
    if (!from && !to) return undefined;
    return { from: from ?? undefined, to: to ?? undefined };
  }, [value.from, value.to]);

  const dateFnsLocale = dateFnsLocales[locale] ?? enUS;

  const displayText = React.useMemo(() => {
    if (!rangeValue?.from) return placeholder;
    const fromStr = formatDisplayDate(rangeValue.from, locale, dateFnsLocale);
    if (rangeValue.to) {
      const toStr = formatDisplayDate(rangeValue.to, locale, dateFnsLocale);
      return `${fromStr} – ${toStr}`;
    }
    return fromStr;
  }, [rangeValue, locale, dateFnsLocale, placeholder]);

  function handleSelect(range: DateRange | undefined) {
    if (!range) {
      onChange({});
      return;
    }
    const from = range.from ? formatToIso(range.from) : undefined;
    const to = range.to ? formatToIso(range.to) : undefined;
    onChange({ from, to });
  }

  const calendarContent = (
    <>
      {isThaiLocale(locale) ? (
        <BuddhistCalendar
          mode="range"
          selected={rangeValue}
          defaultMonth={rangeValue?.from ?? new Date()}
          captionLayout="dropdown"
          numberOfMonths={numberOfMonths}
          onSelect={handleSelect}
        />
      ) : (
        <Calendar
          mode="range"
          selected={rangeValue}
          defaultMonth={rangeValue?.from ?? new Date()}
          captionLayout="dropdown"
          locale={dateFnsLocale}
          numberOfMonths={numberOfMonths}
          onSelect={handleSelect}
        />
      )}
    </>
  );

  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md bg-background pl-3",
          "min-h-9",
        )}
      >
        <span
          id={id}
          className={cn(
            "flex-1 text-sm text-nowrap",
            !rangeValue?.from && "text-muted-foreground",
          )}
        >
          {displayText}
        </span>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              type="button"
              className="shrink-0"
              aria-label={t("common.actions.changeDate")}
            >
              <CalendarIcon className="size-4" />
              {t("common.actions.changeDate")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            {calendarContent}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
