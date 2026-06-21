"use client";

/**
 * Financial efficiency: how well income converts to savings, where spending goes,
 * and whether it is improving. Replaces the old daily-target/calendar view.
 * URL: /dashboard/spending-efficiency
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Layers,
  Minus,
  PiggyBank,
  Tags,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount } from "@/lib/format";
import { formatYearForDisplay } from "@/lib/format-year";
import { useI18n } from "@/hooks/use-i18n";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { cn } from "@/lib/utils";

const STORAGE_NEED_IDS = "judtang_efficiency_need_category_ids";
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type MonthItem = { monthIndex: number; income: number; expense: number };
type CategoryItem = {
  categoryId: string | null;
  categoryName: string;
  categoryNameEn?: string | null;
  amount: number;
};
type CategoryDef = { id: string; name: string; nameEn?: string | null };

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

function catKey(c: CategoryItem): string {
  return c.categoryId ?? `name:${c.categoryName}`;
}

function bandInfo(rate: number) {
  if (rate < 0)
    return { key: "bandNegative", text: "text-red-600 dark:text-red-400", badge: "bg-red-500/10 text-red-700 dark:text-red-300" };
  if (rate < 0.1)
    return { key: "bandTight", text: "text-amber-600 dark:text-amber-400", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300" };
  if (rate < 0.2)
    return { key: "bandOk", text: "text-blue-600 dark:text-blue-400", badge: "bg-blue-500/10 text-blue-700 dark:text-blue-300" };
  return { key: "bandStrong", text: "text-emerald-600 dark:text-emerald-400", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" };
}

export default function SpendingEfficiencyPage() {
  const { t, language } = useI18n();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(() => now.getFullYear());
  const [month, setMonth] = useState(() => now.getMonth());

  const [monthData, setMonthData] = useState<MonthItem[] | null>(null);
  const [catCurrent, setCatCurrent] = useState<CategoryItem[]>([]);
  const [catPrev, setCatPrev] = useState<CategoryItem[]>([]);
  const [categoryDefs, setCategoryDefs] = useState<CategoryDef[]>([]);
  const [needIds, setNeedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const { from, to } = useMemo(() => getMonthRange(year, month), [year, month]);
  const prevRange = useMemo(
    () => (month === 0 ? getMonthRange(year - 1, 11) : getMonthRange(year, month - 1)),
    [year, month],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_NEED_IDS);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setNeedIds(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      // ignore
    }
  }, []);

  function persistNeedIds(next: string[]) {
    setNeedIds(next);
    try {
      localStorage.setItem(STORAGE_NEED_IDS, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : []))
      .then((rows: CategoryDef[]) => {
        if (!cancelled && Array.isArray(rows)) {
          setCategoryDefs(rows.filter((x) => typeof x.id === "string" && x.id.length > 0));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const byMonth = new URLSearchParams({ year: String(year), timezone });
    const cur = new URLSearchParams({ from, to, timezone });
    const prev = new URLSearchParams({ from: prevRange.from, to: prevRange.to, timezone });
    Promise.all([
      fetch(`/api/transactions/summary-by-month?${byMonth}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/transactions/summary-by-category?${cur}`).then((r) => (r.ok ? r.json() : [])),
      fetch(`/api/transactions/summary-by-category?${prev}`).then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([m, c, p]: [MonthItem[], CategoryItem[], CategoryItem[]]) => {
        if (cancelled) return;
        setMonthData(Array.isArray(m) ? m : []);
        setCatCurrent(Array.isArray(c) ? c : []);
        setCatPrev(Array.isArray(p) ? p : []);
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(true);
          setMonthData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to, prevRange.from, prevRange.to, year, timezone]);

  const needSet = useMemo(() => new Set(needIds), [needIds]);

  const curMonth = useMemo(
    () => monthData?.find((m) => m.monthIndex === month) ?? { monthIndex: month, income: 0, expense: 0 },
    [monthData, month],
  );

  const savings = useMemo(() => {
    const income = curMonth.income;
    const expense = curMonth.expense;
    const saved = income - expense;
    const rate = income > 0 ? saved / income : null;
    const prev = month > 0 ? monthData?.find((m) => m.monthIndex === month - 1) : undefined;
    const prevRate = prev && prev.income > 0 ? (prev.income - prev.expense) / prev.income : null;
    const deltaPP = rate != null && prevRate != null ? rate - prevRate : null;
    return { income, expense, saved, rate, deltaPP };
  }, [curMonth, monthData, month]);

  const structure = useMemo(() => {
    const income = curMonth.income;
    const expense = curMonth.expense;
    const needs = catCurrent.reduce(
      (s, c) => (c.categoryId && needSet.has(c.categoryId) ? s + c.amount : s),
      0,
    );
    const wants = Math.max(0, expense - needs);
    const saved = income - expense;
    const denom = Math.max(income, expense, 1);
    return {
      income,
      needs,
      wants,
      saved,
      wNeeds: needs / denom,
      wWants: wants / denom,
      wSaved: Math.max(0, saved) / denom,
    };
  }, [curMonth, catCurrent, needSet]);

  const topCategories = useMemo(() => {
    const totalCats = catCurrent.reduce((s, c) => s + c.amount, 0);
    const prevMap = new Map(catPrev.map((c) => [catKey(c), c.amount]));
    return [...catCurrent]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
      .map((c) => {
        const prevAmount = prevMap.get(catKey(c)) ?? 0;
        const deltaPct = prevAmount > 0 ? (c.amount - prevAmount) / prevAmount : null;
        return {
          key: catKey(c),
          name: getCategoryDisplayName(c.categoryName, language, c.categoryNameEn),
          amount: c.amount,
          share: totalCats > 0 ? c.amount / totalCats : 0,
          deltaPct,
          isNew: prevAmount <= 0,
        };
      });
  }, [catCurrent, catPrev, language]);

  const trend = useMemo(() => {
    return (monthData ?? []).map((m) => ({
      name: MONTH_SHORT[m.monthIndex] ?? "",
      monthIndex: m.monthIndex,
      rate: m.income > 0 ? Math.round(((m.income - m.expense) / m.income) * 100) : 0,
    }));
  }, [monthData]);

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

  const band = savings.rate != null ? bandInfo(savings.rate) : null;
  const hasExpense = curMonth.expense > 0 || curMonth.income > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t("dashboard.pageTitle.spendingEfficiency")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.spendingEfficiency.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Year"
            className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {formatYearForDisplay(y, language)}
              </option>
            ))}
          </select>
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Month"
            className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {t(`summary.months.${m}` as const)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-between gap-2 sm:justify-end">
          <p className="text-sm text-muted-foreground tabular-nums sm:text-right">{periodLabel}</p>
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

      {loadError && (
        <p className="text-sm text-destructive" role="alert">
          {t("dashboard.spendingEfficiency.loadFailed")}
        </p>
      )}

      {/* Hero: savings rate */}
      <Card>
        <CardContent className="pt-6">
          {loading && !monthData ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <PiggyBank className="h-4 w-4" />
                    {t("dashboard.spendingEfficiency.savingsRate")}
                  </p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className={cn("text-4xl font-semibold leading-none tabular-nums", band?.text)}>
                      {savings.rate != null ? pct(savings.rate) : "—"}
                    </span>
                    {savings.deltaPP != null && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-sm",
                          savings.deltaPP >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {savings.deltaPP >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                        {t("dashboard.spendingEfficiency.vsPrevMonth", {
                          delta: `${savings.deltaPP >= 0 ? "+" : "−"}${Math.abs(Math.round(savings.deltaPP * 100))}%`,
                        })}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("dashboard.spendingEfficiency.savingsRateSub", {
                      saved: formatAmount(savings.saved),
                      income: formatAmount(savings.income),
                    })}
                  </p>
                </div>
                <div className="text-right">
                  {band && (
                    <span className={cn("inline-block rounded-md px-3 py-1 text-xs", band.badge)}>
                      {t(`dashboard.spendingEfficiency.${band.key}` as const)}
                    </span>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">{t("dashboard.spendingEfficiency.targetHint")}</p>
                </div>
              </div>
              <div className="relative mt-4 h-2 rounded-full bg-muted">
                <div
                  className="absolute left-0 top-0 h-2 rounded-full bg-emerald-500"
                  style={{ width: `${Math.max(0, Math.min(100, (savings.rate ?? 0) * 100))}%` }}
                />
                <div className="absolute top-[-3px] h-3.5 w-0.5 bg-muted-foreground" style={{ left: "20%" }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("dashboard.spendingEfficiency.targetLine")}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Money structure 50/30/20 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4 text-muted-foreground" />
            {t("dashboard.spendingEfficiency.structureTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("dashboard.spendingEfficiency.structureRef")}</p>
        </CardHeader>
        <CardContent>
          {loading && !monthData ? (
            <Skeleton className="h-12 w-full" />
          ) : !hasExpense ? (
            <p className="py-4 text-sm text-muted-foreground">{t("dashboard.spendingEfficiency.noExpense")}</p>
          ) : (
            <>
              <div className="flex h-7 overflow-hidden rounded-md">
                <div className="flex items-center justify-center bg-blue-400 text-xs text-blue-950" style={{ width: `${structure.wNeeds * 100}%` }}>
                  {structure.wNeeds > 0.12 ? pct(structure.wNeeds) : ""}
                </div>
                <div className="flex items-center justify-center bg-amber-300 text-xs text-amber-950" style={{ width: `${structure.wWants * 100}%` }}>
                  {structure.wWants > 0.12 ? pct(structure.wWants) : ""}
                </div>
                <div className="flex items-center justify-center bg-emerald-300 text-xs text-emerald-950" style={{ width: `${structure.wSaved * 100}%` }}>
                  {structure.wSaved > 0.12 ? pct(structure.wSaved) : ""}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-blue-400" />
                  {t("dashboard.spendingEfficiency.needs")} {formatAmount(structure.needs)}
                  <span className="text-muted-foreground/60">({t("dashboard.spendingEfficiency.needsTarget")})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
                  {t("dashboard.spendingEfficiency.wants")} {formatAmount(structure.wants)}
                  <span className="text-muted-foreground/60">({t("dashboard.spendingEfficiency.wantsTarget")})</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-300" />
                  {t("dashboard.spendingEfficiency.savings")} {formatAmount(structure.saved)}
                  <span className="text-muted-foreground/60">({t("dashboard.spendingEfficiency.savingsTarget")})</span>
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top spending drivers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            {t("dashboard.spendingEfficiency.topCategoriesTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("dashboard.spendingEfficiency.topCategoriesSub")}</p>
        </CardHeader>
        <CardContent>
          {loading && !monthData ? (
            <div className="space-y-3">
              {["a", "b", "c", "d"].map((k) => (
                <Skeleton key={k} className="h-9 w-full" />
              ))}
            </div>
          ) : topCategories.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">{t("dashboard.spendingEfficiency.noExpense")}</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate">{c.name}</span>
                    <span className="flex shrink-0 items-center gap-2 text-muted-foreground tabular-nums">
                      <span>{formatAmount(c.amount)} · {pct(c.share)}</span>
                      {c.isNew ? (
                        <span className="text-[11px] text-muted-foreground/70">{t("dashboard.spendingEfficiency.newBadge")}</span>
                      ) : c.deltaPct == null || Math.abs(c.deltaPct) < 0.005 ? (
                        <span className="flex items-center text-muted-foreground/70">
                          <Minus className="h-3.5 w-3.5" />
                        </span>
                      ) : c.deltaPct > 0 ? (
                        <span className="flex items-center text-red-600 dark:text-red-400">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          {Math.abs(Math.round(c.deltaPct * 100))}%
                        </span>
                      ) : (
                        <span className="flex items-center text-emerald-600 dark:text-emerald-400">
                          <ArrowDownRight className="h-3.5 w-3.5" />
                          {Math.abs(Math.round(c.deltaPct * 100))}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.max(2, c.share * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Savings-rate trend */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            {t("dashboard.spendingEfficiency.trendTitle")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("dashboard.spendingEfficiency.trendSub")}</p>
        </CardHeader>
        <CardContent>
          {loading && !monthData ? (
            <Skeleton className="h-[200px] w-full rounded-lg" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} width={40} />
                <Tooltip formatter={(v: number | undefined) => `${v ?? 0}%`} contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {trend.map((d) => (
                    <Cell
                      key={d.monthIndex}
                      fill={d.rate < 0 ? "#ef4444" : d.monthIndex === month ? "#16a34a" : "#86efac"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Classify needs vs wants */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4 text-muted-foreground" />
              {t("dashboard.spendingEfficiency.classifyTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("dashboard.spendingEfficiency.needCount", { count: needIds.length })}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{t("dashboard.spendingEfficiency.classifySub")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => persistNeedIds(categoryDefs.map((c) => c.id))}
              disabled={categoryDefs.length === 0}
            >
              {t("dashboard.spendingEfficiency.classifyAllNeed")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => persistNeedIds([])}
              disabled={needIds.length === 0}
            >
              {t("dashboard.spendingEfficiency.classifyReset")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categoryDefs.map((cat) => {
              const isNeed = needSet.has(cat.id);
              const displayName = getCategoryDisplayName(cat.name, language, cat.nameEn);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    persistNeedIds(isNeed ? needIds.filter((id) => id !== cat.id) : [...needIds, cat.id])
                  }
                  aria-pressed={isNeed}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-all",
                    isNeed
                      ? "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {displayName}
                  <span className="text-[11px] opacity-70">
                    {isNeed ? t("dashboard.spendingEfficiency.needs") : t("dashboard.spendingEfficiency.wants")}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
