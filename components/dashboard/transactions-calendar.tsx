"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/hooks/use-i18n";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { TransactionDeleteDialog } from "@/components/dashboard/transaction-delete-dialog";

type CalendarSummaryItem = {
  date: string; // YYYY-MM-DD
  hasTransactions: boolean;
  count: number;
};

type DailyTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | string;
  amount: number;
  category: string | null;
  note: string | null;
  occurredAt: string;
};

type CalendarDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasTransactions: boolean;
  count: number;
};

type ViewMode = "day" | "month" | "year";

type MonthSummaryItem = {
  monthIndex: number;
  hasTransactions: boolean;
  count: number;
};

type YearSummaryItem = {
  year: number;
  hasTransactions: boolean;
  count: number;
};

function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODateOnly(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((part) => Number.parseInt(part, 10));
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getMonthLabel(year: number, monthIndex: number, locale: string): string {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  });
}

function buildCalendarDays(
  year: number,
  monthIndex: number,
  summary: CalendarSummaryItem[],
): { days: CalendarDay[]; from: string; to: string } {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  // Week starts on Monday (จันทร์) -> 0, ..., อาทิตย์ -> 6
  const toMondayIndex = (day: number) => (day + 6) % 7;

  const startOffset = toMondayIndex(firstOfMonth.getDay());
  const endOffset = 6 - toMondayIndex(lastOfMonth.getDay());

  const gridStart = new Date(
    firstOfMonth.getFullYear(),
    firstOfMonth.getMonth(),
    firstOfMonth.getDate() - startOffset,
  );
  const gridEnd = new Date(
    lastOfMonth.getFullYear(),
    lastOfMonth.getMonth(),
    lastOfMonth.getDate() + endOffset,
  );

  const todayIso = formatDateInput(new Date());

  const summaryMap = new Map<string, CalendarSummaryItem>();
  for (const item of summary) {
    summaryMap.set(item.date, item);
  }

  const days: CalendarDay[] = [];
  const cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const iso = formatDateInput(cursor);
    const s = summaryMap.get(iso);
    days.push({
      date: new Date(cursor),
      iso,
      inCurrentMonth:
        cursor.getFullYear() === year && cursor.getMonth() === monthIndex,
      isToday: iso === todayIso,
      hasTransactions: !!s?.hasTransactions,
      count: s?.count ?? 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days,
    from: formatDateInput(gridStart),
    to: formatDateInput(gridEnd),
  };
}

function formatAmount(amount: number, locale: string) {
  if (Number.isNaN(amount)) return "-";
  return amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const WEEKDAY_LABEL_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function formatYearForDisplay(year: number, locale: string): string {
  if (locale === "th-TH" || locale === "th") {
    return String(year + 543);
  }
  return String(year);
}

export function TransactionsCalendar() {
  const { t, locale } = useI18n();

  const [formOpen, setFormOpen] = useState(false);
  const [formEditId, setFormEditId] = useState<string | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] =
    useState<DailyTransaction | null>(null);

  const today = useMemo(() => new Date(), []);
  const initialYear = today.getFullYear();

  const [{ year, monthIndex }, setMonthYear] = useState(() => ({
    year: initialYear,
    monthIndex: today.getMonth(), // 0-11
  }));
  const [viewMode, setViewMode] = useState<ViewMode>("day");

  const [summary, setSummary] = useState<CalendarSummaryItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [monthSummary, setMonthSummary] = useState<MonthSummaryItem[]>([]);
  const [monthSummaryLoading, setMonthSummaryLoading] = useState(false);
  const [monthSummaryError, setMonthSummaryError] = useState<string | null>(
    null,
  );

  const [yearRangeStart, setYearRangeStart] = useState(initialYear - 5);
  const [yearSummary, setYearSummary] = useState<YearSummaryItem[]>([]);
  const [yearSummaryLoading, setYearSummaryLoading] = useState(false);
  const [yearSummaryError, setYearSummaryError] = useState<string | null>(
    null,
  );

  const [{ days, from, to }, calendarReady] = useMemo(() => {
    try {
      const built = buildCalendarDays(year, monthIndex, summary);
      return [built, true] as const;
    } catch {
      return [
        {
          days: [],
          from: formatDateInput(new Date(year, monthIndex, 1)),
          to: formatDateInput(new Date(year, monthIndex + 1, 0)),
        },
        false,
      ] as const;
    }
  }, [year, monthIndex, summary]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyItems, setDailyItems] = useState<DailyTransaction[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  // Load summary when month changes.
  useEffect(() => {
    if (!calendarReady || viewMode !== "day") return;

    const controller = new AbortController();
    async function load() {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const params = new URLSearchParams();
        params.set("from", from);
        params.set("to", to);
        const res = await fetch(
          `/api/transactions/calendar-summary?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          if (res.status === 401) {
            setSummaryError(t("common.errors.unauthenticated"));
          } else {
            setSummaryError(t("calendar.errors.loadCalendar"));
          }
          setSummary([]);
          return;
        }
        const data = (await res.json()) as CalendarSummaryItem[] | unknown;
        if (Array.isArray(data)) {
          setSummary(
            data.map((item) => ({
              date: item.date,
              hasTransactions: !!item.hasTransactions,
              count:
                typeof item.count === "number" && Number.isFinite(item.count)
                  ? item.count
                  : 0,
            })),
          );
        } else {
          setSummary([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setSummaryError(t("calendar.errors.loadCalendar"));
        setSummary([]);
      } finally {
        setSummaryLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [from, to, calendarReady, viewMode, t]);

  // Month summary (per year) for Month view.
  useEffect(() => {
    if (viewMode !== "month") return;

    const controller = new AbortController();
    async function load() {
      setMonthSummaryLoading(true);
      setMonthSummaryError(null);
      try {
        const params = new URLSearchParams();
        params.set("year", String(year));
        const res = await fetch(
          `/api/transactions/month-summary?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          if (res.status === 401) {
            setMonthSummaryError(t("common.errors.unauthenticated"));
          } else {
            setMonthSummaryError(t("calendar.errors.loadMonthSummary"));
          }
          setMonthSummary([]);
          return;
        }
        const data = (await res.json()) as MonthSummaryItem[] | unknown;
        if (Array.isArray(data)) {
          setMonthSummary(
            data.map((item) => ({
              monthIndex: item.monthIndex,
              hasTransactions: !!item.hasTransactions,
              count:
                typeof item.count === "number" && Number.isFinite(item.count)
                  ? item.count
                  : 0,
            })),
          );
        } else {
          setMonthSummary([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMonthSummaryError(t("calendar.errors.loadMonthSummary"));
        setMonthSummary([]);
      } finally {
        setMonthSummaryLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [viewMode, year, t]);

  // Year summary (multi-year) for Year view.
  const yearRangeEnd = useMemo(
    () => yearRangeStart + 11,
    [yearRangeStart],
  );

  useEffect(() => {
    if (viewMode !== "year") return;

    const controller = new AbortController();
    async function load() {
      setYearSummaryLoading(true);
      setYearSummaryError(null);
      try {
        const params = new URLSearchParams();
        params.set("fromYear", String(yearRangeStart));
        params.set("toYear", String(yearRangeEnd));
        const res = await fetch(
          `/api/transactions/year-summary?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          if (res.status === 401) {
            setYearSummaryError(t("common.errors.unauthenticated"));
          } else {
            setYearSummaryError(t("calendar.errors.loadYearSummary"));
          }
          setYearSummary([]);
          return;
        }
        const data = (await res.json()) as YearSummaryItem[] | unknown;
        if (Array.isArray(data)) {
          setYearSummary(
            data.map((item) => ({
              year: item.year,
              hasTransactions: !!item.hasTransactions,
              count:
                typeof item.count === "number" && Number.isFinite(item.count)
                  ? item.count
                  : 0,
            })),
          );
        } else {
          setYearSummary([]);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setYearSummaryError(t("calendar.errors.loadYearSummary"));
        setYearSummary([]);
      } finally {
        setYearSummaryLoading(false);
      }
    }

    void load();

    return () => controller.abort();
  }, [viewMode, yearRangeStart, yearRangeEnd, t]);

  async function openDay(dateIso: string) {
    setSelectedDate(dateIso);
    setDailyItems([]);
    setDailyError(null);
    setDailyLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("date", dateIso);
      params.set("limit", "200");
      const res = await fetch(`/api/transactions?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          setDailyError(t("common.errors.unauthenticated"));
        } else {
          setDailyError(t("calendar.errors.loadDaily"));
        }
        setDailyItems([]);
        return;
      }

      const data = (await res.json()) as DailyTransaction[] | unknown;
      if (Array.isArray(data)) {
        setDailyItems(data);
      } else {
        setDailyItems([]);
      }
    } catch {
      setDailyError(t("calendar.errors.loadDaily"));
      setDailyItems([]);
    } finally {
      setDailyLoading(false);
    }
  }

  function closeDay() {
    setSelectedDate(null);
    setDailyItems([]);
    setDailyError(null);
  }

  function goToToday() {
    const now = new Date();
    setMonthYear({
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
    });
    setViewMode("day");
  }

  function goPrevMonth() {
    setMonthYear(({ year: currentYear, monthIndex: currentMonth }) => {
      if (currentMonth === 0) {
        return { year: currentYear - 1, monthIndex: 11 };
      }
      return { year: currentYear, monthIndex: currentMonth - 1 };
    });
  }

  function goNextMonth() {
    setMonthYear(({ year: currentYear, monthIndex: currentMonth }) => {
      if (currentMonth === 11) {
        return { year: currentYear + 1, monthIndex: 0 };
      }
      return { year: currentYear, monthIndex: currentMonth + 1 };
    });
  }

  function handleAddForDay(dateIso: string) {
    setFormEditId(null);
    setFormInitialDate(dateIso);
    setFormOpen(true);
  }

  function handleEditInModal(tx: DailyTransaction) {
    setFormEditId(tx.id);
    setFormInitialDate(null);
    setFormOpen(true);
  }

  function handleDeleteInModal(tx: DailyTransaction) {
    setDeleteTransaction(tx);
    setDeleteOpen(true);
  }

  function refreshDailyItems() {
    if (selectedDate) {
      void openDay(selectedDate);
    }
  }

  const selectedDateLabel = useMemo(() => {
    if (!selectedDate) return "";
    const parsed = parseISODateOnly(selectedDate);
    if (!parsed) return selectedDate;
    return parsed.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      weekday: "short",
    });
  }, [selectedDate, locale]);

  const monthSummaryMap = useMemo(() => {
    const map = new Map<number, MonthSummaryItem>();
    for (const item of monthSummary) {
      map.set(item.monthIndex, item);
    }
    return map;
  }, [monthSummary]);

  const yearSummaryMap = useMemo(() => {
    const map = new Map<number, YearSummaryItem>();
    for (const item of yearSummary) {
      map.set(item.year, item);
    }
    return map;
  }, [yearSummary]);

  function getMonthShortLabel(index: number) {
    const d = new Date(2000, index, 1);
    return d.toLocaleDateString(locale, { month: "short" });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col flex-wrap gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold sm:text-xl">
              {t("calendar.title")}
            </h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("calendar.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-md border border-zinc-300 bg-white text-sm dark:border-zinc-700 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setViewMode("day")}
              className={`px-3 py-2 ${
                viewMode === "day"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              } rounded-l-md font-medium`}
            >
              {t("calendar.view.day")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`border-l border-zinc-300 px-3 py-2 dark:border-zinc-700 font-medium ${
                viewMode === "month"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {t("calendar.view.month")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("year")}
              className={`border-l border-zinc-300 px-3 py-2 dark:border-zinc-700 rounded-r-md font-medium ${
                viewMode === "year"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              }`}
            >
              {t("calendar.view.year")}
            </button>
          </div>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {t("calendar.today")}
          </button>
          <button
            type="button"
            onClick={() => {
              setFormEditId(null);
              setFormInitialDate(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            <Plus className="h-4 w-4" />
            {t("calendar.newTransaction")}
          </button>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900/80">
        {/* Header & content depend on view mode */}
        {viewMode === "day" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNextMonth}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {getMonthLabel(year, monthIndex, locale)}
                </div>
              </div>
              {summaryLoading && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("calendar.loading.calendar")}
                </p>
              )}
              {summaryError && !summaryLoading && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {summaryError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
              {WEEKDAY_LABEL_KEYS.map((key) => (
                <div key={key} className="py-1">
                  {t(`calendar.weekdays.${key}`)}
                </div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1 text-xs">
              {days.map((day) => {
                const isMuted = !day.inCurrentMonth;
                const hasData = day.hasTransactions;

                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => openDay(day.iso)}
                    className={[
                      "flex h-16 flex-col rounded-md border px-1.5 py-1 text-left transition",
                      "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                      isMuted
                        ? "text-zinc-400 dark:text-zinc-500"
                        : "text-zinc-800 dark:text-zinc-100",
                      day.isToday
                        ? "ring-1 ring-zinc-900 ring-offset-1 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[11px] font-semibold">
                        {day.date.getDate()}
                      </span>
                      {day.isToday && (
                        <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Today
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1">
                      {hasData && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {hasData && day.count > 1 && (
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {day.count} records
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t("calendar.legend.hasRecords")}</span>
              </div>
              <span>{t("calendar.legend.hintDayClick")}</span>
            </div>
          </>
        )}

        {viewMode === "month" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setMonthYear(({ year: currentYear, monthIndex }) => ({
                      year: currentYear - 1,
                      monthIndex,
                    }))
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setMonthYear(({ year: currentYear, monthIndex }) => ({
                      year: currentYear + 1,
                      monthIndex,
                    }))
                  }
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatYearForDisplay(year, locale)}
                </div>
              </div>
              {monthSummaryLoading && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("calendar.loading.months")}
                </p>
              )}
              {monthSummaryError && !monthSummaryLoading && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {monthSummaryError}
                </p>
              )}
            </div>

            <div className="mt-1 grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
              {Array.from({ length: 12 }, (_, idx) => {
                const info = monthSummaryMap.get(idx);
                const hasData = !!info?.hasTransactions;
                const count = info?.count ?? 0;
                const isCurrentMonth =
                  idx === today.getMonth() && year === today.getFullYear();
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMonthYear({ year, monthIndex: idx });
                      setViewMode("day");
                    }}
                    className={[
                      "flex h-20 flex-col justify-between rounded-md border px-2 py-2 text-left transition",
                      "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                      hasData
                        ? "text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-500 dark:text-zinc-400",
                      isCurrentMonth
                        ? "ring-1 ring-zinc-900 ring-offset-1 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="text-sm font-medium">
                      {getMonthShortLabel(idx)}
                    </span>
                    <div className="mt-2 flex items-center gap-1 text-[11px]">
                      {hasData && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {hasData && count > 1 && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {t("calendar.records", { count })}
                        </span>
                      )}
                      {!hasData && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          {t("calendar.noRecords")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              {t("calendar.legend.hintMonthClick")}
            </div>
          </>
        )}

        {viewMode === "year" && (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setYearRangeStart((y) => y - 12)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setYearRangeStart((y) => y + 12)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="ml-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatYearForDisplay(yearRangeStart, locale)}–{formatYearForDisplay(yearRangeEnd, locale)}
                </div>
              </div>
              {yearSummaryLoading && (
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("calendar.loading.years")}
                </p>
              )}
              {yearSummaryError && !yearSummaryLoading && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {yearSummaryError}
                </p>
              )}
            </div>

            <div className="mt-1 grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
              {Array.from(
                { length: yearRangeEnd - yearRangeStart + 1 },
                (_, idx) => yearRangeStart + idx,
              ).map((y) => {
                const info = yearSummaryMap.get(y);
                const hasData = !!info?.hasTransactions;
                const count = info?.count ?? 0;
                const isCurrentYear = y === today.getFullYear();
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      setMonthYear(({ monthIndex }) => ({
                        year: y,
                        monthIndex,
                      }));
                      setViewMode("month");
                    }}
                    className={[
                      "flex h-20 flex-col justify-between rounded-md border px-2 py-2 text-left transition",
                      "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800",
                      hasData
                        ? "text-zinc-900 dark:text-zinc-50"
                        : "text-zinc-500 dark:text-zinc-400",
                      isCurrentYear
                        ? "ring-1 ring-zinc-900 ring-offset-1 ring-offset-white dark:ring-zinc-100 dark:ring-offset-zinc-900"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className="text-sm font-medium">{formatYearForDisplay(y, locale)}</span>
                    <div className="mt-2 flex items-center gap-1 text-[11px]">
                      {hasData && (
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      )}
                      {hasData && count > 1 && (
                        <span className="text-zinc-500 dark:text-zinc-400">
                          {t("calendar.records", { count })}
                        </span>
                      )}
                      {!hasData && (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          {t("calendar.noRecords")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              {t("calendar.legend.hintYearClick")}
            </div>
          </>
        )}
      </div>

      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && closeDay()}>
        <DialogContent
          showCloseButton={false}
          className="max-w-md overflow-hidden rounded-xl p-0 gap-0 transition-[min-height] duration-200 ease-out sm:max-w-md"
        >
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700 transition-all duration-200 ease-out">
            <DialogTitle asChild>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {t("calendar.modal.title")}
                </p>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedDateLabel}
                </p>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => selectedDate && handleAddForDay(selectedDate)}
                className="inline-flex gap-2 rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Plus className="h-4 w-4" />
                {t("calendar.modal.add")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={closeDay}
                aria-label={t("common.actions.close")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            className="min-h-[120px] max-h-[70vh] overflow-y-auto px-4 py-3 text-sm transition-all duration-200 ease-out"
          >
              {dailyLoading && (
                <div className="flex min-h-[80px] animate-in fade-in-0 duration-200 items-center justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-zinc-400 dark:text-zinc-500" />
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    {t("calendar.loading.transactions")}
                  </p>
                </div>
              )}
              {dailyError && !dailyLoading && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {dailyError}
                </p>
              )}
              {!dailyLoading &&
                !dailyError &&
                dailyItems.length === 0 && (
                  <div className="flex min-h-[80px] animate-in fade-in-0 duration-200 items-center justify-center py-6">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {t("calendar.modal.empty")}
                    </p>
                  </div>
                )}

              {!dailyLoading && !dailyError && dailyItems.length > 0 && (
                <ul className="animate-in fade-in-0 space-y-2 duration-200">
                  {dailyItems.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    return (
                      <li
                        key={tx.id}
                        className="flex items-start justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                      >
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <span
                            className={[
                              "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                              isIncome
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                          >
                            {isIncome ? (
                              <ArrowDownCircle className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowUpCircle className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              {tx.category && (
                                <span className="text-xs font-medium text-zinc-800 dark:text-zinc-100">
                                  {tx.category}
                                </span>
                              )}
                              {tx.note && (
                                <span className="text-xs text-zinc-600 dark:text-zinc-300">
                                  {tx.note}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                              {new Date(tx.occurredAt).toLocaleTimeString(locale, {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5 text-right">
                          <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                            {formatAmount(tx.amount, locale)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditInModal(tx)}
                            aria-label={t("common.actions.edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                            onClick={() => handleDeleteInModal(tx)}
                            aria-label={t("common.actions.delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
          </div>
        </DialogContent>
      </Dialog>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={formEditId}
        initialDate={formInitialDate}
        onSuccess={refreshDailyItems}
      />

      <TransactionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transaction={deleteTransaction}
        onConfirm={refreshDailyItems}
      />
    </div>
  );
}

