"use client";

import { useEffect, useMemo, useState } from "react";
import { toDateStringInTimezone } from "@/lib/date-range";
import { Search, ChevronLeft, ChevronRight, Check, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { BuddhistCalendar } from "@/components/ui/calendar-buddhist";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { enUS, th } from "date-fns/locale";
import type { Locale } from "date-fns";
import { useI18n } from "@/hooks/use-i18n";

export type RecurringLinkCandidateRow = {
  id: string;
  occurredAt: string;
  amount: number | string | { toNumber?: () => number };
  currency: string;
  note: string | null;
  financialAccountId: string | null;
  categoryId: string | null;
  financialAccount: { id: string; name: string } | null;
  categoryRef: { id: string; name: string; nameEn: string | null } | null;
};

const dateFnsLocales: Record<string, Locale> = {
  "en-US": enUS,
  "th-TH": th,
  en: enUS,
  th: th,
};

const BUDDHIST_LOCALES = ["th-TH", "th"];

function parseYmd(value: string): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatToIso(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function startOfLocalCalendarDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatOccurredAtLabel(iso: string, displayLocale: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(displayLocale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: timezone,
  });
}

/** Keep only rows whose occurredAt falls on the selected calendar day in the user's timezone. */
function filterRowsByCalendarDay(
  rows: RecurringLinkCandidateRow[],
  ymd: string,
  timezone: string,
): RecurringLinkCandidateRow[] {
  if (!ymd) return rows;
  return rows.filter((row) => {
    const d = new Date(row.occurredAt);
    if (Number.isNaN(d.getTime())) return false;
    return toDateStringInTimezone(d, timezone) === ymd;
  });
}

export function RecurringLinkPickerTrigger({
  label,
  summary,
  onClick,
  placeholder,
}: {
  label: string;
  summary: string | null;
  onClick: () => void;
  placeholder: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-md border border-[#D4C9B0] px-3 py-2 text-sm transition-all hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 text-left"
      >
        {summary ? (
          <span className="font-medium text-[#3D3020] dark:text-stone-200 truncate pr-2">
            {summary}
          </span>
        ) : (
          <span className="text-[#6B5E4E] dark:text-stone-400">{placeholder}</span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-[#6B5E4E] dark:text-stone-400" />
      </button>
    </div>
  );
}

type RecurringLinkSlidePickerPanelProps = {
  recurringId: string;
  dueYear: number;
  dueMonth: number;
  selectedId: string;
  displayLocale: string;
  onSelect: (row: RecurringLinkCandidateRow) => void;
  onBack: () => void;
  title: string;
  searchPlaceholder: string;
  filterDateAriaLabel: string;
  clearDateAriaLabel: string;
  filterDateHint?: string;
  loadingText: string;
  noResultsText: string;
};

export function RecurringLinkSlidePickerPanel({
  recurringId,
  dueYear,
  dueMonth,
  selectedId,
  displayLocale,
  onSelect,
  onBack,
  title,
  searchPlaceholder,
  filterDateAriaLabel,
  clearDateAriaLabel,
  filterDateHint,
  loadingText,
  noResultsText,
}: RecurringLinkSlidePickerPanelProps) {
  const { locale } = useI18n();
  const dateFnsLocale = dateFnsLocales[locale] ?? enUS;
  const isThai = BUDDHIST_LOCALES.includes(locale);

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [items, setItems] = useState<RecurringLinkCandidateRow[]>([]);
  const [loading, setLoading] = useState(true);

  const userTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const todayStart = useMemo(() => startOfLocalCalendarDay(new Date()), []);
  const defaultMonth = new Date(dueYear, dueMonth - 1, 1);

  function isDateSelectable(d: Date): boolean {
    return startOfLocalCalendarDay(d).getTime() <= todayStart.getTime();
  }

  function formatChipDate(ymd: string): string {
    const d = parseYmd(ymd);
    if (!d) return ymd;
    if (isThai) {
      const dayMonth = format(d, "d MMM", { locale: th });
      const beYear = d.getFullYear() + 543;
      return `${dayMonth} ${beYear}`;
    }
    return format(d, "d MMM yyyy", { locale: dateFnsLocale });
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const activeFilterDate = filterDate;

    async function loadCandidates(): Promise<void> {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          dueYear: String(dueYear),
          dueMonth: String(dueMonth),
          limit: "10",
        });
        if (debouncedSearch) params.set("q", debouncedSearch);
        if (activeFilterDate) params.set("onDate", activeFilterDate);
        params.set("timezone", userTimezone);
        const res = await fetch(
          `/api/recurring-transactions/${recurringId}/link-candidates?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (controller.signal.aborted) return;
        const data = (await res.json()) as unknown;
        const list = Array.isArray(data) ? (data as RecurringLinkCandidateRow[]) : [];
        setItems(
          activeFilterDate
            ? filterRowsByCalendarDay(list, activeFilterDate, userTimezone)
            : list,
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!controller.signal.aborted) setItems([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCandidates();
    return () => controller.abort();
  }, [recurringId, dueYear, dueMonth, debouncedSearch, filterDate, userTimezone]);

  function handleBack() {
    setSearchInput("");
    setDebouncedSearch("");
    setFilterDate("");
    setDatePopoverOpen(false);
    onBack();
  }

  function handlePick(row: RecurringLinkCandidateRow) {
    setSearchInput("");
    setDebouncedSearch("");
    onSelect(row);
  }

  const calendarContent = (
    <>
      {isThai ? (
        <BuddhistCalendar
          mode="single"
          selected={filterDate ? parseYmd(filterDate) : undefined}
          defaultMonth={filterDate ? parseYmd(filterDate) ?? defaultMonth : defaultMonth}
          captionLayout="dropdown"
          disabled={(d) => !isDateSelectable(d)}
          onSelect={(date) => {
            if (date && isDateSelectable(date)) {
              setFilterDate(formatToIso(date));
              setDatePopoverOpen(false);
            }
          }}
        />
      ) : (
        <Calendar
          mode="single"
          selected={filterDate ? parseYmd(filterDate) : undefined}
          defaultMonth={filterDate ? parseYmd(filterDate) ?? defaultMonth : defaultMonth}
          captionLayout="dropdown"
          locale={dateFnsLocale}
          disabled={(d) => !isDateSelectable(d)}
          onSelect={(date) => {
            if (date && isDateSelectable(date)) {
              setFilterDate(formatToIso(date));
              setDatePopoverOpen(false);
            }
          }}
        />
      )}
    </>
  );

  return (
    <div
      className={cn(
        "absolute z-10 flex min-h-0 flex-col overflow-hidden rounded-lg bg-[#FDFAF4] animate-in slide-in-from-right-8 duration-200 dark:bg-stone-950",
        "-inset-6 max-md:rounded-none",
      )}
    >
      <div className="flex shrink-0 items-center border-b border-[#D4C9B0] bg-[#FDFAF4] px-4 pb-3 pt-4 dark:border-stone-700 dark:bg-stone-950">
        <button
          type="button"
          onClick={handleBack}
          className="-ml-2 rounded-full p-2 text-[#6B5E4E] transition-colors hover:bg-[#F5F0E8] hover:text-[#3D3020] dark:text-stone-400 dark:hover:bg-stone-800"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="ml-2 text-lg font-bold leading-snug text-[#3D3020] dark:text-stone-100">{title}</h2>
      </div>

      <div className="shrink-0 border-b border-[#D4C9B0] bg-[#FDFAF4] p-4 dark:border-stone-700 dark:bg-stone-950">
        <div className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-[#D4C9B0] bg-white py-2.5 pl-10 pr-3 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoFocus
              aria-label={searchPlaceholder}
            />
          </div>
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className={cn(
                  "h-10 w-10 shrink-0 border-[#D4C9B0] dark:border-stone-600",
                  filterDate && "border-emerald-400 dark:border-emerald-700",
                )}
                aria-label={filterDateAriaLabel}
              >
                <CalendarIcon className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              {calendarContent}
            </PopoverContent>
          </Popover>
        </div>
        {filterDateHint ? (
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">{filterDateHint}</p>
        ) : null}
        {filterDate ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
              {formatChipDate(filterDate)}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-emerald-200/60 dark:hover:bg-emerald-800/60"
                onClick={() => setFilterDate("")}
                aria-label={clearDateAriaLabel}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FDFAF4] p-2 dark:bg-stone-950">
        {loading ? (
          <div className="py-10 text-center text-sm text-stone-500">{loadingText}</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-500">{noResultsText}</div>
        ) : (
          <ul className="space-y-1">
            {items.map((row) => {
              const isSelected = selectedId === row.id;
              const amt = formatAmount(row.amount);
              const dateLabel = formatOccurredAtLabel(
                row.occurredAt,
                displayLocale,
                userTimezone,
              );
              const acct = row.financialAccount?.name ?? "—";
              const line = `${dateLabel} · ${row.currency} ${amt} · ${acct}`;
              const noteLine = row.note?.trim()
                ? row.note.trim().length > 48
                  ? `${row.note.trim().slice(0, 48)}…`
                  : row.note.trim()
                : null;

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(row)}
                    className={cn(
                      "flex w-full flex-col items-start gap-0.5 rounded-xl border px-4 py-3 text-left transition-all",
                      isSelected
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                        : "border-transparent hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-sm font-medium",
                          isSelected
                            ? "text-emerald-800 dark:text-emerald-300"
                            : "text-[#3D3020] dark:text-stone-200",
                        )}
                      >
                        {line}
                      </span>
                      {isSelected ? (
                        <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : null}
                    </span>
                    {noteLine ? (
                      <span className="text-xs text-stone-500 dark:text-stone-400">{noteLine}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
