"use client";

/**
 * Spending efficiency: compare actual daily EXPENSE+INTEREST (approx THB) to a user-set daily target.
 * URL: /dashboard/spending-efficiency
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { useI18n } from "@/hooks/use-i18n";
import { formatYearForDisplay } from "@/lib/format-year";
import { getCategoryDisplayName } from "@/lib/categories-display";
import {
  getRecentCategoryIds,
  saveRecentCategoryId,
  sortCategoriesByRecent,
} from "@/lib/recent-categories";
import { cn } from "@/lib/utils";

const STORAGE_DAILY_TARGET = "judtang_spending_efficiency_daily_target";

type DayRow = { date: string; spent: number };
type CategoryItem = {
  id: string;
  name: string;
  nameEn?: string | null;
};

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

const WEEKDAY_KEYS = [
  "dayMon",
  "dayTue",
  "dayWed",
  "dayThu",
  "dayFri",
  "daySat",
  "daySun",
] as const;

function parseTarget(raw: string): number {
  const n = parseFloat(raw.replace(/,/g, "."));
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
}

export default function SpendingEfficiencyPage() {
  const { t, language } = useI18n();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => now.getFullYear());
  const [month, setMonth] = useState(() => now.getMonth());
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<string[]>([]);
  const [categoryMruTick, setCategoryMruTick] = useState(0);

  const [dailyTargetInput, setDailyTargetInput] = useState("0");
  const dailyTarget = useMemo(() => parseTarget(dailyTargetInput), [dailyTargetInput]);

  const [days, setDays] = useState<DayRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = requestAnimationFrame(() => {
      try {
        const v = localStorage.getItem(STORAGE_DAILY_TARGET);
        if (v != null && v !== "") setDailyTargetInput(v);
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_DAILY_TARGET, dailyTargetInput);
      } catch {
        // ignore
      }
    }, 300);
    return () => clearTimeout(id);
  }, [dailyTargetInput]);

  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);

  useEffect(() => {
    let cancelled = false;
    setCategoriesLoading(true);
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: CategoryItem[]) => {
        if (cancelled || !Array.isArray(rows)) return;
        setCategories(rows.filter((x) => typeof x.id === "string" && x.id.length > 0));
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!from || !to) {
      return;
    }
    let cancelled = false;
    setLoadError(false);
    setLoading(true);
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    params.set("timezone", timezone);
    if (excludedCategoryIds.length > 0) {
      params.set("excludedCategoryIds", excludedCategoryIds.join(","));
    }
    fetch(`/api/spending-efficiency?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { days?: DayRow[] } | null) => {
        if (cancelled) return;
        if (data?.days) setDays(data.days);
        else setDays([]);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setDays(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, timezone, excludedCategoryIds]);

  const dayByDate = useMemo(() => {
    const m = new Map<string, number>();
    (days ?? []).forEach((d) => {
      m.set(d.date, d.spent);
    });
    return m;
  }, [days]);

  const stats = useMemo(() => {
    if (days == null || !days.length) {
      return { total: 0, n: 0, targetTotal: 0, over: 0, notOver: 0, diff: 0 };
    }
    const n = days.length;
    const total = days.reduce((s, d) => s + d.spent, 0);
    const targetTotal = dailyTarget * n;
    const over =
      dailyTarget > 0 ? days.filter((d) => d.spent > dailyTarget).length : 0;
    const notOver = dailyTarget > 0 ? n - over : n;
    return {
      total,
      n,
      targetTotal,
      diff: total - targetTotal,
      over,
      notOver,
    };
  }, [days, dailyTarget]);

  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, k) => y - 2 + k);
  }, []);

  const periodLabel = useMemo(
    () => `${t(`summary.months.${month}` as const)} ${formatYearForDisplay(year, language)}`,
    [month, year, t, language],
  );

  const goPrev = () => {
    if (month <= 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month >= 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const sortedCategories = useMemo(() => {
    const mru = getRecentCategoryIds();
    return sortCategoriesByRecent(categories, mru);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sort after toggle writes MRU
  }, [categories, categoryMruTick]);

  const monthGrid = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstWeekday = first.getDay();
    const leading = (firstWeekday + 6) % 7;
    const lastD = new Date(year, month + 1, 0).getDate();
    const cells: ({ date: string; spent: number } | null)[] = [];
    for (let i = 0; i < leading; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= lastD; d += 1) {
      const ymd = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const spent = dayByDate.get(ymd) ?? 0;
      cells.push({ date: ymd, spent });
    }
    while (cells.length % 7 !== 0) {
      cells.push(null);
    }
    const rows: (typeof cells)[] = [];
    for (let i = 0; i < cells.length; i += 7) {
      rows.push(cells.slice(i, i + 7));
    }
    return rows;
  }, [year, month, dayByDate]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("dashboard.pageTitle.spendingEfficiency")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.spendingEfficiency.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-48 space-y-2">
          <Label htmlFor="daily-target">{t("dashboard.spendingEfficiency.dailyTargetLabel")}</Label>
          <Input
            id="daily-target"
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            className="h-10"
            value={dailyTargetInput}
            onChange={(e) => setDailyTargetInput(e.target.value)}
            aria-describedby="daily-target-hint"
          />
          
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="se-year">
            Year
          </label>
          <select
            id="se-year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {formatYearForDisplay(y, language)}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="se-month">
            Month
          </label>
          <select
            id="se-month"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {t(`summary.months.${m}` as const)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-1 min-w-0 items-center justify-between gap-2 sm:justify-end">
          <p className="text-sm text-muted-foreground tabular-nums sm:max-w-md sm:text-right">{periodLabel}</p>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="outline" size="icon" onClick={goPrev} aria-label={t("dashboard.spendingEfficiency.periodPrev")}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={goNext} aria-label={t("dashboard.spendingEfficiency.periodNext")}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">
              {t("dashboard.spendingEfficiency.excludeCategoriesLabel")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.spendingEfficiency.excludeCount", {
                count: excludedCategoryIds.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExcludedCategoryIds(categories.map((c) => c.id))}
              disabled={categoriesLoading || categories.length === 0}
            >
              {t("dashboard.spendingEfficiency.excludeAll")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExcludedCategoryIds([])}
              disabled={excludedCategoryIds.length === 0}
            >
              {t("dashboard.spendingEfficiency.clearExcluded")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {categoriesLoading ? (
            <div className="flex flex-wrap gap-2">
              {["1", "2", "3", "4", "5"].map((x) => (
                <Skeleton key={x} className="h-8 w-24 rounded-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedCategories.map((cat) => {
                const excluded = excludedCategoryIds.includes(cat.id);
                const displayName = getCategoryDisplayName(cat.name, language, cat.nameEn);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      saveRecentCategoryId(cat.id);
                      setCategoryMruTick((v) => v + 1);
                      setExcludedCategoryIds((prev) =>
                        prev.includes(cat.id)
                          ? prev.filter((id) => id !== cat.id)
                          : [...prev, cat.id],
                      );
                    }}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-all",
                      excluded
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                    aria-pressed={excluded}
                  >
                    {excluded ? <CircleX className="h-3.5 w-3.5" /> : null}
                    {displayName}
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>


      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {t("dashboard.spendingEfficiency.loadFailed")}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading && !days ? (
          <>
            {["a", "b", "c", "d"].map((k) => (
              <Card key={k}>
                <CardHeader>
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-24" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="flex flex-row items-center justify-between gap-1 sm:block sm:flex-col">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Wallet className="h-4 w-4 min-h-4 min-w-4 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.spendingEfficiency.totalSpent")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums">{formatAmount(stats.total)}</p>
              </CardContent>
            </Card>
            <Card className="flex flex-row items-center justify-between gap-1 sm:block sm:flex-col">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Target className="h-4 w-4 min-h-4 min-w-4 text-emerald-600 dark:text-emerald-400" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.spendingEfficiency.totalIfOnTarget")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums">
                  {dailyTarget > 0 ? formatAmount(stats.targetTotal) : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="flex flex-row items-center justify-between gap-1 sm:block sm:flex-col">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <ArrowDownCircle className="h-4 w-4 min-h-4 min-w-4 text-red-600 dark:text-red-400" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.spendingEfficiency.difference")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums text-muted-foreground">
                  {dailyTarget > 0 ? formatAmount(stats.diff) : "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="flex flex-row items-center justify-between gap-1 sm:block sm:flex-col">
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <CalendarDays className="h-4 w-4 min-h-4 min-w-4 text-zinc-600 dark:text-zinc-400" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dashboard.spendingEfficiency.daysOver")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold tabular-nums">
                  {dailyTarget > 0
                    ? `${stats.over} / ${stats.n} — ${t("dashboard.spendingEfficiency.daysNotOver")}: ${stats.notOver}`
                    : "—"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("dashboard.spendingEfficiency.calendarTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !days ? (
            <Skeleton className="h-56 w-full rounded-lg" />
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid w-full min-w-[320px] overflow-hidden rounded-lg border border-border [&>div:nth-child(7n)]:border-r-0 [&>div:nth-last-child(-n+7)]:border-b-0"
                style={{ gridTemplateColumns: "repeat(7, minmax(0,1fr))" }}
              >
                {WEEKDAY_KEYS.map((k) => (
                  <div
                    key={k}
                    className="border-b border-r border-border bg-muted/50 px-2 py-2 text-center text-xs font-medium"
                  >
                    {t(`dashboard.spendingOverview.${k}` as const)}
                  </div>
                ))}
                {monthGrid.flat().map((cell, idx) => {
                  if (cell == null) {
                    return (
                      <div
                        key={`p-${String(idx)}`}
                        className="min-h-16 border-b border-r border-border bg-muted/20 p-2"
                      />
                    );
                  }
                  const diff = dailyTarget > 0 ? cell.spent - dailyTarget : 0;
                  const isOver = dailyTarget > 0 && diff > 0;
                  const isUnder = dailyTarget > 0 && diff <= 0;
                  return (
                    <div
                      key={cell.date}
                      className={cn(
                        "min-h-16 border-b border-r border-border p-2 text-xs",
                        isOver && "bg-destructive/5",
                        isUnder && "bg-emerald-500/5",
                      )}
                    >
                      <div className="text-muted-foreground">{Number(cell.date.slice(8, 10))}</div>
                      <div className="mt-1 font-medium tabular-nums">{formatAmount(cell.spent)}</div>
                      {dailyTarget > 0 ? (
                        <div className={cn("mt-1 tabular-nums", isOver ? "text-destructive" : "text-emerald-700 dark:text-emerald-400")}>
                          {isOver
                            ? t("dashboard.spendingEfficiency.overBy", { amount: formatAmount(diff) })
                            : t("dashboard.spendingEfficiency.underBy", {
                                amount: formatAmount(Math.abs(diff)),
                              })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
