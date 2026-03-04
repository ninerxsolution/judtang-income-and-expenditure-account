"use client";

import { useEffect, useMemo, useState } from "react";
import { subDays, startOfWeek, addDays, isBefore, isAfter, format } from "date-fns";
import { enUS, th } from "date-fns/locale";
import type { Locale } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type CalendarSummaryItem = {
  date: string;
  hasTransactions: boolean;
  count: number;
};

const LEVEL_CLASSES = [
  "bg-[#D4C9B0] dark:bg-stone-800", // 0
  "bg-emerald-200 dark:bg-emerald-900", // 1
  "bg-emerald-400 dark:bg-emerald-700", // 2
  "bg-emerald-500 dark:bg-emerald-600", // 3
  "bg-emerald-600 dark:bg-emerald-500", // 4
] as const;

const DATE_FNS_LOCALES: Record<string, Locale> = {
  "en-US": enUS,
  "th-TH": th,
  en: enUS,
  th: th,
};

function getLevel(count: number): number {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

function formatDateInput(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const WEEKDAY_LABELS = ["Mon", "Wed", "Fri"] as const;

export function ActivityHeatmap() {
  const { t, locale } = useI18n();
  const [summary, setSummary] = useState<CalendarSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startDate, numWeeks, rangeStart } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const range = subDays(today, 364);
    const start = startOfWeek(range, { weekStartsOn: 1 });
    const end = new Date(today);

    const days: Date[] = [];
    let cursor = new Date(start);
    while (cursor <= end || days.length < 7) {
      days.push(new Date(cursor));
      cursor = addDays(cursor, 1);
      if (days.length >= 371) break;
    }

    const weeks = Math.ceil(days.length / 7);
    return {
      startDate: start,
      numWeeks: weeks,
      rangeStart: range,
    };
  }, []);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rangeStart = subDays(today, 364);
    const start = startOfWeek(rangeStart, { weekStartsOn: 1 });
    const end = new Date(today);

    const from = formatDateInput(start);
    const to = formatDateInput(end);

    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ from, to });
        params.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
        const res = await fetch(
          `/api/transactions/calendar-summary?${params.toString()}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          if (res.status === 401) {
            setError(t("common.errors.unauthenticated"));
          } else {
            setError(t("dashboard.activityHeatmap.loadFailed"));
          }
          setSummary([]);
          return;
        }
        const data = (await res.json()) as CalendarSummaryItem[] | unknown;
        if (Array.isArray(data)) {
          setSummary(data);
        } else {
          setSummary([]);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError(t("dashboard.activityHeatmap.loadFailed"));
          setSummary([]);
        }
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [t]);

  const { countMap, totalCount: computedTotal } = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    for (const item of summary) {
      map.set(item.date, item.count);
      total += item.count;
    }
    return { countMap: map, totalCount: total };
  }, [summary]);

  const monthLabels = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const range = subDays(today, 364);
    const start = startOfWeek(range, { weekStartsOn: 1 });
    const months: { col: number; label: string }[] = [];
    let lastMonth = -1;
    let lastLabelCol = -4;
    let cursor = new Date(start);
    let col = 0;
    const end = new Date(today);
    const dateLocale = DATE_FNS_LOCALES[locale] ?? enUS;
    const MIN_MONTH_GAP = 4;

    while (cursor <= end && col < 53) {
      const m = cursor.getMonth();
      if (m !== lastMonth && col >= lastLabelCol + MIN_MONTH_GAP) {
        months.push({
          col,
          label: format(cursor, "MMM", { locale: dateLocale }),
        });
        lastMonth = m;
        lastLabelCol = col;
      } else if (m !== lastMonth) {
        lastMonth = m;
      }
      cursor = addDays(cursor, 7);
      col++;
    }
    return months;
  }, [locale]);

  const dateFnsLocale = DATE_FNS_LOCALES[locale] ?? enUS;

  if (loading) {
    return (
      <div className="min-w-0 space-y-2">
        <Skeleton className="h-4 w-48" />
        <div className="grid gap-[5px] pl-10" style={{ gridTemplateColumns: `repeat(${numWeeks}, minmax(10px, 12px))` }}>
          {Array.from({ length: numWeeks }, (_, i) => (
            <Skeleton key={i} className="h-3 w-3 min-w-[12px] min-h-[12px] rounded" />
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex flex-col justify-around gap-0.5 py-0.5">
            {WEEKDAY_LABELS.map((label) => (
              <Skeleton key={label} className="h-3 w-6" />
            ))}
          </div>
          <div
            className="grid gap-[5px]"
            style={{
              gridTemplateRows: "repeat(7, minmax(10px, 12px))",
              gridTemplateColumns: `repeat(${numWeeks}, minmax(10px, 12px))`,
            }}
          >
            {Array.from({ length: 7 * numWeeks }, (_, i) => (
              <Skeleton key={i} className="h-[14px] w-[14px] min-w-[14px] min-h-[14px] rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[#D4C9B0] bg-[#F5F0E8] p-4 dark:border-stone-700 dark:bg-stone-900">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
        {t("dashboard.activityHeatmap.totalContributions", {
          count: String(computedTotal),
        })}
      </p>
      <div className="min-w-0 overflow-x-auto">
        <TooltipProvider delayDuration={0}>
          <div className="inline-flex min-w-min flex-col gap-1">
            {/* Month labels - align with week columns */}
            <div
              className="grid gap-[5px] pl-10"
              style={{
                gridTemplateColumns: `repeat(${numWeeks}, minmax(10px, 12px))`,
              }}
            >
              {Array.from({ length: numWeeks }, (_, col) => {
                const labelForCol = monthLabels.find((m) => m.col === col);
                return (
                  <div
                    key={`month-${col}`}
                    className="text-[10px] text-[#A09080] dark:text-stone-400 whitespace-nowrap"
                  >
                    {labelForCol?.label ?? ""}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              {/* Weekday labels */}
              <div className="flex flex-col justify-around gap-0.5 py-0.5">
                {WEEKDAY_LABELS.map((label) => (
                  <span
                    key={label}
                    className="text-[10px] text-[#A09080] dark:text-stone-400"
                  >
                    {label}
                  </span>
                ))}
              </div>
              {/* Grid */}
              <div
                className="grid gap-[5px]"
                style={{
                  gridTemplateRows: "repeat(7, minmax(10px, 12px))",
                  gridTemplateColumns: `repeat(${numWeeks}, minmax(10px, 12px))`,
                }}
              >
                {Array.from({ length: 7 }, (_, row) =>
                  Array.from({ length: numWeeks }, (_, col) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const cellDate = addDays(new Date(startDate), col * 7 + row);
                    const iso = formatDateInput(cellDate);
                    const isInRange =
                      !isBefore(cellDate, rangeStart) && !isAfter(cellDate, today);
                    const count = isInRange ? countMap.get(iso) ?? 0 : -1;
                    const level = count >= 0 ? getLevel(count) : 0;
                    const showTooltip = isInRange;

                    const tooltipText = !showTooltip
                      ? ""
                      : count === 0
                        ? t("dashboard.activityHeatmap.noContributions")
                        : t("dashboard.activityHeatmap.contributionsOn", {
                            count: String(count),
                            date: format(cellDate, "PP", { locale: dateFnsLocale }),
                          });

                    const cell = (
                      <div
                        className={cn(
                          "h-[14px] w-[14px] min-w-[14px] min-h-[14px] rounded",
                          LEVEL_CLASSES[level],
                        )}
                        aria-label={tooltipText || undefined}
                      />
                    );

                    return (
                      <Tooltip key={`${row}-${col}`}>
                        <TooltipTrigger asChild>{cell}</TooltipTrigger>
                        {tooltipText && (
                          <TooltipContent side="top" sideOffset={4}>
                            {tooltipText}
                          </TooltipContent>
                        )}
                      </Tooltip>
                    );
                  }),
                )}
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1 pt-1 pl-10 text-[10px] text-[#A09080] dark:text-stone-400">
              <span>{t("dashboard.activityHeatmap.less")}</span>
              {LEVEL_CLASSES.map((cls, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-[14px] w-[14px] min-w-[14px] min-h-[14px] rounded",
                    cls,
                  )}
                  aria-hidden
                />
              ))}
              <span>{t("dashboard.activityHeatmap.more")}</span>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
