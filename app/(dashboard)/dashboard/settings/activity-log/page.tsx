"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type ActivityLogEntry = {
  id: string;
  userId: string;
  userDisplayName?: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

const ENTITY_TYPES = [
  { value: "", labelKey: "all" },
  { value: "user", labelKey: "user" },
  { value: "session", labelKey: "session" },
] as const;

const ACTION_OPTIONS = [
  { value: "", labelKey: "all" },
  { value: "USER_REGISTERED", labelKey: "USER_REGISTERED" },
  { value: "USER_LOGGED_IN", labelKey: "USER_LOGGED_IN" },
  { value: "USER_LOGGED_OUT", labelKey: "USER_LOGGED_OUT" },
  { value: "USER_PROFILE_UPDATED", labelKey: "USER_PROFILE_UPDATED" },
  { value: "USER_PASSWORD_CHANGED", labelKey: "USER_PASSWORD_CHANGED" },
  { value: "SESSION_REVOKED", labelKey: "SESSION_REVOKED" },
] as const;

function formatDateTime(iso: string, locale: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type DetailChange = { field: string; from: unknown; to: unknown };

function formatDetails(
  action: string,
  details: Record<string, unknown> | null,
  t: (key: string, params?: Record<string, string | number>) => string,
): string[] {
  const detailLines: string[] = [];
  if (!details || typeof details !== "object") return detailLines;

  if (action === "SESSION_REVOKED" && typeof details.scope === "string") {
    if (details.scope === "all") detailLines.push(t("activityLog.details.sessions.all"));
    else if (details.scope === "others")
      detailLines.push(t("activityLog.details.sessions.others"));
    else if (details.scope === "one") detailLines.push(t("activityLog.details.sessions.one"));
    return detailLines;
  }

  const isDelete =
    action.endsWith("_DELETED") || action.endsWith("_RESTORED");
  const isUpdate = action.endsWith("_UPDATED");

  if (isDelete) {
    const name =
      typeof details.name === "string"
        ? details.name
        : typeof details.title === "string"
          ? details.title
          : null;
    if (name) {
      detailLines.push(
        action.endsWith("_RESTORED")
          ? t("activityLog.details.restored", { name })
          : t("activityLog.details.deleted", { name }),
      );
    }
  }

  if (isUpdate) {
    const changes = details.changes as DetailChange[] | undefined;
    if (Array.isArray(changes) && changes.length > 0) {
      changes.forEach((c) => {
        if (c && typeof c.field === "string")
          detailLines.push(
            t("activityLog.details.changedField", {
              field: c.field,
              from: String(c.from ?? ""),
              to: String(c.to ?? ""),
            }),
          );
      });
    } else if (details.from != null && details.to != null) {
      detailLines.push(
        t("activityLog.details.changedValue", {
          from: String(details.from),
          to: String(details.to),
        }),
      );
    } else if (typeof details.name === "string") {
      detailLines.push(details.name);
    }
  }

  if (detailLines.length === 0) {
    if (typeof details.name === "string") detailLines.push(details.name);
    else if (typeof details.title === "string")
      detailLines.push(details.title);
  }

  return detailLines;
}

export default function ActivityLogPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [list, setList] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterEntityType, setFilterEntityType] = useState("");
  const [filterAction, setFilterAction] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterEntityType) params.set("entityType", filterEntityType);
      if (filterAction) params.set("action", filterAction);
      if (filterDateFrom) params.set("dateFrom", filterDateFrom);
      if (filterDateTo) params.set("dateTo", filterDateTo);
      const url = `/api/activity-log${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/sign-in");
            return;
          }
          throw new Error(t("activityLog.loadFailed"));
        }
      const data = await res.json();
      setList(data);
      } catch (e) {
        setError(
          e instanceof Error ? e.message : t("common.errors.generic"),
        );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [filterEntityType, filterAction, filterDateFrom, filterDateTo]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          {t("settings.activityLog.title")}
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {t("activityLog.subtitle")}
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
          {t("activityLog.filters.title")}
        </h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {t("activityLog.filters.entityType")}
            </label>
            <select
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
            >
              {ENTITY_TYPES.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {t(`activityLog.entityTypes.${o.labelKey}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {t("activityLog.filters.action")}
            </label>
            <select
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm min-w-[180px]"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {t(`activityLog.actions.${o.labelKey}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {t("activityLog.filters.fromDate")}
            </label>
            <input
              type="date"
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              {t("activityLog.filters.toDate")}
            </label>
            <input
              type="date"
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
        </div>
      </section>

      {loading && list.length === 0 ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
          <p className="text-muted-foreground text-sm">
            {t("activityLog.loading")}
          </p>
        </div>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("activityLog.empty")}
        </p>
      ) : (
        <ul className="space-y-2">
          {list.map((entry) => {
            const detailLines = formatDetails(entry.action, entry.details, t);
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-4 py-3 space-y-1"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                    {formatDateTime(entry.createdAt, locale)}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {t(
                      `activityLog.actions.${
                        ACTION_OPTIONS.find((o) => o.value === entry.action)
                          ?.labelKey ?? "fallback"
                      }`,
                    )}
                  </span>
                  {entry.entityType && (
                    <span className="text-xs rounded-full bg-zinc-100 dark:bg-zinc-700 px-2 py-0.5 text-zinc-600 dark:text-zinc-300">
                      {entry.entityType}
                    </span>
                  )}
                </div>
                {(entry.userDisplayName || detailLines.length > 0) && (
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                    {entry.userDisplayName && (
                      <div>
                        {t("activityLog.byUser", {
                          name: entry.userDisplayName,
                        })}
                      </div>
                    )}
                    {detailLines.map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
