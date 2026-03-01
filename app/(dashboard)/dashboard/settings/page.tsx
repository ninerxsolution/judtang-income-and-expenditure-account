"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, Monitor, Trash2, LogOut, Languages, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTools } from "@/components/dashboard/data-tools";
import { CategorySettings } from "@/components/dashboard/category-settings";
import { useI18n } from "@/hooks/use-i18n";
import type { Language } from "@/i18n";

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

type AppInfoResponse = {
  appName: string;
  appVersion: string;
  patchVersion: string;
  fullVersion: string;
};

function formatRelative(iso: string): { key: "justNow" | "minutesAgo" | "hoursAgo" | "daysAgo"; count?: number } {
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

export default function SettingsPage() {
  const { t, language, setLanguage } = useI18n();

  const [pendingLanguage, setPendingLanguage] = useState<Language | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfoResponse | null>(null);
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

  useEffect(() => {
    fetch("/api/app-info")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AppInfoResponse | null) => data && setAppInfo(data))
      .catch(() => {});
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

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const tocItems = [
    { id: "information", label: t("settings.information.title") },
    { id: "language", label: t("settings.language.titleWithNative") },
    { id: "activity-log", label: t("settings.activityLog.title") },
    { id: "categories", label: t("settings.categories.title") },
    { id: "data-tools", label: t("dataTools.title") },
    { id: "sessions", label: t("settings.sessions.title") },
  ];

  return (
    <div className="flex gap-8">
      {/* Table of contents - left sidebar */}
      <nav
        aria-label={t("settings.contents")}
        className="hidden w-44 shrink-0 lg:block"
      >
        <div className="space-y-1">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {t("settings.contents")}
          </p>
          {tocItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-8">
        <header className="space-y-1">
          <h1 className="text-xl font-semibold">{t("settings.title")}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {t("settings.description")}
          </p>
        </header>

        {/* Project information */}
        <section
          id="information"
          className="scroll-mt-6 rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Info className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-3">
              <div>
                <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                  {t("settings.information.title")}
                </h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {t("settings.information.description")}
                </p>
              </div>
              {appInfo && (
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {t("settings.information.appName")}
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-100">
                      {appInfo.appName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {t("settings.information.version")}
                    </dt>
                    <dd className="mt-0.5 font-medium text-zinc-800 dark:text-zinc-100">
                      {appInfo.fullVersion}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </section>

        {/* Language selection */}
        <section
          id="language"
          className="scroll-mt-6 rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30"
        >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Languages className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {t("settings.language.titleWithNative")}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("settings.language.description")}
              </p>
            </div>
            <div className="inline-flex gap-1 rounded-md border border-zinc-300 bg-white p-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900">
              <button
                type="button"
                onClick={() => {
                  if (language !== "th") setPendingLanguage("th");
                }}
                className={`inline-flex items-center gap-1 rounded-sm px-3 py-1.5 transition ${
                  language === "th"
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("settings.language.optionThai")}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (language !== "en") setPendingLanguage("en");
                }}
                className={`inline-flex items-center gap-1 rounded-sm px-3 py-1.5 transition ${
                  language === "en"
                    ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t("settings.language.optionEnglish")}
              </button>
            </div>
            <AlertDialog
              open={pendingLanguage !== null}
              onOpenChange={(open) => !open && setPendingLanguage(null)}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("settings.language.confirmTitle")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("settings.language.confirmMessage", {
                      language:
                        pendingLanguage === "th"
                          ? t("settings.language.optionThai")
                          : t("settings.language.optionEnglish"),
                    })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("common.actions.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      if (pendingLanguage) {
                        setLanguage(pendingLanguage);
                        setPendingLanguage(null);
                      }
                    }}
                  >
                    {t("settings.language.confirmButton")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("settings.language.helper")}
            </p>
          </div>
        </div>
      </section>

        {/* Activity Log link-out */}
        <section
          id="activity-log"
          className="scroll-mt-6 rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30"
        >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
            <Bell className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {t("settings.activityLog.title")}
              </h2>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {t("settings.activityLog.description")}
              </p>
            </div>
            <Link
              href="/dashboard/settings/activity-log"
              className="inline-flex items-center text-sm font-medium text-zinc-900 hover:text-zinc-700 dark:text-zinc-100 dark:hover:text-zinc-300 underline-offset-4 hover:underline"
            >
              {t("settings.activityLog.open")}
            </Link>
          </div>
        </div>
      </section>

        {/* Category settings */}
        <div id="categories" className="scroll-mt-6">
          <CategorySettings />
        </div>

        {/* Tools inline section (full tools UI embedded) */}
        <section
          id="data-tools"
          className="scroll-mt-6 rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/30"
        >
        <DataTools />
      </section>

        {/* Sessions inline section */}
        <section
          id="sessions"
          className="scroll-mt-6 rounded-lg border border-zinc-200 bg-zinc-50/50 p-6 dark:border-zinc-700 dark:bg-zinc-900/30"
        >
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {t("settings.sessions.title")}
              </h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                {t("settings.sessions.description")}
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
              {t("settings.sessions.loading")}
            </p>
          </div>
        ) : sessionsError ? (
          <p className="text-sm text-red-600 dark:text-red-400">
            {t("settings.sessions.error")}
          </p>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("settings.sessions.empty")}
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
                          {t("settings.sessions.thisDevice")}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
                      )}
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
                  {t("settings.sessions.revoke")}
                </button>
              </li>
            ))}
          </ul>
        )}

        {otherSessions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {otherSessions.length === 1
                ? t("settings.sessions.otherDevicesSummarySingular", {
                    count: otherSessions.length,
                  })
                : t("settings.sessions.otherDevicesSummaryPlural", {
                    count: otherSessions.length,
                  })}
            </p>
            <Link
              href="/dashboard/settings/sessions"
              className="text-xs font-medium text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100 underline-offset-4 hover:underline"
            >
              {t("settings.sessions.manageAll")}
            </Link>
          </div>
        )}
        </section>
      </div>
    </div>
  );
}

