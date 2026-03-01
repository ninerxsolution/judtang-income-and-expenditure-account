"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { enUS, th } from "date-fns/locale";
import type { Locale } from "date-fns";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";

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
};

export function DatePicker({
  id,
  label,
  value,
  onChange,
  required,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  const { locale } = useI18n();
  const [open, setOpen] = React.useState(false);

  const dateValue = parseDateValue(value);
  const dateFnsLocale = dateFnsLocales[locale] ?? enUS;

  const displayText = dateValue
    ? formatDisplayDate(dateValue, locale, dateFnsLocale)
    : placeholder;

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            data-empty={!dateValue}
            className={cn(
              "w-full justify-start text-left font-normal",
              !dateValue && "text-muted-foreground",
            )}
            type="button"
            aria-required={required}
          >
            <CalendarIcon className="size-4" />
            {displayText}
            <ChevronDownIcon className="ml-auto size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
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
        </PopoverContent>
      </Popover>
    </div>
  );
}
