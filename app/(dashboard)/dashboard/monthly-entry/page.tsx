"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  X,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowLeftRight,
  CalendarRange,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { formatYearForDisplay } from "@/lib/format-year";
import { getCategoryDisplayName } from "@/lib/categories-display";
import {
  AccountCombobox,
  AccountIcon,
  type AccountOption,
} from "@/components/dashboard/account-combobox";
import { RowSelect } from "@/components/dashboard/row-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TransactionType = "INCOME" | "EXPENSE" | "TRANSFER";

type RowEntry = {
  id: string;
  type: TransactionType;
  amount: string;
  categoryId: string;
  financialAccountId: string;
  transferAccountId: string;
  note: string;
};

type Category = { id: string; name: string; nameEn?: string | null };

type ExistingTransaction = {
  id: string;
  type: string;
  amount: number;
  financialAccount?: {
    id: string;
    name: string;
    type?: string;
    bankName?: string | null;
    cardNetwork?: string | null;
  } | null;
  transferAccount?: {
    id: string;
    name: string;
    type?: string;
    bankName?: string | null;
    cardNetwork?: string | null;
  } | null;
  categoryRef?: { id: string; name: string; nameEn?: string | null } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
};

function generateRowId(): string {
  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptyRow(defaultAccountId: string): RowEntry {
  return {
    id: generateRowId(),
    type: "EXPENSE",
    amount: "",
    categoryId: "",
    financialAccountId: defaultAccountId,
    transferAccountId: "",
    note: "",
  };
}

function sanitizeAmountInput(value: string): string {
  const noComma = value.replace(/,/g, "");
  const digitsAndDot = noComma.replace(/[^\d.]/g, "");
  const parts = digitsAndDot.split(".");
  const intPart = parts[0] ?? "";
  const decPart = parts.length > 1 ? parts.slice(1).join("").slice(0, 2) : "";
  return parts.length > 1 ? `${intPart}.${decPart}` : intPart;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

const TYPE_OPTIONS: TransactionType[] = ["INCOME", "EXPENSE", "TRANSFER"];

function TypeIcon({ type, className }: { type: TransactionType; className?: string }) {
  switch (type) {
    case "INCOME":
      return <ArrowDownCircle className={cn("text-emerald-600 dark:text-emerald-400", className)} />;
    case "EXPENSE":
      return <ArrowUpCircle className={cn("text-red-600 dark:text-red-400", className)} />;
    case "TRANSFER":
      return <ArrowLeftRight className={cn("text-blue-600 dark:text-blue-400", className)} />;
  }
}

function getInitialYearMonth(searchParams: URLSearchParams): { year: number; month: number } {
  const now = new Date();
  const dateParam = searchParams.get("date");
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (y && m >= 1 && m <= 12) {
        return { year: y, month: m - 1 };
      }
    }
  }
  return { year: now.getFullYear(), month: now.getMonth() };
}

export default function MonthlyEntryPage() {
  const { t, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";
  const searchParams = useSearchParams();
  const hasScrolledToHighlight = useRef(false);

  const now = new Date();
  const [year, setYear] = useState(() => getInitialYearMonth(searchParams).year);
  const [month, setMonth] = useState(() => getInitialYearMonth(searchParams).month);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [existingTransactions, setExistingTransactions] = useState<ExistingTransaction[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // day (1-based) -> RowEntry[]
  const [dayRows, setDayRows] = useState<Record<number, RowEntry[]>>({});
  const [saving, setSaving] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<{
    id: string;
    day: number;
  } | null>(null);
  const [editingRow, setEditingRow] = useState<RowEntry | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const defaultAccountId = accounts.length > 0 ? accounts[0].id : "";
  const daysInMonth = getDaysInMonth(year, month);

  const monthLabel = useMemo(() => {
    const d = new Date(year, month, 1);
    const monthName = d.toLocaleDateString(localeKey === "th" ? "th-TH" : "en-US", {
      month: "long",
    });
    const displayYear = formatYearForDisplay(year, language);
    return `${monthName} ${displayYear}`;
  }, [year, month, localeKey, language]);

  const monthOptions = useMemo(() => {
    const locale = localeKey === "th" ? "th-TH" : "en-US";
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2024, i, 1);
      const label = d.toLocaleDateString(locale, { month: "long" });
      return { value: i, label };
    });
  }, [localeKey]);

  const yearRange = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => current - 5 + i);
  }, []);

  // Fetch categories + accounts
  useEffect(() => {
    setLoadingMeta(true);
    Promise.all([
      fetch("/api/categories").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/financial-accounts").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([cats, accs]: [Category[], (AccountOption & { isActive?: boolean; isDefault?: boolean })[]]) => {
        setCategories(Array.isArray(cats) ? cats : []);
        const activeAccounts = (Array.isArray(accs) ? accs : [])
          .filter((a) => a.isActive !== false)
          .map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type ?? "BANK",
            bankName: a.bankName ?? null,
            cardNetwork: a.cardNetwork ?? null,
            isDefault: a.isDefault,
          }));
        setAccounts(activeAccounts);
      })
      .catch(() => {
        setCategories([]);
        setAccounts([]);
      })
      .finally(() => setLoadingMeta(false));
  }, []);

  // Track current year/month so we ignore stale fetch results (race when date param syncs month)
  const yearMonthRef = useRef({ year, month });
  useEffect(() => {
    yearMonthRef.current = { year, month };
  }, [year, month]);

  // Fetch existing transactions for the selected month
  const fetchExisting = useCallback(async () => {
    setLoadingExisting(true);
    const fetchYear = year;
    const fetchMonth = month;
    try {
      const fromDate = `${fetchYear}-${String(fetchMonth + 1).padStart(2, "0")}-01`;
      const lastDay = getDaysInMonth(fetchYear, fetchMonth);
      const toDate = `${fetchYear}-${String(fetchMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        timezone: tz,
        limit: "200",
        offset: "0",
      });
      const res = await fetch(`/api/transactions?${params}`);
      const current = yearMonthRef.current;
      if (current.year !== fetchYear || current.month !== fetchMonth) {
        return; // User changed month; ignore stale result
      }
      if (res.ok) {
        const data = (await res.json()) as ExistingTransaction[];
        setExistingTransactions(Array.isArray(data) ? data : []);
      } else {
        setExistingTransactions([]);
      }
    } catch {
      if (yearMonthRef.current.year === fetchYear && yearMonthRef.current.month === fetchMonth) {
        setExistingTransactions([]);
      }
    } finally {
      if (yearMonthRef.current.year === fetchYear && yearMonthRef.current.month === fetchMonth) {
        setLoadingExisting(false);
      }
    }
  }, [year, month]);

  useEffect(() => {
    void fetchExisting();
    setDayRows({});
    setEditingTransaction(null);
    setEditingRow(null);
  }, [fetchExisting]);

  // Sync year/month from ?date=YYYY-MM-DD when navigating from transactions list
  const dateParam = searchParams.get("date");
  useEffect(() => {
    if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) return;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateParam);
    if (!match) return;
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (y && m >= 1 && m <= 12) {
      setYear(y);
      setMonth(m - 1);
    }
  }, [dateParam]);

  // Scroll to and blink the highlighted transaction when ?highlight=id is present
  const highlightParam = searchParams.get("highlight");
  useEffect(() => {
    hasScrolledToHighlight.current = false;
  }, [highlightParam]);

  useEffect(() => {
    if (!highlightParam || loadingExisting || hasScrolledToHighlight.current) return;

    function findScrollParent(el: Element): Element | null {
      let parent = el.parentElement;
      while (parent) {
        const { overflowY } = getComputedStyle(parent);
        if ((overflowY === "auto" || overflowY === "scroll") && parent.scrollHeight > parent.clientHeight) {
          return parent;
        }
        parent = parent.parentElement;
      }
      return null;
    }

    function doScrollAndBlink(): ReturnType<typeof setTimeout> | null {
      const el = document.getElementById(`tx-${highlightParam}`);
      if (el) {
        hasScrolledToHighlight.current = true;
        const scrollParent = findScrollParent(el);
        if (scrollParent) {
          const elTop = el.getBoundingClientRect().top + scrollParent.scrollTop;
          const centerOffset = scrollParent.clientHeight / 2 - el.getBoundingClientRect().height / 2;
          scrollParent.scrollTo({ top: elTop - centerOffset - 96, behavior: "smooth" });
        } else {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        el.classList.add("tx-blink-once");
        return setTimeout(() => el.classList.remove("tx-blink-once"), 1100);
      }
      // Fallback: scroll to day section if we have date param
      if (dateParam) {
        const match = /^\d{4}-\d{2}-\d{2}$/.exec(dateParam);
        if (match) {
          const day = parseInt(match[3], 10);
          const dayEl = document.getElementById(`day-${day}`);
          if (dayEl) {
            hasScrolledToHighlight.current = true;
            const scrollParent = findScrollParent(dayEl);
            if (scrollParent) {
              const dayTop = dayEl.getBoundingClientRect().top + scrollParent.scrollTop;
              scrollParent.scrollTo({ top: dayTop - 96, behavior: "smooth" });
            } else {
              dayEl.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }
        }
      }
      return null;
    }

    // Defer scroll: DOM may not be ready after client-side nav; retry if needed
    let blinkTimer: ReturnType<typeof setTimeout> | null = null;
    const t = setTimeout(() => {
      blinkTimer = doScrollAndBlink();
    }, 100);
    const retry = setTimeout(() => {
      if (hasScrolledToHighlight.current) return;
      blinkTimer = doScrollAndBlink();
    }, 400);
    return () => {
      clearTimeout(t);
      clearTimeout(retry);
      if (blinkTimer) clearTimeout(blinkTimer);
    };
  }, [highlightParam, loadingExisting, existingTransactions, dateParam]);

  // Group existing transactions by day
  const existingByDay = useMemo(() => {
    const map: Record<number, ExistingTransaction[]> = {};
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    for (const tx of existingTransactions) {
      const d = new Date(tx.occurredAt);
      const localDay = parseInt(
        new Intl.DateTimeFormat("en-CA", { timeZone: tz, day: "numeric" }).format(d),
        10,
      );
      if (!map[localDay]) map[localDay] = [];
      map[localDay].push(tx);
    }
    return map;
  }, [existingTransactions]);

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  }

  function addRow(day: number) {
    setDayRows((prev) => ({
      ...prev,
      [day]: [...(prev[day] ?? []), createEmptyRow(defaultAccountId)],
    }));
  }

  function removeRow(day: number, rowId: string) {
    setDayRows((prev) => {
      const rows = (prev[day] ?? []).filter((r) => r.id !== rowId);
      const next = { ...prev };
      if (rows.length === 0) {
        delete next[day];
      } else {
        next[day] = rows;
      }
      return next;
    });
  }

  function updateRow(day: number, rowId: string, field: keyof RowEntry, value: string) {
    setDayRows((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).map((r) =>
        r.id === rowId
          ? {
              ...r,
              [field]: field === "amount" ? sanitizeAmountInput(value) : value,
            }
          : r,
      ),
    }));
  }

  function startEditing(tx: ExistingTransaction, day: number) {
    setEditingTransaction({ id: tx.id, day });
    setEditingRow({
      id: tx.id,
      type: tx.type as TransactionType,
      amount: String(tx.amount),
      categoryId: tx.categoryRef?.id ?? "",
      financialAccountId: tx.financialAccount?.id ?? defaultAccountId,
      transferAccountId: tx.transferAccount?.id ?? "",
      note: tx.note ?? "",
    });
  }

  function updateEditingRow(field: keyof RowEntry, value: string) {
    setEditingRow((prev) =>
      prev
        ? {
            ...prev,
            [field]: field === "amount" ? sanitizeAmountInput(value) : value,
          }
        : null,
    );
  }

  function cancelEditing() {
    setEditingTransaction(null);
    setEditingRow(null);
  }

  async function saveEditingTransaction() {
    if (!editingTransaction || !editingRow) return;
    const amt = parseFloat(editingRow.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error(t("monthlyEntry.validationAmountRequired"));
      return;
    }

    setSavingEdit(true);
    try {
      const dateObj = new Date(year, month, editingTransaction.day);
      const nowTime = new Date();
      dateObj.setHours(nowTime.getHours(), nowTime.getMinutes(), nowTime.getSeconds());

      const body = {
        type: editingRow.type,
        amount: amt,
        financialAccountId: editingRow.financialAccountId || defaultAccountId,
        occurredAt: dateObj.toISOString(),
        categoryId: editingRow.categoryId || null,
        note: editingRow.note.trim() || null,
        ...(editingRow.type === "TRANSFER" && {
          transferAccountId: editingRow.transferAccountId || null,
        }),
      };

      const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(t("monthlyEntry.editSuccess"));
        cancelEditing();
        void fetchExisting();
      } else {
        toast.error(t("monthlyEntry.editFailed"));
      }
    } catch {
      toast.error(t("monthlyEntry.editFailed"));
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteEditingTransaction() {
    if (!editingTransaction) return;

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success(t("monthlyEntry.deleteSuccess"));
        cancelEditing();
        void fetchExisting();
      } else {
        toast.error(t("monthlyEntry.deleteFailed"));
      }
    } catch {
      toast.error(t("monthlyEntry.deleteFailed"));
    } finally {
      setSavingEdit(false);
    }
  }

  // Count new entries
  const newEntryCount = useMemo(() => {
    let count = 0;
    for (const rows of Object.values(dayRows)) {
      for (const row of rows) {
        const amt = parseFloat(row.amount);
        if (Number.isFinite(amt) && amt > 0) count++;
      }
    }
    return count;
  }, [dayRows]);

  // Calculate totals (existing + new)
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of existingTransactions) {
      if (tx.type === "INCOME") income += tx.amount;
      if (tx.type === "EXPENSE") expense += tx.amount;
    }
    for (const rows of Object.values(dayRows)) {
      for (const row of rows) {
        const amt = parseFloat(row.amount);
        if (!Number.isFinite(amt) || amt <= 0) continue;
        if (row.type === "INCOME") income += amt;
        if (row.type === "EXPENSE") expense += amt;
      }
    }
    return { income, expense };
  }, [existingTransactions, dayRows]);

  async function handleSave() {
    const transactions: {
      type: string;
      amount: number;
      financialAccountId: string;
      transferAccountId?: string;
      categoryId?: string;
      note?: string;
      occurredAt: string;
    }[] = [];

    for (const [dayStr, rows] of Object.entries(dayRows)) {
      const day = parseInt(dayStr, 10);
      for (const row of rows) {
        const amt = parseFloat(row.amount);
        if (!Number.isFinite(amt) || amt <= 0) continue;

        const dateObj = new Date(year, month, day);
        const nowTime = new Date();
        dateObj.setHours(nowTime.getHours(), nowTime.getMinutes(), nowTime.getSeconds());

        const entry: (typeof transactions)[number] = {
          type: row.type,
          amount: amt,
          financialAccountId: row.financialAccountId || defaultAccountId,
          occurredAt: dateObj.toISOString(),
        };
        if (row.categoryId) entry.categoryId = row.categoryId;
        if (row.note.trim()) entry.note = row.note.trim();
        if (row.type === "TRANSFER" && row.transferAccountId) {
          entry.transferAccountId = row.transferAccountId;
        }
        transactions.push(entry);
      }
    }

    if (transactions.length === 0) return;

    setSaving(true);
    try {
      const res = await fetch("/api/transactions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions }),
      });

      if (res.ok) {
        const data = (await res.json()) as { createdCount: number };
        toast.success(t("monthlyEntry.saveSuccess", { count: data.createdCount }));
        setDayRows({});
        void fetchExisting();
      } else {
        toast.error(t("monthlyEntry.saveFailed"));
      }
    } catch {
      toast.error(t("monthlyEntry.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  // Check which days have content (existing or new)
  const daysWithContent = useMemo(() => {
    const days = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      if (existingByDay[d]?.length || dayRows[d]?.length) {
        days.add(d);
      }
    }
    return days;
  }, [existingByDay, dayRows, daysInMonth]);

  const scrollToDay = (day: number) => {
    document.getElementById(`day-${day}`)?.scrollIntoView({ behavior: "smooth" });
  };

  const tocDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dayDate = new Date(year, month, d);
      const dayOfWeek = dayDate.toLocaleDateString(
        localeKey === "th" ? "th-TH" : "en-US",
        { weekday: "short" },
      );
      const existing = existingByDay[d] ?? [];
      const newRows = dayRows[d] ?? [];
      let income = 0;
      let expense = 0;
      let transfer = 0;
      for (const tx of existing) {
        if (tx.type === "INCOME") income += 1;
        else if (tx.type === "EXPENSE") expense += 1;
        else if (tx.type === "TRANSFER") transfer += 1;
      }
      for (const row of newRows) {
        if (row.type === "INCOME") income += 1;
        else if (row.type === "EXPENSE") expense += 1;
        else if (row.type === "TRANSFER") transfer += 1;
      }
      const isToday =
        year === today.getFullYear() &&
        month === today.getMonth() &&
        d === today.getDate();
      return {
        day: d,
        label: `${d} ${dayOfWeek}`,
        income,
        expense,
        transfer,
        isToday,
      };
    });
  }, [daysInMonth, year, month, localeKey, existingByDay, dayRows]);

  if (loadingMeta) {
    return (
      <div className="px-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-8">
      {/* Table of contents - left sidebar (dates) */}
      <nav
        aria-label={t("settings.contents")}
        className="sticky top-24 self-start hidden max-h-[calc(90vh-7rem)] w-44 shrink-0 overflow-y-auto lg:block"
      >
        <div className="space-y-1 pb-2 pr-2">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("settings.contents")}
          </p>
          {tocDays.map(({ day, label, income, expense, transfer, isToday }) => (
            <button
              key={day}
              type="button"
              onClick={() => scrollToDay(day)}
              className={cn(
                "flex items-center justify-between w-full px-2 py-1.5 text-left text-sm hover:bg-muted rounded-md transition-all"
              )}
              aria-label={`${label}, ${t("monthlyEntry.income")} ${income}, ${t("monthlyEntry.expense")} ${expense}, ${t("monthlyEntry.transfer")} ${transfer}`}
            >
              <span className={cn("block", isToday ? "text-foreground font-bold" : "text-muted-foreground")}>{label}</span>
              {(income > 0 || expense > 0 || transfer > 0) && (
                <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0 text-xs">
                  {income > 0 && (
                    <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400" title={t("monthlyEntry.income")}>
                      {income}
                    </span>
                  )}
                  {expense > 0 && (
                    <span className="font-medium tabular-nums text-red-600 dark:text-red-400" title={t("monthlyEntry.expense")}>
                      {expense}
                    </span>
                  )}
                  {transfer > 0 && (
                    <span className="font-medium tabular-nums text-blue-600 dark:text-blue-400" title={t("monthlyEntry.transfer")}>
                      {transfer}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content - extra pb so sticky summary bar doesn't cover last day */}
      <div className="min-w-0 flex-1 px-4 pb-0 space-y-4 min-h-0">
      {/* Month/Year navigation */}
      <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-background py-2 -mx-4 px-4">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-muted-foreground shrink-0" />
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
        </div>
        <div className="inline-flex items-center gap-1 self-start rounded-lg border border-[#D4C9B0] bg-[#FDFAF4] p-1 dark:border-stone-700 dark:bg-stone-900">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={prevMonth}
            aria-label={t("monthlyEntry.prevMonth")}
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
              aria-label={t("monthlyEntry.selectMonth")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
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
              aria-label={t("monthlyEntry.selectYear")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearRange.map((y) => (
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
            onClick={nextMonth}
            aria-label={t("monthlyEntry.nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Loading existing */}
      {loadingExisting && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("transactions.list.loading")}</span>
        </div>
      )}

      {/* Days */}
      <div className="space-y-3">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const existing = existingByDay[day] ?? [];
          const newRows = dayRows[day] ?? [];
          const hasContent = existing.length > 0 || newRows.length > 0;

          const dayDate = new Date(year, month, day);
          const dayOfWeek = dayDate.toLocaleDateString(
            localeKey === "th" ? "th-TH" : "en-US",
            { weekday: "short" },
          );
          const isToday =
            day === now.getDate() &&
            month === now.getMonth() &&
            year === now.getFullYear();

          return (
            <div
              key={day}
              id={`day-${day}`}
              className="group scroll-mt-16"
            >
              {/* Day header */}
              <div className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center h-7 w-7 rounded-full text-sm font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {day}
                  </span>
                  <span className="text-xs text-muted-foreground">{dayOfWeek}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={() => addRow(day)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("monthlyEntry.addRow")}
                </Button>
              </div>

              {/* Existing transactions */}
              {existing.length > 0 && (
                <div className="space-y-2 mb-1">
                  {existing.map((tx) => {
                    const isEditing =
                      editingTransaction?.id === tx.id &&
                      editingTransaction?.day === day &&
                      editingRow;

                    if (isEditing) {
                      return (
                        <div
                          key={tx.id}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <div className="w-30">
                            <RowSelect
                              value={editingRow.type}
                              onChange={(v) => updateEditingRow("type", v)}
                              options={TYPE_OPTIONS.map((t) => ({
                                value: t,
                                label:
                                  t === "INCOME"
                                    ? localeKey === "th"
                                      ? "รายรับ"
                                      : "Income"
                                    : t === "EXPENSE"
                                      ? localeKey === "th"
                                        ? "รายจ่าย"
                                        : "Expense"
                                      : localeKey === "th"
                                        ? "โอน"
                                        : "Transfer",
                              }))}
                              renderOptionIcon={(opt) => (
                                <TypeIcon
                                  type={opt.value as TransactionType}
                                  className="h-4 w-4"
                                />
                              )}
                              className="h-9 py-1 text-xs"
                            />
                          </div>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder={t("monthlyEntry.amount")}
                            value={editingRow.amount}
                            onChange={(e) =>
                              updateEditingRow("amount", e.target.value)
                            }
                            className="w-30 h-9 text-xs tabular-nums text-right"
                          />
                          <div className="w-40">
                            <RowSelect
                              value={editingRow.categoryId}
                              onChange={(v) =>
                                updateEditingRow("categoryId", v)
                              }
                              options={categories.map((c) => ({
                                value: c.id,
                                label: getCategoryDisplayName(c.name, language, c.nameEn),
                              }))}
                              allowEmpty
                              emptyLabel={t("monthlyEntry.category")}
                              className="h-9 py-1 text-xs"
                            />
                          </div>
                          <div className="w-60">
                            <AccountCombobox
                              value={editingRow.financialAccountId}
                              onChange={(id) =>
                                updateEditingRow("financialAccountId", id)
                              }
                              accounts={accounts}
                              className="!py-1 !text-xs !h-9"
                            />
                          </div>
                          {editingRow.type === "TRANSFER" && (
                            <div className="w-60">
                              <AccountCombobox
                                value={editingRow.transferAccountId}
                                onChange={(id) =>
                                  updateEditingRow("transferAccountId", id)
                                }
                                accounts={accounts}
                                excludeIds={
                                  editingRow.financialAccountId
                                    ? [editingRow.financialAccountId]
                                    : []
                                }
                                allowEmpty
                                emptyLabel={`→ ${t("transactions.new.toAccount")}`}
                                className="!py-1 !text-xs !h-9"
                              />
                            </div>
                          )}
                          <Input
                            type="text"
                            placeholder={t("monthlyEntry.note")}
                            value={editingRow.note}
                            onChange={(e) =>
                              updateEditingRow("note", e.target.value)
                            }
                            className="flex-1 min-w-24 h-9 text-xs"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={saveEditingTransaction}
                            disabled={savingEdit}
                            aria-label={t("monthlyEntry.saveEdit")}
                          >
                            {savingEdit ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={cancelEditing}
                            disabled={savingEdit}
                            aria-label={t("monthlyEntry.cancel")}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={deleteEditingTransaction}
                            disabled={savingEdit}
                            aria-label={t("monthlyEntry.removeRow")}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={tx.id}
                        id={`tx-${tx.id}`}
                        type="button"
                        onClick={() => startEditing(tx, day)}
                        className="scroll-mt-24 flex w-full items-center gap-2 text-sm py-1 px-2 rounded bg-muted/40 hover:bg-muted/60 cursor-pointer text-left transition-colors"
                        aria-label={t("monthlyEntry.editTransaction")}
                      >
                        <TypeIcon
                          type={tx.type as TransactionType}
                          className="h-3.5 w-3.5 shrink-0"
                        />
                        <span className="font-medium tabular-nums min-w-16 text-right">
                          {formatAmount(tx.amount)}
                        </span>
                        <span className="text-muted-foreground text-xs truncate">
                          {tx.categoryRef?.name
                            ? getCategoryDisplayName(
                                tx.categoryRef.name,
                                language,
                                tx.categoryRef.nameEn
                              )
                            : tx.category ?? ""}
                        </span>
                        {tx.note && (
                          <span className="text-muted-foreground/60 text-xs truncate hidden sm:inline">
                            {tx.note}
                          </span>
                        )}
                        {tx.financialAccount && (
                          <span className="flex items-center gap-1 text-muted-foreground/60 text-xs truncate ml-auto hidden sm:inline-flex">
                            <AccountIcon
                              account={{
                                id: tx.financialAccount.id,
                                name: tx.financialAccount.name,
                                type: tx.financialAccount.type ?? "BANK",
                                bankName: tx.financialAccount.bankName,
                                cardNetwork: tx.financialAccount.cardNetwork,
                              }}
                              size="sm"
                            />
                            {tx.financialAccount.name}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* New entry rows */}
              {newRows.length > 0 && (
                <div className="mt-2 space-y-2 mb-1">
                  {newRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-2"
                    >
                      {/* Type select */}
                      <div className="w-30">
                        <RowSelect
                          value={row.type}
                          onChange={(v) =>
                            updateRow(day, row.id, "type", v)
                          }
                          options={TYPE_OPTIONS.map((t) => ({
                            value: t,
                            label:
                              t === "INCOME"
                                ? localeKey === "th"
                                  ? "รายรับ"
                                  : "Income"
                                : t === "EXPENSE"
                                  ? localeKey === "th"
                                    ? "รายจ่าย"
                                    : "Expense"
                                  : localeKey === "th"
                                    ? "โอน"
                                    : "Transfer",
                          }))}
                          renderOptionIcon={(opt) => (
                            <TypeIcon
                              type={opt.value as TransactionType}
                              className="h-4 w-4"
                            />
                          )}
                          className="h-9 py-1 text-xs"
                        />
                      </div>

                      {/* Amount */}
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder={t("monthlyEntry.amount")}
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(day, row.id, "amount", e.target.value)
                        }
                        className="w-30 h-9 text-xs tabular-nums text-right"
                      />

                      {/* Category */}
                      <div className="w-40">
                        <RowSelect
                          value={row.categoryId}
                          onChange={(v) =>
                            updateRow(day, row.id, "categoryId", v)
                          }
                          options={categories.map((c) => ({
                            value: c.id,
                            label: getCategoryDisplayName(c.name, language, c.nameEn),
                          }))}
                          allowEmpty
                          emptyLabel={t("monthlyEntry.category")}
                          className="h-9 py-1 text-xs"
                        />
                      </div>

                      {/* Account */}
                      <div className="w-[15rem]">
                        <AccountCombobox
                          value={row.financialAccountId}
                          onChange={(id) =>
                            updateRow(day, row.id, "financialAccountId", id)
                          }
                          accounts={accounts}
                          className="!py-1 !text-xs !h-9"
                        />
                      </div>

                      {/* Transfer account (only for TRANSFER) */}
                      {row.type === "TRANSFER" && (
                        <div className="w-[15rem]">
                          <AccountCombobox
                            value={row.transferAccountId}
                            onChange={(id) =>
                              updateRow(day, row.id, "transferAccountId", id)
                            }
                            accounts={accounts}
                            excludeIds={row.financialAccountId ? [row.financialAccountId] : []}
                            allowEmpty
                            emptyLabel={`→ ${t("transactions.new.toAccount")}`}
                            className="!py-1 !text-xs !h-9"
                          />
                        </div>
                      )}

                      {/* Note */}
                      <Input
                        type="text"
                        placeholder={t("monthlyEntry.note")}
                        value={row.note}
                        onChange={(e) =>
                          updateRow(day, row.id, "note", e.target.value)
                        }
                        className="flex-1 min-w-[6rem] h-9 text-xs"
                      />

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(day, row.id)}
                        aria-label={t("monthlyEntry.removeRow")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

             
                <div className="ml-9 py-0.5">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground/90 hover:text-muted-foreground transition-colors"
                    onClick={() => addRow(day)}
                  >
                    + {t("monthlyEntry.addRow")}
                  </button>
                </div>

              {/* Divider */}
              {(hasContent || daysWithContent.has(day)) && (
                <div className="border-b border-border/50 mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary + Save */}
      <div className="sticky bottom-0 bg-background pt-3 pb-2 -mx-4 px-4 space-y-3">
        {/* Totals */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <ArrowDownCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-muted-foreground">{t("monthlyEntry.totalIncome")}:</span>
            <span className="font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
              ฿{formatAmount(totals.income)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowUpCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-muted-foreground">{t("monthlyEntry.totalExpense")}:</span>
            <span className="font-semibold tabular-nums text-red-700 dark:text-red-300">
              ฿{formatAmount(totals.expense)}
            </span>
          </div>
        </div>

        {/* Save button */}
        {newEntryCount > 0 && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("monthlyEntry.saving")}
              </>
            ) : (
              t("monthlyEntry.save", { count: newEntryCount })
            )}
          </Button>
        )}
      </div>

      </div>
    </div>
  );
}
