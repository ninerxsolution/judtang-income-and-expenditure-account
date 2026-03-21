"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const TX_TYPES = ["INCOME", "EXPENSE", "TRANSFER", "PAYMENT", "INTEREST", "ADJUSTMENT"] as const;

type TxType = (typeof TX_TYPES)[number];

type SeriesRow = {
  date: string;
  total: number;
} & Record<TxType, number>;

type ApiResponse = {
  fromDate: string;
  toDate: string;
  series: SeriesRow[];
};

type ViewMode = "byType" | "total";

const LINE_COLORS: Record<TxType, string> = {
  INCOME: "#22c55e",
  EXPENSE: "#ef4444",
  TRANSFER: "#3b82f6",
  PAYMENT: "#8b5cf6",
  INTEREST: "#ca8a04",
  ADJUSTMENT: "#64748b",
};

const TOTAL_LINE_STROKE = "#a16207";

function utcTodayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function addUtcDays(ymd: string, deltaDays: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function rangesEqual(
  a: { from: string; to: string },
  b: { from: string; to: string },
): boolean {
  return a.from === b.from && a.to === b.to;
}

function buildQuery(range: { from: string; to: string }): string {
  const params = new URLSearchParams();
  if (range.from) params.set("fromDate", range.from);
  if (range.to) params.set("toDate", range.to);
  const q = params.toString();
  return q ? `?${q}` : "";
}

export default function AdminTransactionUsagePage() {
  const { t } = useI18n();
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [viewMode, setViewMode] = useState<ViewMode>("byType");
  const [data, setData] = useState<SeriesRow[] | null>(null);
  const [meta, setMeta] = useState<{ fromDate: string; toDate: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => buildQuery(dateRange), [dateRange]);

  const todayYmd = utcTodayYmd();
  const presetToday = { from: todayYmd, to: todayYmd };
  const presetLast7 = { from: addUtcDays(todayYmd, -6), to: todayYmd };
  const presetLast30 = { from: addUtcDays(todayYmd, -29), to: todayYmd };

  const activePreset: "today" | "last7" | "last30" | null =
    dateRange.from && dateRange.to
      ? rangesEqual(dateRange, presetToday)
        ? "today"
        : rangesEqual(dateRange, presetLast7)
          ? "last7"
          : rangesEqual(dateRange, presetLast30)
            ? "last30"
            : null
      : null;

  useEffect(() => {
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
    });
    fetch(`/api/admin/transaction-usage${queryString}`)
      .then((res) => {
        if (res.status === 403) {
          window.location.href = "/dashboard";
          return null;
        }
        if (!res.ok) {
          return res.json().then((body: { error?: string }) => {
            throw new Error(body.error ?? t("admin.transactionUsage.loadFailed"));
          });
        }
        return res.json() as Promise<ApiResponse>;
      })
      .then((payload) => {
        if (!payload) return;
        setData(payload.series);
        setMeta({ fromDate: payload.fromDate, toDate: payload.toDate });
      })
      .catch((e: unknown) => {
        setData(null);
        setMeta(null);
        setError(e instanceof Error ? e.message : t("admin.transactionUsage.loadFailed"));
      })
      .finally(() => setLoading(false));
  }, [queryString, t]);

  const chartBody = (() => {
    if (loading) {
      return (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-[320px] w-full rounded-lg" />
        </div>
      );
    }
    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }
    if (!data || data.length === 0) {
      return <p className="text-sm text-muted-foreground">{t("admin.transactionUsage.empty")}</p>;
    }

    const tooltipFormatter = (value: number | undefined, name: string | undefined) => {
      const n = typeof value === "number" ? value : "—";
      if (viewMode === "total" || name === "total") {
        return [n, t("admin.transactionUsage.seriesTotal")];
      }
      return [n, t(`admin.transactionUsage.types.${String(name) as TxType}`)];
    };

    const legendFormatter = (value: string) => {
      if (viewMode === "total" || value === "total") {
        return t("admin.transactionUsage.seriesTotal");
      }
      return t(`admin.transactionUsage.types.${value as TxType}`);
    };

    return (
      <div className="h-[320px] w-full min-w-0 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: string) => v.slice(5)}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={40} />
            <Tooltip
              contentStyle={{ borderRadius: 8 }}
              labelFormatter={(label) => String(label)}
              formatter={tooltipFormatter}
            />
            <Legend formatter={legendFormatter} wrapperStyle={{ fontSize: 12 }} />
            {viewMode === "total" ? (
              <Line
                type="monotone"
                dataKey="total"
                name="total"
                stroke={TOTAL_LINE_STROKE}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ) : (
              TX_TYPES.map((type) => (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={type}
                  stroke={LINE_COLORS[type]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  })();

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("admin.transactionUsage.title")}</h1>
          <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("admin.transactionUsage.subtitle")}
          </p>
          {meta && !loading && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("admin.transactionUsage.rangeShown", { from: meta.fromDate, to: meta.toDate })}
            </p>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <DateRangePicker
              id="admin-tx-usage-range"
              label={t("dataTools.export.dateRange")}
              value={{ from: dateRange.from || undefined, to: dateRange.to || undefined }}
              onChange={(value) => {
                setDateRange({ from: value?.from ?? "", to: value?.to ?? "" });
              }}
              placeholder={t("dataTools.export.dateRangePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("admin.transactionUsage.rangeHint")}</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">{t("admin.transactionUsage.quickRanges")}</Label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={activePreset === "today" ? "default" : "outline"}
              onClick={() => setDateRange({ ...presetToday })}
            >
              {t("admin.transactionUsage.quickToday")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activePreset === "last7" ? "default" : "outline"}
              onClick={() => setDateRange({ ...presetLast7 })}
            >
              {t("admin.transactionUsage.quickLast7")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activePreset === "last30" ? "default" : "outline"}
              onClick={() => setDateRange({ ...presetLast30 })}
            >
              {t("admin.transactionUsage.quickLast30")}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">{t("admin.transactionUsage.viewModeLabel")}</Label>
          <div
            className="inline-flex rounded-lg border border-border bg-muted/40 p-1 gap-1"
            role="group"
            aria-label={t("admin.transactionUsage.viewModeLabel")}
          >
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewMode === "byType"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setViewMode("byType")}
            >
              {t("admin.transactionUsage.viewByType")}
            </button>
            <button
              type="button"
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                viewMode === "total"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setViewMode("total")}
            >
              {t("admin.transactionUsage.viewTotal")}
            </button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <CardTitle className="text-base font-medium">
            {viewMode === "total"
              ? t("admin.transactionUsage.chartTitleTotal")
              : t("admin.transactionUsage.chartTitleByType")}
          </CardTitle>
        </CardHeader>
        <CardContent>{chartBody}</CardContent>
      </Card>
    </div>
  );
}
