"use client";

import { useCallback, useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Monitor, Trash2, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";

type SessionRow = {
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
};

type ApiResponse = {
  sessions: SessionRow[];
  currentSessionId: string | null;
};

function formatRelative(
  iso: string,
): { key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo"; count?: number } {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return { key: "justNow" };
  if (diffMins < 60) return { key: "minutesAgo", count: diffMins };
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return { key: "hoursAgo", count: diffHours };
  const diffDays = Math.floor(diffHours / 24);
  return { key: "daysAgo", count: diffDays };
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (userAgent.includes("Mobile")) return "Mobile";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown device";
}

export default function SessionsPage() {
  const { t } = useI18n();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) {
        if (res.status === 401) {
          await signOut({ callbackUrl: "/sign-in" });
          return;
        }
        throw new Error("Failed to load sessions");
      }
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.errors.generic"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function revokeOne(sessionId: string) {
    setRevoking(sessionId);
    try {
      const res = await fetch(`/api/sessions?sessionId=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.signOut) {
        await signOut({ callbackUrl: "/sign-in" });
        return;
      }
      await fetchSessions();
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAllOthers() {
    setRevoking("others");
    try {
      await fetch("/api/sessions?revokeAllOthers=true", { method: "DELETE" });
      await fetchSessions();
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAll() {
    setRevoking("all");
    try {
      const res = await fetch("/api/sessions?revokeAll=true", { method: "DELETE" });
      const json = await res.json();
      if (json.signOut) {
        await signOut({ callbackUrl: "/sign-in" });
      } else {
        await fetchSessions();
      }
    } finally {
      setRevoking(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-1 h-4 w-64" />
        <ul className="mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-36" />
                </div>
              </div>
              <Skeleton className="h-7 w-16 rounded-md" />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-600 dark:text-red-400">{error}</p>
    );
  }

  const sessions = data?.sessions ?? [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">
        {t("dashboard.pageTitle.sessions")}
      </h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        {t("sessionsPage.subtitle")}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {otherSessions.length > 0 && (
          <button
            type="button"
            onClick={revokeAllOthers}
            disabled={!!revoking}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {t("sessionsPage.actions.revokeOthers")}
          </button>
        )}
        <button
          type="button"
          onClick={revokeAll}
          disabled={!!revoking}
          className="inline-flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {t("sessionsPage.actions.revokeAll")}
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {sessions.map((s) => (
          <li
            key={s.sessionId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-4"
          >
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-zinc-500" />
              <div>
                <p className="font-medium">
                  {deviceLabel(s.userAgent)}
                  {s.isCurrent && (
                    <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                      {t("settings.sessions.thisDevice")}
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {t(
                    "settings.sessions.lastActivePrefix",
                    formatRelative(s.lastActiveAt).key === "justNow"
                      ? undefined
                      : {
                          relative: t(
                            `common.time.${formatRelative(s.lastActiveAt).key}`,
                            formatRelative(s.lastActiveAt).count
                              ? { count: formatRelative(s.lastActiveAt).count! }
                              : undefined,
                          ),
                        },
                  )}{" "}
                  ·{" "}
                  {t(
                    "sessionsPage.createdPrefix",
                    formatRelative(s.createdAt).key === "justNow"
                      ? undefined
                      : {
                          relative: t(
                            `common.time.${formatRelative(s.createdAt).key}`,
                            formatRelative(s.createdAt).count
                              ? { count: formatRelative(s.createdAt).count! }
                              : undefined,
                          ),
                        },
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => revokeOne(s.sessionId)}
              disabled={!!revoking}
              className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 px-2.5 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t("settings.sessions.revoke")}
            </button>
          </li>
        ))}
      </ul>

      {sessions.length === 0 && (
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">
          {t("sessionsPage.empty")}
        </p>
      )}
    </div>
  );
}
