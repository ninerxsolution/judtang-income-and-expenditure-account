"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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
  { value: "", label: "All types" },
  { value: "user", label: "User" },
  { value: "session", label: "Session" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "USER_REGISTERED", label: "User registered" },
  { value: "USER_LOGGED_IN", label: "User logged in" },
  { value: "USER_LOGGED_OUT", label: "User logged out" },
  { value: "USER_PROFILE_UPDATED", label: "Profile updated" },
  { value: "USER_PASSWORD_CHANGED", label: "Password changed" },
  { value: "SESSION_REVOKED", label: "Session revoked" },
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

type DetailChange = { field: string; from: unknown; to: unknown };

function formatDetails(
  action: string,
  details: Record<string, unknown> | null
): string[] {
  const detailLines: string[] = [];
  if (!details || typeof details !== "object") return detailLines;

  if (action === "SESSION_REVOKED" && typeof details.scope === "string") {
    if (details.scope === "all") detailLines.push("All sessions");
    else if (details.scope === "others") detailLines.push("All other sessions");
    else if (details.scope === "one") detailLines.push("One session");
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
    if (name)
      detailLines.push(
        action.endsWith("_RESTORED")
          ? `Restored: « ${name} »`
          : `Deleted: « ${name} »`
      );
  }

  if (isUpdate) {
    const changes = details.changes as DetailChange[] | undefined;
    if (Array.isArray(changes) && changes.length > 0) {
      changes.forEach((c) => {
        if (c && typeof c.field === "string")
          detailLines.push(
            `${c.field}: ${String(c.from ?? "")} → ${String(c.to ?? "")}`
          );
      });
    } else if (details.from != null && details.to != null) {
      detailLines.push(`${String(details.from)} → ${String(details.to)}`);
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
        throw new Error("Failed to load activity log");
      }
      const data = await res.json();
      setList(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, [filterEntityType, filterAction, filterDateFrom, filterDateTo]);

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Activity Log
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Audit trail of your actions (read-only)
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">Filters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
              Entity type
            </label>
            <select
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
            >
              {ENTITY_TYPES.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">Action</label>
            <select
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm min-w-[180px]"
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
            >
              {ACTION_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">From date</label>
            <input
              type="date"
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1.5 text-sm"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">To date</label>
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
          <p className="text-muted-foreground text-sm">Loading…</p>
        </div>
      ) : error ? (
        <p className="text-red-600 dark:text-red-400">{error}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No activity found.</p>
      ) : (
        <ul className="space-y-2">
          {list.map((entry) => {
            const detailLines = formatDetails(entry.action, entry.details);
            return (
              <li
                key={entry.id}
                className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 px-4 py-3 space-y-1"
              >
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
                    {formatDateTime(entry.createdAt)}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {ACTION_OPTIONS.find((o) => o.value === entry.action)
                      ?.label ?? entry.action}
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
                      <div>By: {entry.userDisplayName}</div>
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
