"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { enUS, th } from "date-fns/locale";
import type { Locale } from "date-fns";
import { CalendarIcon } from "lucide-react";

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

type DatePickerProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  /** When "inline", renders as a compact text link only (no label, no container) */
  variant?: "default" | "inline";
};

export function DatePicker({
  id,
  label,
  value,
  onChange,
  required,
  placeholder = "Pick a date",
  className,
  variant = "default",
}: DatePickerProps) {
  const { locale, t } = useI18n();
  const [open, setOpen] = React.useState(false);

  const dateValue = parseDateValue(value);
  const dateFnsLocale = dateFnsLocales[locale] ?? enUS;

  const displayText = dateValue
    ? formatDisplayDate(dateValue, locale, dateFnsLocale)
    : placeholder;

  const calendarContent = (
    <>
      {isThaiLocale(locale) ? (
        <BuddhistCalendar
          mode="single"
          selected={dateValue}
          defaultMonth={dateValue ?? new Date()}
          captionLayout="dropdown"
          onSelect={(date) => {
            if (date) {
              onChange(formatToIso(date));
              setOpen(false);
            }
          }}
        />
      ) : (
        <Calendar
          mode="single"
          selected={dateValue}
          defaultMonth={dateValue ?? new Date()}
          captionLayout="dropdown"
          locale={dateFnsLocale}
          onSelect={(date) => {
            if (date) {
              onChange(formatToIso(date));
              setOpen(false);
            }
          }}
        />
      )}
    </>
  );

  if (variant === "inline") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            className={cn(
              "text-sm underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded",
              dateValue ? "text-primary" : "text-muted-foreground",
              className,
            )}
            aria-label={t("common.actions.changeDate")}
          >
            {displayText}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {calendarContent}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          "flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2",
          "min-h-9",
        )}
      >
        <span
          id={id}
          className={cn(
            "flex-1 text-sm",
            !dateValue && "text-muted-foreground",
          )}
          aria-required={required}
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
