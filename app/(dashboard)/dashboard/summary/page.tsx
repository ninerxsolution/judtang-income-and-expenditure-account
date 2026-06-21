"use client";

/**
 * Summary page — overview cards, income vs expense trend, expense by category.
 * Protected by proxy — requires login. URL: /dashboard/summary
 */
import { useEffect, useState, useMemo } from "react";
import {
  ArrowDownCircle,
  ArrowDownRight,
  ArrowUpCircle,
  ArrowUpRight,
  BarChart2,
  Wallet,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatAmount } from "@/lib/format";
import { formatYearForDisplay } from "@/lib/format-year";
import { useI18n } from "@/hooks/use-i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { cn } from "@/lib/utils";

type Summary = { income: number; expense: number; totalBalance?: number } | null;
type MonthItem = { monthIndex: number; income: number; expense: number };
type NetWorthItem = { monthIndex: number; netWorth: number };
type CategoryItem = {
  categoryId: string | null;
  categoryName: string;
  categoryNameEn?: string | null;
  amount: number;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PIE_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#a855f7", "#ec4899",
];

function getMonthRange(year: number, month: number): { from: string; to: string } {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

function getYearRange(year: number): { from: string; to: string } {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function getDaysInGregorianYear(y: number): number {
  return new Date(y, 1, 29).getDate() === 29 ? 366 : 365;
}

export default function SummaryPage() {
  const { t, language } = useI18n();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const [period, setPeriod] = useState<"month" | "year">("month");
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [accountId, setAccountId] = useState("");
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([]);

  const { from, to } = useMemo(() => {
    if (period === "month") {
      return getMonthRange(year, month);
    }
    return getYearRange(year);
  }, [period, year, month]);

  const [summary, setSummary] = useState<Summary>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [monthData, setMonthData] = useState<MonthItem[]>([]);
  const [monthLoading, setMonthLoading] = useState(true);
  const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(true);
  const [netWorthData, setNetWorthData] = useState<NetWorthItem[]>([]);
  const [netWorthLoading, setNetWorthLoading] = useState(true);

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/financial-accounts")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; name: string; isHidden?: boolean }[]) => {
        if (!cancelled && Array.isArray(data)) {
          setAccounts(data.filter((a) => a.id && a.name && !a.isHidden));
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setSummaryLoading(true);
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    if (accountId) params.set("financialAccountId", accountId);
    fetch(`/api/transactions/summary?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Summary) => {
        if (!cancelled && data) setSummary(data);
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => { cancelled = true; };
  }, [from, to, accountId]);

  useEffect(() => {
    let cancelled = false;
    setMonthLoading(true);
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("timezone", timezone);
    if (accountId) params.set("financialAccountId", accountId);
    fetch(`/api/transactions/summary-by-month?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: MonthItem[]) => {
        if (!cancelled && Array.isArray(data)) setMonthData(data);
      })
      .finally(() => {
        if (!cancelled) setMonthLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, timezone, accountId]);

  useEffect(() => {
    let cancelled = false;
    setCategoryLoading(true);
    const params = new URLSearchParams();
    params.set("from", from);
    params.set("to", to);
    params.set("timezone", timezone);
    if (accountId) params.set("financialAccountId", accountId);
    fetch(`/api/transactions/summary-by-category?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: CategoryItem[]) => {
        if (!cancelled && Array.isArray(data)) setCategoryData(data);
      })
      .finally(() => {
        if (!cancelled) setCategoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [from, to, timezone, accountId]);

  useEffect(() => {
    let cancelled = false;
    setNetWorthLoading(true);
    const params = new URLSearchParams();
    params.set("year", String(year));
    params.set("timezone", timezone);
    if (accountId) params.set("financialAccountId", accountId);
    fetch(`/api/transactions/net-worth-trend?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: NetWorthItem[]) => {
        if (!cancelled && Array.isArray(data)) setNetWorthData(data);
      })
      .finally(() => {
        if (!cancelled) setNetWorthLoading(false);
      });
    return () => { cancelled = true; };
  }, [year, timezone, accountId]);

  const net = summary ? summary.income - summary.expense : 0;

  const deltas = useMemo(() => {
    if (period !== "month") return { income: null, expense: null };
    const cur = monthData.find((m) => m.monthIndex === month);
    const prev = month > 0 ? monthData.find((m) => m.monthIndex === month - 1) : undefined;
    if (!cur || !prev) return { income: null, expense: null };
    const calc = (c: number, p: number) => (p > 0 ? (c - p) / p : null);
    return { income: calc(cur.income, prev.income), expense: calc(cur.expense, prev.expense) };
  }, [period, monthData, month]);

  const barData = useMemo(
    () =>
      monthData.map((d) => ({
        name: MONTH_NAMES[d.monthIndex] ?? "",
        income: d.income,
        expense: d.expense,
      })),
    [monthData],
  );

  const { avgMonthlyIncome, avgMonthlyExpense, avgWeeklyExpense, avgDailyExpense } =
    useMemo(() => {
      if (monthData.length === 0) {
        return {
          avgMonthlyIncome: 0,
          avgMonthlyExpense: 0,
          avgWeeklyExpense: 0,
          avgDailyExpense: 0,
        };
      }
      const totalIncome = monthData.reduce((s, m) => s + m.income, 0);
      const totalExpense = monthData.reduce((s, m) => s + m.expense, 0);
      const daysInYear = getDaysInGregorianYear(year);
      const avgDaily = totalExpense / daysInYear;
      return {
        avgMonthlyIncome: totalIncome / 12,
        avgMonthlyExpense: totalExpense / 12,
        avgWeeklyExpense: (totalExpense * 7) / daysInYear,
        avgDailyExpense: avgDaily,
      };
    }, [monthData, year]);

  const pieData = useMemo(
    () =>
      categoryData.map((d) => ({
        name: getCategoryDisplayName(d.categoryName, language, d.categoryNameEn),
        value: d.amount,
      })),
    [categoryData, language],
  );

  const netWorthChartData = useMemo(
    () =>
      netWorthData.map((d) => ({
        name: MONTH_NAMES[d.monthIndex] ?? "",
        netWorth: d.netWorth,
      })),
    [netWorthData],
  );

  const yearOptions = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      arr.push(y);
    }
    return arr;
  }, [currentYear]);

  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i);
  }, []);

  const renderDelta = (value: number | null, goodWhenUp: boolean) => {
    if (value == null || Math.abs(value) < 0.005) return null;
    const up = value > 0;
    const good = goodWhenUp ? up : !up;
    const Arrow = up ? ArrowUpRight : ArrowDownRight;
    return (
      <p
        className={cn(
          "mt-1.5 flex items-center gap-0.5 text-xs",
          good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
        )}
      >
        <Arrow className="h-3.5 w-3.5" />
        {t("summary.vsPrevMonth", { delta: `${Math.abs(Math.round(value * 100))}%` })}
      </p>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">
          {t("dashboard.pageTitle.summary")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as "month" | "year")}
            className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("summary.period.thisMonth")}
          >
            <option value="month">{t("summary.period.thisMonth")}</option>
            <option value="year">{t("summary.period.thisYear")}</option>
          </select>
          {period === "month" && (
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("settings.budget.month")}
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {t(`summary.months.${m}`)}
                </option>
              ))}
            </select>
          )}
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="flex h-10 min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("settings.budget.year")}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {formatYearForDisplay(y, language)}
              </option>
            ))}
          </select>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="flex h-10 min-w-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm font-inherit ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t("summary.allAccounts")}
          >
            <option value="">{t("summary.allAccounts")}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ArrowDownCircle className="min-w-4 min-h-4 w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <CardTitle className="text-sm font-medium text-nowrap">
              {t("dashboard.summary.income")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <p className="text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {summary ? formatAmount(summary.income) : "0.00"}
                </p>
                {renderDelta(deltas.income, true)}
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <ArrowUpCircle className="min-w-4 min-h-4 w-4 h-4 text-red-600 dark:text-red-400" />
            <CardTitle className="text-sm font-medium text-nowrap">
              {t("dashboard.summary.expense")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <p className="text-2xl font-semibold tabular-nums text-red-700 dark:text-red-300">
                  {summary ? formatAmount(summary.expense) : "0.00"}
                </p>
                {renderDelta(deltas.expense, false)}
              </>
            )}
          </CardContent>
        </Card>
        <Card className={cn(net < 0 && "border-red-500/40")}>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Wallet className="min-w-4 min-h-4 w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <CardTitle className="text-sm font-medium text-nowrap">
              {t("summary.net")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <p
                  className={cn(
                    "text-2xl font-semibold tabular-nums",
                    net >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300",
                  )}
                >
                  {summary ? formatAmount(net) : "0.00"}
                </p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {net >= 0 ? t("summary.netSurplus") : t("summary.netDeficit")}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <BarChart2 className="h-4 w-4" />
            {t("summary.annualAverages", { year: formatYearForDisplay(year, language) })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {(
              [
                { label: t("summary.avgMonthlyIncome"), value: avgMonthlyIncome, tone: "text-emerald-700 dark:text-emerald-300" },
                { label: t("summary.avgMonthlyExpense"), value: avgMonthlyExpense, tone: "text-red-700 dark:text-red-300" },
                { label: t("summary.avgWeeklyExpense"), value: avgWeeklyExpense, tone: "" },
                { label: t("summary.avgDailyExpense"), value: avgDailyExpense, tone: "" },
              ] as const
            ).map((s) => (
              <div key={s.label}>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                {monthLoading ? (
                  <Skeleton className="mt-1 h-6 w-20" />
                ) : (
                  <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", s.tone)}>
                    {formatAmount(s.value)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("summary.chart.incomeVsExpense")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthLoading ? (
              <div className="h-[280px] space-y-2">
                <Skeleton className="h-[240px] w-full rounded-lg" />
                <div className="flex gap-2 justify-center">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-4 w-8" />
                  ))}
                </div>
              </div>
            ) : barData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                {t("summary.chart.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatAmount(v)} />
                  <Tooltip
                    formatter={(value: number | undefined) => formatAmount(value ?? 0)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend />
                  <Bar dataKey="income" name={t("dashboard.summary.income")} fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name={t("dashboard.summary.expense")} fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("summary.chart.expenseByCategory")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryLoading ? (
              <div className="h-[280px] flex items-center justify-center">
                <Skeleton className="h-48 w-48 rounded-full" />
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                {t("summary.chart.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => formatAmount(value ?? 0)}
                    contentStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("summary.chart.netWorthTrend")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {netWorthLoading ? (
            <div className="h-[280px] space-y-2">
              <Skeleton className="h-[240px] w-full rounded-lg" />
              <div className="flex gap-2 justify-center">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-4 w-8" />
                ))}
              </div>
            </div>
          ) : netWorthChartData.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
              {t("summary.chart.noData")}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={netWorthChartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatAmount(v)} />
                <Tooltip
                  formatter={(value: number | undefined) => formatAmount(value ?? 0)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="netWorth"
                  name={t("summary.chart.netWorthLabel")}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
