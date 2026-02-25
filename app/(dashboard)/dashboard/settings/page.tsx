"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, Monitor, Trash2, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTools } from "@/components/dashboard/data-tools";

type SessionRow = {
  sessionId: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
};

type SessionsResponse = {
  sessions: SessionRow[];
  currentSessionId: string | null;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function deviceLabel(userAgent: string | null) {
  if (!userAgent) return "Unknown device";
  if (userAgent.includes("Mobile")) return "Mobile";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  return "Unknown device";
}

export default function SettingsPage() {
  const [sessionsData, setSessionsData] = useState<SessionsResponse | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function fetchSessions() {
    setLoadingSessions(true);
    setSessionsError(null);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) {
        if (res.status === 401) {
          await signOut({ callbackUrl: "/sign-in" });
          return;
        }
        throw new Error("Failed to load sessions");
      }
      const json: SessionsResponse = await res.json();
      setSessionsData(json);
    } catch (e) {
      setSessionsError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoadingSessions(false);
    }
  }

  useEffect(() => {
    fetchSessions();
  }, []);

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

  const sessions = sessionsData?.sessions ?? [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Manage your activity log, data tools, and active sessions.
        </p>
      </header>

      {/* Activity Log link-out */}
      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Activity Log
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                View a complete audit trail of important actions in your account.
              </p>
            </div>
            <Link
              href="/dashboard/settings/activity-log"
              className="inline-flex items-center text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 underline-offset-4 hover:underline"
            >
              Open Activity Log
            </Link>
          </div>
        </div>
      </section>

      {/* Tools inline section (full tools UI embedded) */}
      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/30">
        <DataTools />
      </section>

      {/* Sessions inline section */}
      <section className="rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                Sessions
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Quickly review and revoke active sessions on your account.
              </p>
            </div>
          </div>
          
        </div>

        {loadingSessions && !sessionsData ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Loading sessions…
            </p>
          </div>
        ) : sessionsError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {sessionsError}
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No active sessions.
          </p>
        ) : (
          <ul className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <li
                key={s.sessionId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900/60"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="font-medium">
                      {deviceLabel(s.userAgent)}
                      {s.isCurrent && (
                        <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                          (this device)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Last active {formatDate(s.lastActiveAt)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => revokeOne(s.sessionId)}
                  disabled={!!revoking}
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  <Trash2 className="h-3 w-3" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        {otherSessions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {otherSessions.length} session
              {otherSessions.length === 1 ? "" : "s"} on other devices.
            </p>
            <Link
              href="/dashboard/settings/sessions"
              className="text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 underline-offset-4 hover:underline"
            >
              Manage all sessions
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

