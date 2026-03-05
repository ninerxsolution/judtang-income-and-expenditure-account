"use client";

import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowDownCircle,
  ArrowLeftRight,
  ArrowUpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useIsDesktopOrLarger } from "@/hooks/use-mobile";
import { formatAmount } from "@/lib/format";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { useI18n } from "@/hooks/use-i18n";
import { useDashboardData } from "@/components/dashboard/dashboard-data-context";
import { TransactionFormDialog } from "@/components/dashboard/transaction-form-dialog";
import { TransactionDeleteDialog } from "@/components/dashboard/transaction-delete-dialog";
import { CalendarQuickActions } from "@/components/dashboard/calendar-quick-actions";
import { Skeleton } from "@/components/ui/skeleton";

type CalendarSummaryItem = {
  date: string; // YYYY-MM-DD
  hasTransactions: boolean;
  count: number;
  incomeCount?: number;
  expenseCount?: number;
  transferCount?: number;
};

type DailyTransaction = {
  id: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER" | string;
  amount: number;
  category: string | null;
  note: string | null;
  occurredAt: string;
  transferAccount?: { id: string; name: string } | null;
};

type CalendarDay = {
  date: Date;
  iso: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  hasTransactions: boolean;
  count: number;
  incomeCount: number;
  expenseCount: number;
  transferCount: number;
};

type ViewMode = "day" | "week" | "month" | "year";

type MonthSummaryItem = {
  monthIndex: number;
  hasTransactions: boolean;
  count: number;
  incomeCount?: number;
  expenseCount?: number;
  transferCount?: number;
};

type YearSummaryItem = {
  year: number;
  hasTransactions: boolean;
  count: number;
  incomeCount?: number;
  expenseCount?: number;
  transferCount?: number;
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

function formatDateTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const dateStr = d.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} ${timeStr}`;
}

function getMonthLabel(year: number, monthIndex: number, locale: string): string {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  });
}

function getWeekRangeLabel(
  weekStartIso: string,
  locale: string,
): string {
  const start = parseISODateOnly(weekStartIso);
  if (!start) return weekStartIso;
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startStr = start.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });
  const endStr = end.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
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
      incomeCount: s?.incomeCount ?? 0,
      expenseCount: s?.expenseCount ?? 0,
      transferCount: s?.transferCount ?? 0,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days,
    from: formatDateInput(gridStart),
    to: formatDateInput(gridEnd),
  };
}

function getMondayOfWeek(d: Date): string {
  const day = d.getDay();
  const toMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - toMonday);
  return formatDateInput(monday);
}

function addDays(iso: string, delta: number): string {
  const parsed = parseISODateOnly(iso);
  if (!parsed) return iso;
  parsed.setDate(parsed.getDate() + delta);
  return formatDateInput(parsed);
}

function buildWeekDays(
  weekStartIso: string,
  summary: CalendarSummaryItem[],
): { days: CalendarDay[]; from: string; to: string } {
  const start = parseISODateOnly(weekStartIso);
  if (!start) {
    return { days: [], from: weekStartIso, to: weekStartIso };
  }

  const todayIso = formatDateInput(new Date());
  const summaryMap = new Map<string, CalendarSummaryItem>();
  for (const item of summary) {
    summaryMap.set(item.date, item);
  }

  const days: CalendarDay[] = [];
  const cursor = new Date(start);

  for (let i = 0; i < 7; i++) {
    const iso = formatDateInput(cursor);
    const s = summaryMap.get(iso);
    days.push({
      date: new Date(cursor),
      iso,
      inCurrentMonth: true,
      isToday: iso === todayIso,
      hasTransactions: !!s?.hasTransactions,
      count: s?.count ?? 0,
      incomeCount: s?.incomeCount ?? 0,
      expenseCount: s?.expenseCount ?? 0,
      transferCount: s?.transferCount ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days,
    from: weekStartIso,
    to: formatDateInput(new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)),
  };
}

const WEEKDAY_LABEL_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function formatYearForDisplay(year: number, locale: string): string {
  if (locale === "th-TH" || locale === "th") {
    return String(year + 543);
  }
  return String(year);
}

type TransactionsCalendarProps = {
  showNewTransactionButton?: boolean;
  /** แสดงปุ่ม quick action รับ/จ่าย/โอน ในปฏิทิน (default: false) */
  showQuickActions?: boolean;
  /** full = 2-col layout + inline day panel, embedded = modal (default) */
  variant?: "full" | "embedded";
};

export function TransactionsCalendar({
  showNewTransactionButton: _ = true,
  showQuickActions = false,
  variant = "embedded",
}: TransactionsCalendarProps) {
  const { t, locale, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";

  const [formOpen, setFormOpen] = useState(false);
  const [formEditId, setFormEditId] = useState<string | null>(null);
  const [formInitialDate, setFormInitialDate] = useState<string | null>(null);
  const [formInitialType, setFormInitialType] = useState<
    "INCOME" | "EXPENSE" | "TRANSFER" | undefined
  >(undefined);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTransaction, setDeleteTransaction] =
    useState<DailyTransaction | null>(null);

  const [actionMenuTx, setActionMenuTx] =
    useState<DailyTransaction | null>(null);

  const isDesktop = useIsDesktopOrLarger();
  const today = useMemo(() => new Date(), []);
  const initialYear = today.getFullYear();

  const [{ year, monthIndex }, setMonthYear] = useState(() => ({
    year: initialYear,
    monthIndex: today.getMonth(), // 0-11
  }));
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [weekStartIso, setWeekStartIso] = useState<string>(() =>
    getMondayOfWeek(today),
  );

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

  const [refreshKey, setRefreshKey] = useState(0);

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

  const { days: weekDays, from: weekFrom, to: weekTo } = useMemo(() => {
    try {
      return buildWeekDays(weekStartIso, summary);
    } catch {
      return {
        days: [],
        from: weekStartIso,
        to: addDays(weekStartIso, 6),
      };
    }
  }, [weekStartIso, summary]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dailyItems, setDailyItems] = useState<DailyTransaction[]>([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyError, setDailyError] = useState<string | null>(null);

  // Load summary when month (day view) or week (week view) changes.
  useEffect(() => {
    if (viewMode !== "day" && viewMode !== "week") return;
    if (viewMode === "day" && !calendarReady) return;

    const controller = new AbortController();
    const rangeFrom = viewMode === "week" ? weekFrom : from;
    const rangeTo = viewMode === "week" ? weekTo : to;

    async function load() {
      setSummaryLoading(true);
      setSummaryError(null);
      try {
        const params = new URLSearchParams();
        params.set("from", rangeFrom);
        params.set("to", rangeTo);
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        const res = await fetch(
          `/api/transactions/calendar-summary?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
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
              incomeCount:
                typeof item.incomeCount === "number" &&
                  Number.isFinite(item.incomeCount)
                  ? item.incomeCount
                  : 0,
              expenseCount:
                typeof item.expenseCount === "number" &&
                  Number.isFinite(item.expenseCount)
                  ? item.expenseCount
                  : 0,
              transferCount:
                typeof item.transferCount === "number" &&
                  Number.isFinite(item.transferCount)
                  ? item.transferCount
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
  }, [from, to, weekFrom, weekTo, calendarReady, viewMode, t, refreshKey]);

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
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        const res = await fetch(
          `/api/transactions/month-summary?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
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
              incomeCount:
                typeof item.incomeCount === "number" &&
                  Number.isFinite(item.incomeCount)
                  ? item.incomeCount
                  : 0,
              expenseCount:
                typeof item.expenseCount === "number" &&
                  Number.isFinite(item.expenseCount)
                  ? item.expenseCount
                  : 0,
              transferCount:
                typeof item.transferCount === "number" &&
                  Number.isFinite(item.transferCount)
                  ? item.transferCount
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
  }, [viewMode, year, t, refreshKey]);

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
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        const res = await fetch(
          `/api/transactions/year-summary?${params.toString()}`,
          { signal: controller.signal, cache: "no-store" },
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
              incomeCount:
                typeof item.incomeCount === "number" &&
                  Number.isFinite(item.incomeCount)
                  ? item.incomeCount
                  : 0,
              expenseCount:
                typeof item.expenseCount === "number" &&
                  Number.isFinite(item.expenseCount)
                  ? item.expenseCount
                  : 0,
              transferCount:
                typeof item.transferCount === "number" &&
                  Number.isFinite(item.transferCount)
                  ? item.transferCount
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
  }, [viewMode, yearRangeStart, yearRangeEnd, t, refreshKey]);

  async function openDay(dateIso: string) {
    setSelectedDate(dateIso);
    setDailyItems([]);
    setDailyError(null);
    setDailyLoading(true);

    try {
      const params = new URLSearchParams();
      params.set("date", dateIso);
      params.set("limit", "200");
      params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      const res = await fetch(`/api/transactions?${params.toString()}`, { cache: "no-store" });
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
    setWeekStartIso(getMondayOfWeek(now));
    if (viewMode === "week") {
      return;
    }
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

  function goPrevWeek() {
    setWeekStartIso((iso) => addDays(iso, -7));
  }

  function goNextWeek() {
    setWeekStartIso((iso) => addDays(iso, 7));
  }

  function handleAddForDay(dateIso: string) {
    setFormEditId(null);
    setFormInitialDate(dateIso);
    setFormInitialType(undefined);
    setFormOpen(true);
  }

  function openQuickAdd(type: "INCOME" | "EXPENSE" | "TRANSFER") {
    setFormEditId(null);
    setFormInitialDate(formatDateInput(new Date()));
    setFormInitialType(type);
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

  function handleRowClick(tx: DailyTransaction) {
    setActionMenuTx(tx);
  }

  function handleActionEdit() {
    if (actionMenuTx) {
      setActionMenuTx(null);
      handleEditInModal(actionMenuTx);
    }
  }

  function handleActionDelete() {
    if (actionMenuTx) {
      setActionMenuTx(null);
      handleDeleteInModal(actionMenuTx);
    }
  }

  function refreshDailyItems() {
    if (selectedDate) {
      void openDay(selectedDate);
    }
  }

  const { refresh: refreshDashboard } = useDashboardData();

  function refreshCalendar() {
    setRefreshKey((k) => k + 1);
    refreshDailyItems();
    refreshDashboard();
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

  const monthCount = useMemo(() => {
    if (viewMode !== "day") return 0;
    return summary.reduce((acc, item) => {
      const [y, m] = item.date.split("-").map(Number);
      if (y === year && m === monthIndex + 1) return acc + (item.count ?? 0);
      return acc;
    }, 0);
  }, [summary, year, monthIndex, viewMode]);

  const dailyIncome = useMemo(
    () =>
      dailyItems.reduce(
        (sum, tx) => sum + (tx.type === "INCOME" ? tx.amount : 0),
        0,
      ),
    [dailyItems],
  );
  const dailyExpense = useMemo(
    () =>
      dailyItems.reduce(
        (sum, tx) => sum + (tx.type === "EXPENSE" ? tx.amount : 0),
        0,
      ),
    [dailyItems],
  );

  const selectedDateFullLabel = useMemo(() => {
    if (!selectedDate) return "";
    const parsed = parseISODateOnly(selectedDate);
    if (!parsed) return selectedDate;
    return parsed.toLocaleDateString(locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [selectedDate, locale]);

  const isFullVariant = variant === "full";

  const dayDetailContent = (
    <>
      {dailyLoading && (
        <div className="animate-in fade-in-0 space-y-2 duration-200">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      )}
      {dailyError && !dailyLoading && (
        <p className="text-xs text-red-600 dark:text-red-400">{dailyError}</p>
      )}
      {!dailyLoading &&
        !dailyError &&
        dailyItems.length === 0 && (
          <div className="flex min-h-[80px] animate-in fade-in-0 duration-200 items-center justify-center py-6">
            <p className="text-xs text-[#A09080] dark:text-stone-500">
              {t("calendar.modal.empty")}
            </p>
          </div>
        )}
      {!dailyLoading && !dailyError && dailyItems.length > 0 && (
        <ul className="animate-in fade-in-0 space-y-1.5 duration-200">
          {dailyItems.map((tx) => {
            const isIncome = tx.type === "INCOME";
            const isTransfer = tx.type === "TRANSFER";
            const iconStyle = isIncome
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : isTransfer
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
            const Icon = isIncome
              ? ArrowDownCircle
              : isTransfer
                ? ArrowLeftRight
                : ArrowUpCircle;
            return (
              <li
                key={tx.id}
                {...(!isDesktop && {
                  role: "button" as const,
                  tabIndex: 0,
                  onClick: () => handleRowClick(tx),
                  onKeyDown: (e: KeyboardEvent<HTMLLIElement>) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRowClick(tx);
                    }
                  },
                  "aria-label": t("transactions.list.tapToEditOrDelete"),
                })}
                className={[
                  "flex items-start justify-between gap-2 rounded-md border border-[#D4C9B0] bg-[#F5F0E8] px-2 py-1.5 dark:border-stone-700 dark:bg-stone-900",
                  !isDesktop &&
                    "cursor-pointer transition-colors hover:bg-[#F5F0E8]/80 dark:hover:bg-stone-800/80",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <div className="flex min-w-0 flex-1 items-start gap-2">
                  <span
                    className={[
                      "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      iconStyle,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1">
                      {tx.category && (
                        <span className="text-[11px] font-medium text-[#3D3020] dark:text-stone-100">
                          {getCategoryDisplayName(tx.category, localeKey)}
                        </span>
                      )}
                      {isTransfer && tx.transferAccount && (
                        <span className="text-[11px] font-medium text-[#3D3020] dark:text-stone-100">
                          {t("transactions.list.transferTo", {
                            account: tx.transferAccount.name,
                          })}
                        </span>
                      )}
                      {tx.note && (
                        <span className="text-[11px] text-[#6B5E4E] dark:text-stone-400">
                          {tx.note}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[10px] text-[#A09080] dark:text-stone-500">
                      {new Date(tx.occurredAt).toLocaleTimeString(locale, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5 text-right">
                  <span className="text-xs font-semibold tabular-nums text-[#3D3020] dark:text-stone-100 lg:text-sm">
                    {formatAmount(tx.amount)}
                  </span>
                  {isDesktop && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 lg:size-9"
                        onClick={() => handleEditInModal(tx)}
                        aria-label={t("common.actions.edit")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300 lg:size-9"
                        onClick={() => handleDeleteInModal(tx)}
                        aria-label={t("common.actions.delete")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-md border border-[#D4C9B0] bg-[#FDFAF4] text-sm dark:border-stone-700 dark:bg-stone-900">
              <button
                type="button"
                onClick={() => setViewMode("day")}
                className={`px-3 py-2 transition-colors duration-150 ease-out ${viewMode === "day"
                  ? "bg-[#5C6B52] text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-200 dark:hover:bg-stone-800"
                  } rounded-l-md font-medium`}
              >
                {t("calendar.view.day")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("week")}
                className={`border-l border-[#D4C9B0] px-3 py-2 dark:border-stone-700 font-medium transition-colors duration-150 ease-out ${viewMode === "week"
                  ? "bg-[#5C6B52] text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
              >
                {t("calendar.view.week")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("month")}
                className={`border-l border-[#D4C9B0] px-3 py-2 dark:border-stone-700 font-medium transition-colors duration-150 ease-out ${viewMode === "month"
                  ? "bg-[#5C6B52] text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
              >
                {t("calendar.view.month")}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("year")}
                className={`border-l border-[#D4C9B0] px-3 py-2 dark:border-stone-700 rounded-r-md font-medium transition-colors duration-150 ease-out ${viewMode === "year"
                  ? "bg-[#5C6B52] text-white dark:bg-stone-100 dark:text-stone-900"
                  : "text-[#3D3020] hover:bg-[#F5F0E8] dark:text-stone-200 dark:hover:bg-stone-800"
                  }`}
              >
                {t("calendar.view.year")}
              </button>
            </div>
            <button
              type="button"
              onClick={goToToday}
              className="rounded-md border border-[#D4C9B0] px-3 py-2 text-sm font-medium text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              {t("calendar.today")}
            </button>
          </div>
        </div>
        {/* {showNewTransactionButton && (
          <button
            type="button"
            onClick={() => {
              setFormEditId(null);
              setFormInitialDate(null);
              setFormInitialType(undefined);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-[#5C6B52] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-[#4A5E40] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
          >
            <Plus className="h-4 w-4" />
            {t("calendar.newTransaction")}
          </button>
        )} */}
      </div>

      <div
        className={`mt-6 rounded-xl border border-[#D4C9B0] bg-[#FDFAF4] shadow-sm dark:border-stone-700 dark:bg-stone-900/80 ${isFullVariant ? "overflow-hidden" : "p-2 sm:p-4"}`}
      >
        <div
          className={
            isFullVariant
              ? "grid grid-cols-1 lg:grid-cols-12"
              : ""
          }
        >
          <div
            className={
              isFullVariant
                ? "lg:col-span-7 border-r border-[#D4C9B0] dark:border-stone-700 p-2.5"
                : ""
            }
          >
            {/* Header & content depend on view mode */}
        {viewMode === "day" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {isFullVariant && (
                    <Calendar className="h-4 w-4 text-[#5C6B52] dark:text-stone-300" />
                  )}
                  <button
                    type="button"
                    onClick={goPrevMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="ml-2 text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {getMonthLabel(year, monthIndex, locale)}
                  </div>
                </div>
                {summaryError && !summaryLoading && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {summaryError}
                  </p>
                )}
              </div>

              {showQuickActions && (
                <CalendarQuickActions onQuickAdd={openQuickAdd} />
              )}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-[#A09080] dark:text-stone-500">
              {WEEKDAY_LABEL_KEYS.map((key) => (
                <div key={key} className="py-1">
                  {t(`calendar.weekdays.${key}`)}
                </div>
              ))}
            </div>

            {summaryLoading ? (
              <div className="mt-1 grid grid-cols-7 gap-1">
                {[...Array(35)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="mt-1 grid grid-cols-7 gap-1 text-xs">
                {days.map((day) => {
                  const isMuted = !day.inCurrentMonth;
                  const hasData = day.hasTransactions;
                  const isSelected = isFullVariant && selectedDate === day.iso;

                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => openDay(day.iso)}
                      className={[
                        "flex h-16 flex-col rounded-md border px-1.5 py-1 text-left transition-colors duration-150 ease-out",
                        "border-[#D4C9B0] bg-[#FDFAF4] hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800",
                        isMuted
                          ? "text-[#A09080] dark:text-stone-500"
                          : "text-[#3D3020] dark:text-stone-100",
                        day.isToday
                          ? "border-[#3D4A3A] dark:border-stone-100"
                          : "",
                        isSelected
                          ? "border-stone-500 dark:border-stone-100"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[11px] font-semibold">
                          {day.date.getDate()}
                        </span>
                        {day.isToday && (
                          <span className="rounded-full bg-[#5C6B52] px-1.5 py-0.5 text-[10px] font-medium text-white dark:bg-stone-100 dark:text-stone-900">
                            {t("calendar.today")}
                          </span>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-1 pt-1">
                        <div className="flex items-center gap-0.5">
                          {day.incomeCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                          {day.expenseCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                          )}
                          {day.transferCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        {hasData && (
                          <span className="text-[10px] text-[#A09080] dark:text-stone-500">
                            {day.count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between border-t border-[#D4C9B0] pt-3 dark:border-stone-700 text-[11px] text-[#A09080] dark:text-stone-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t("calendar.legend.income")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                <span>{t("calendar.legend.expense")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                <span>{t("calendar.legend.transfer")}</span>
              </div>
              <span>
                {isFullVariant
                  ? t("calendar.recordsInMonth", { count: monthCount })
                  : t("calendar.legend.hintDayClick")}
              </span>
            </div>
          </>
        )}

        {viewMode === "week" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={goPrevWeek}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={goNextWeek}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="ml-2 text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {getWeekRangeLabel(weekStartIso, locale)}
                  </div>
                </div>
                {summaryError && !summaryLoading && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {summaryError}
                  </p>
                )}
              </div>

              {showQuickActions && (
                <CalendarQuickActions onQuickAdd={openQuickAdd} />
              )}
            </div>

            {summaryLoading ? (
              <div className="mt-1 flex flex-col gap-1.5">
                {[...Array(7)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="mt-1 flex flex-col gap-1.5 text-xs">
                {weekDays.map((day, idx) => {
                  const hasData = day.hasTransactions;
                  const weekdayKey = WEEKDAY_LABEL_KEYS[idx];
                  return (
                    <button
                      key={day.iso}
                      type="button"
                      onClick={() => openDay(day.iso)}
                      className={[
                        "flex w-full flex-row items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ease-out",
                        "border-[#D4C9B0] bg-[#FDFAF4] hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800",
                        "text-[#3D3020] dark:text-stone-100",
                        day.isToday
                          ? "border-[#3D4A3A] dark:border-stone-100"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="flex min-w-14 flex-col sm:min-w-16">
                        <span className="text-[10px] font-medium uppercase tracking-wide text-[#A09080] dark:text-stone-500">
                          {t(`calendar.weekdays.${weekdayKey}`)}
                        </span>
                        <span className="text-sm font-semibold tabular-nums">
                          {day.date.toLocaleDateString(locale, {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </div>
                      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                        <div className="flex items-center gap-1">
                          {day.incomeCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                          {day.expenseCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                          )}
                          {day.transferCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        {hasData && (
                          <span className="text-[11px] text-[#A09080] dark:text-stone-500">
                            {day.count}
                          </span>
                        )}
                        {day.isToday && (
                          <span className="rounded-full bg-[#5C6B52] px-2 py-0.5 text-[10px] font-medium text-white dark:bg-stone-100 dark:text-stone-900">
                            {t("calendar.today")}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-[#A09080] dark:text-stone-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t("calendar.legend.income")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                <span>{t("calendar.legend.expense")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                <span>{t("calendar.legend.transfer")}</span>
              </div>
              <span>{t("calendar.legend.hintDayClick")}</span>
            </div>
          </>
        )}

        {viewMode === "month" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
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
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="ml-2 text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {formatYearForDisplay(year, locale)}
                  </div>
                </div>
                {monthSummaryLoading && (
                  <p className="text-xs text-[#A09080] dark:text-stone-500">
                    {t("calendar.loading.months")}
                  </p>
                )}
                {monthSummaryError && !monthSummaryLoading && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {monthSummaryError}
                  </p>
                )}
              </div>

              {showQuickActions && (
                <CalendarQuickActions onQuickAdd={openQuickAdd} />
              )}
            </div>

            {monthSummaryLoading ? (
              <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
                {Array.from({ length: 12 }, (_, idx) => {
                  const info = monthSummaryMap.get(idx);
                  const hasData = !!info?.hasTransactions;
                  const count = info?.count ?? 0;
                  const incomeCount = info?.incomeCount ?? 0;
                  const expenseCount = info?.expenseCount ?? 0;
                  const transferCount = info?.transferCount ?? 0;
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
                        "flex h-20 flex-col justify-between rounded-md border px-2 py-2 text-left transition-colors duration-150 ease-out",
                        "border-[#D4C9B0] bg-[#FDFAF4] hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800",
                        hasData
                          ? "text-[#3D3020] dark:text-stone-100"
                          : "text-[#A09080] dark:text-stone-500",
                        isCurrentMonth
                          ? "border-[#5C6B52] dark:border-stone-100"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="text-sm font-medium">
                        {getMonthShortLabel(idx)}
                      </span>
                      <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-0.5">
                          {incomeCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                          {expenseCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                          )}
                          {transferCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        {hasData && (
                          <span className="text-[#A09080] dark:text-stone-500">
                            {count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-[#A09080] dark:text-stone-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t("calendar.legend.income")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                <span>{t("calendar.legend.expense")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                <span>{t("calendar.legend.transfer")}</span>
              </div>
              <span>{t("calendar.legend.hintMonthClick")}</span>
            </div>
          </>
        )}

        {viewMode === "year" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setYearRangeStart((y) => y - 12)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setYearRangeStart((y) => y + 12)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#D4C9B0] text-[#3D3020] transition-colors duration-150 ease-out hover:bg-[#F5F0E8] dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="ml-2 text-sm font-medium text-[#3D3020] dark:text-stone-100">
                    {formatYearForDisplay(yearRangeStart, locale)}–{formatYearForDisplay(yearRangeEnd, locale)}
                  </div>
                </div>
                {yearSummaryError && !yearSummaryLoading && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {yearSummaryError}
                  </p>
                )}
              </div>

              {showQuickActions && (
                <CalendarQuickActions onQuickAdd={openQuickAdd} />
              )}
            </div>

            {yearSummaryLoading ? (
              <div className="mt-1 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {[...Array(12)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-md" />
                ))}
              </div>
            ) : (
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs sm:grid-cols-4">
                {Array.from(
                  { length: yearRangeEnd - yearRangeStart + 1 },
                  (_, idx) => yearRangeStart + idx,
                ).map((y) => {
                  const info = yearSummaryMap.get(y);
                  const hasData = !!info?.hasTransactions;
                  const count = info?.count ?? 0;
                  const incomeCount = info?.incomeCount ?? 0;
                  const expenseCount = info?.expenseCount ?? 0;
                  const transferCount = info?.transferCount ?? 0;
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
                        "flex h-20 flex-col justify-between rounded-md border px-2 py-2 text-left transition-colors duration-150 ease-out",
                        "border-[#D4C9B0] bg-[#FDFAF4] hover:bg-[#F5F0E8] dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800",
                        hasData
                          ? "text-[#3D3020] dark:text-stone-100"
                          : "text-[#A09080] dark:text-stone-500",
                        isCurrentYear
                          ? "border-[#5C6B52] dark:border-stone-100"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span className="text-sm font-medium">{formatYearForDisplay(y, locale)}</span>
                      <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-0.5">
                          {incomeCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                          {expenseCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                          )}
                          {transferCount > 0 && (
                            <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        {hasData && (
                          <span className="text-[#A09080] dark:text-stone-500">
                            {count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-[#A09080] dark:text-stone-500">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t("calendar.legend.income")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-red-500" />
                <span>{t("calendar.legend.expense")}</span>
                <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                <span>{t("calendar.legend.transfer")}</span>
              </div>
              <span>{t("calendar.legend.hintYearClick")}</span>
            </div>
          </>
        )}
          </div>

          {isFullVariant && (
            <div className="lg:col-span-5 flex flex-col min-h-[340px] border-t border-[#D4C9B0] lg:border-t-0 dark:border-stone-700">
              {selectedDate ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#D4C9B0] px-5 py-4 dark:border-stone-700">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[#A09080] dark:text-stone-500">
                        {t("calendar.modal.title")}
                      </p>
                      <h2 className="text-sm font-semibold text-[#3D3020] dark:text-stone-100">
                        {selectedDateFullLabel}
                      </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {/* {showQuickActions && selectedDate && (
                        <CalendarQuickActions
                          onQuickAdd={(type) =>
                            openQuickAddForDate(selectedDate, type)
                          }
                        />
                      )} */}
                      <Button
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
                  <div className="grid grid-cols-2 gap-4 border-b border-[#D4C9B0] px-5 py-2.5 dark:border-stone-700 bg-[#F5F0E8]/50 dark:bg-stone-900/50">
                    <div>
                      <p className="text-xs text-[#A09080] dark:text-stone-500">
                        {t("calendar.legend.income")}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                        +{formatAmount(dailyIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[#A09080] dark:text-stone-500">
                        {t("calendar.legend.expense")}
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
                        −{formatAmount(dailyExpense)}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[120px] max-h-[50vh] overflow-y-auto px-3 sm:px-5 py-3 text-sm">
                    {dayDetailContent}
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <p className="text-sm text-[#A09080] dark:text-stone-500">
                    {t("calendar.legend.hintDayClick")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!isFullVariant && (
      <Dialog open={!!selectedDate} onOpenChange={(open) => !open && closeDay()}>
        <DialogContent
          showCloseButton={false}
          className="flex max-h-[90vh] flex-col overflow-hidden rounded-xl p-0 gap-0 transition-[min-height] duration-200 ease-out sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#D4C9B0] px-4 py-3 dark:border-stone-700 transition-all duration-200 ease-out">
            <DialogTitle asChild>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-[#A09080] dark:text-stone-500">
                  {t("calendar.modal.title")}
                </p>
                <p className="text-sm font-semibold text-[#3D3020] dark:text-stone-100">
                  {selectedDateLabel}
                </p>
              </div>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => selectedDate && handleAddForDay(selectedDate)}
                className="inline-flex gap-2 rounded-md bg-[#5C6B52] px-3 py-2 text-sm font-medium text-white transition-colors duration-150 ease-out hover:bg-[#4A5E40] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
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
            className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-sm transition-all duration-200 ease-out"
          >
            {dayDetailContent}
          </div>
        </DialogContent>
      </Dialog>
      )}

      <Dialog
        open={!!actionMenuTx}
        onOpenChange={(open) => !open && setActionMenuTx(null)}
      >
        <DialogContent showCloseButton={true} className="max-w-xs gap-4 p-4">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t("transactions.list.selectAction")}
            </DialogTitle>
          </DialogHeader>
          {actionMenuTx && (
            <div className="space-y-1.5 rounded-lg border border-[#E8E0C8] bg-[#F5F0E8]/50 px-3 py-2.5 text-sm dark:border-stone-700 dark:bg-stone-800/50">
              <p className="font-medium text-[#3D3020] dark:text-stone-100">
                {formatDateTime(actionMenuTx.occurredAt, locale)}
              </p>
              <p className="truncate text-[#6B5E4E] dark:text-stone-300">
                {actionMenuTx.type === "TRANSFER" && actionMenuTx.transferAccount
                  ? t("transactions.list.transferTo", {
                      account: actionMenuTx.transferAccount.name,
                    })
                  : actionMenuTx.category
                    ? getCategoryDisplayName(
                        actionMenuTx.category,
                        localeKey,
                      )
                    : actionMenuTx.note ?? "—"}
              </p>
              <p
                className={`tabular-nums font-medium ${
                  actionMenuTx.type === "INCOME"
                    ? "text-emerald-600 dark:text-emerald-300"
                    : actionMenuTx.type === "TRANSFER"
                      ? "text-blue-600 dark:text-blue-300"
                      : "text-red-600 dark:text-red-300"
                }`}
              >
                {actionMenuTx.type === "INCOME"
                  ? "+"
                  : actionMenuTx.type === "TRANSFER"
                    ? ""
                    : "-"}
                {formatAmount(actionMenuTx.amount)}
              </p>
            </div>
          )}
          <div className="flex flex-row gap-2">
            <Button
              variant="outline"
              className="w-1/2 gap-2"
              onClick={handleActionEdit}
            >
              <Pencil className="h-4 w-4" />
              {t("common.actions.edit")}
            </Button>
            <Button
              variant="outline"
              className="w-1/2 gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
              onClick={handleActionDelete}
            >
              <Trash2 className="h-4 w-4" />
              {t("common.actions.delete")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editId={formEditId}
        initialDate={formInitialDate}
        initialType={formInitialType}
        onSuccess={refreshCalendar}
      />

      <TransactionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        transaction={deleteTransaction}
        onConfirm={refreshCalendar}
      />
    </div>
  );
}
