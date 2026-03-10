"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
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

type Category = { id: string; name: string };

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
  categoryRef?: { id: string; name: string } | null;
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

export default function MonthlyEntryPage() {
  const { t, language } = useI18n();
  const localeKey = language === "th" ? "th" : "en";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [existingTransactions, setExistingTransactions] = useState<ExistingTransaction[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);

  // day (1-based) -> RowEntry[]
  const [dayRows, setDayRows] = useState<Record<number, RowEntry[]>>({});
  const [saving, setSaving] = useState(false);

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

  // Fetch existing transactions for the selected month
  const fetchExisting = useCallback(async () => {
    setLoadingExisting(true);
    try {
      const fromDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = getDaysInMonth(year, month);
      const toDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({
        from: fromDate,
        to: toDate,
        timezone: tz,
        limit: "200",
        offset: "0",
      });
      const res = await fetch(`/api/transactions?${params}`);
      if (res.ok) {
        const data = (await res.json()) as ExistingTransaction[];
        setExistingTransactions(Array.isArray(data) ? data : []);
      } else {
        setExistingTransactions([]);
      }
    } catch {
      setExistingTransactions([]);
    } finally {
      setLoadingExisting(false);
    }
  }, [year, month]);

  useEffect(() => {
    void fetchExisting();
    setDayRows({});
  }, [fetchExisting]);

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
    <div className="px-4 pb-6 space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between gap-2 sticky top-0 z-10 bg-background py-2 -mx-4 px-4 border-b">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{monthLabel}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={prevMonth}
            aria-label={t("monthlyEntry.prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
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

      {/* Subtitle */}
      <p className="text-sm text-muted-foreground">{t("monthlyEntry.subtitle")}</p>

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
            <div key={day} className="group">
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
                  className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={() => addRow(day)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("monthlyEntry.addRow")}
                </Button>
              </div>

              {/* Existing transactions */}
              {existing.length > 0 && (
                <div className="ml-9 space-y-1 mb-1">
                  {existing.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center gap-2 text-sm py-1 px-2 rounded bg-muted/40"
                    >
                      <TypeIcon
                        type={tx.type as TransactionType}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      <span className="font-medium tabular-nums min-w-[4rem] text-right">
                        {formatAmount(tx.amount)}
                      </span>
                      <span className="text-muted-foreground text-xs truncate">
                        {tx.categoryRef?.name
                          ? getCategoryDisplayName(tx.categoryRef.name, language)
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
                    </div>
                  ))}
                </div>
              )}

              {/* New entry rows */}
              {newRows.length > 0 && (
                <div className="ml-9 space-y-2 mb-1">
                  {newRows.map((row) => (
                    <div
                      key={row.id}
                      className="flex flex-wrap items-center gap-2 py-1.5 px-2 rounded border border-dashed border-primary/30 bg-primary/5"
                    >
                      {/* Type select */}
                      <div className="relative">
                        <select
                          value={row.type}
                          onChange={(e) =>
                            updateRow(day, row.id, "type", e.target.value)
                          }
                          className="appearance-none bg-transparent border rounded px-2 py-1 text-xs font-medium pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t === "INCOME"
                                ? localeKey === "th" ? "รายรับ" : "Income"
                                : t === "EXPENSE"
                                  ? localeKey === "th" ? "รายจ่าย" : "Expense"
                                  : localeKey === "th" ? "โอน" : "Transfer"}
                            </option>
                          ))}
                        </select>
                        <TypeIcon
                          type={row.type}
                          className="h-3 w-3 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none"
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
                        className="w-24 h-7 text-xs tabular-nums text-right"
                      />

                      {/* Category */}
                      <select
                        value={row.categoryId}
                        onChange={(e) =>
                          updateRow(day, row.id, "categoryId", e.target.value)
                        }
                        className="appearance-none bg-transparent border rounded px-2 py-1 text-xs max-w-[8rem] truncate cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="">
                          {t("monthlyEntry.category")}
                        </option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {getCategoryDisplayName(c.name, language)}
                          </option>
                        ))}
                      </select>

                      {/* Account */}
                      <div className="w-[10rem]">
                        <AccountCombobox
                          value={row.financialAccountId}
                          onChange={(id) =>
                            updateRow(day, row.id, "financialAccountId", id)
                          }
                          accounts={accounts}
                          className="!py-1 !text-xs !h-7"
                        />
                      </div>

                      {/* Transfer account (only for TRANSFER) */}
                      {row.type === "TRANSFER" && (
                        <div className="w-[10rem]">
                          <AccountCombobox
                            value={row.transferAccountId}
                            onChange={(id) =>
                              updateRow(day, row.id, "transferAccountId", id)
                            }
                            accounts={accounts}
                            excludeIds={row.financialAccountId ? [row.financialAccountId] : []}
                            allowEmpty
                            emptyLabel={`→ ${t("transactions.new.toAccount")}`}
                            className="!py-1 !text-xs !h-7"
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
                        className="flex-1 min-w-[6rem] h-7 text-xs"
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

              {/* Empty day - subtle add button */}
              {!hasContent && (
                <div className="ml-9 py-0.5">
                  <button
                    type="button"
                    className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    onClick={() => addRow(day)}
                  >
                    + {t("monthlyEntry.addRow")}
                  </button>
                </div>
              )}

              {/* Divider */}
              {(hasContent || daysWithContent.has(day)) && (
                <div className="border-b border-border/50 mt-1" />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary + Save */}
      <div className="sticky bottom-0 bg-background border-t pt-3 pb-2 -mx-4 px-4 space-y-3">
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
  );
}
