"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Monitor, Trash2, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function SessionsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  async function fetchSessions() {
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
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
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
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
        <p className="text-muted-foreground text-sm">Loading sessions…</p>
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
      <h1 className="text-xl font-semibold">Active sessions</h1>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
        You can revoke individual sessions or sign out everywhere.
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
            Revoke all other sessions
          </button>
        )}
        <button
          type="button"
          onClick={revokeAll}
          disabled={!!revoking}
          className="inline-flex items-center gap-2 rounded-md border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Revoke all sessions
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
                      (this device)
                    </span>
                  )}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Last active {formatDate(s.lastActiveAt)} · Created {formatDate(s.createdAt)}
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
              Revoke
            </button>
          </li>
        ))}
      </ul>

      {sessions.length === 0 && (
        <p className="mt-4 text-zinc-500 dark:text-zinc-400">No sessions found.</p>
      )}
    </div>
  );
}
