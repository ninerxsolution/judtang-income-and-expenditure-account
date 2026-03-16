"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { Bell, Monitor, Trash2, Languages, Info, HelpCircle, Wallet } from "lucide-react";
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
import { DeactivateAccountSection } from "@/components/dashboard/deactivate-account-section";
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
      .catch(() => { });
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
    { id: "budget", label: t("settings.budget.title") },
    { id: "data-tools", label: t("dataTools.title") },
    { id: "sessions", label: t("settings.sessions.title") },
    { id: "privacy", label: t("settings.privacy.title") },
    { id: "feedback", label: t("settings.feedback.title") },
  ];

  return (
    <div className="flex gap-8">
      {/* Table of contents - left sidebar */}
      <nav
        aria-label={t("settings.contents")}
        className="sticky top-24 self-start hidden w-44 shrink-0 lg:block"
      >
        <div className="space-y-1">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-[#A09080] dark:text-stone-400">
            {t("settings.contents")}
          </p>
          {tocItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[#6B5E4E] hover:bg-[#F5F0E8] hover:text-[#3D3020] dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
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
          <p className="text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("settings.description")}
          </p>
        </header>

        {/* About */}
        <section
          id="information"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                  {t("settings.information.title")}
                </h2>
                <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.information.description")}
                </p>
              </div>
            </div>
          </div>

          {appInfo && (
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                  {t("settings.information.appName")}
                </dt>
                <dd className="mt-0.5 font-medium text-[#3D3020] dark:text-stone-100">
                  {appInfo.appName}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                  {t("settings.information.version")}
                </dt>
                <dd className="mt-0.5 font-medium text-[#3D3020] dark:text-stone-100">
                  {appInfo.fullVersion}
                </dd>
              </div>
            </dl>
          )}

          <Link href="/dashboard/settings/patch-note" className="mt-3 inline-flex items-center text-sm font-medium text-[#3D3020] hover:text-[#6B5E4E] dark:text-stone-100 dark:hover:text-stone-300 underline-offset-4 hover:underline">
            {t("settings.information.patchNote")}
          </Link>
        </section>

        {/* Language selection */}
        <section
          id="language"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <Languages className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                  {t("settings.language.titleWithNative")}
                </h2>
                <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.language.description")}
                </p>
              </div>
            </div>
          </div>

          <div className="inline-flex gap-1 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-0.5 text-xs dark:border-stone-700 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => {
                if (language !== "th") setPendingLanguage("th");
              }}
              className={`inline-flex items-center gap-1 rounded-sm px-3 py-1.5 transition ${language === "th"
                  ? "bg-[#5C6B52] text-white dark:bg-stone-100 dark:text-stone-900"
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
              className={`inline-flex items-center gap-1 rounded-sm px-3 py-1.5 transition ${language === "en"
                  ? "bg-[#5C6B52] text-white dark:bg-stone-100 dark:text-stone-900"
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
          <p className="mt-3 text-xs text-[#A09080] dark:text-stone-400">
            {t("settings.language.helper")}
          </p>
        </section>

        {/* Activity Log link-out */}
        <section
          id="activity-log"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                  {t("settings.activityLog.title")}
                </h2>
                <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.activityLog.description")}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/settings/activity-log"
            className="inline-flex items-center text-sm font-medium text-[#3D3020] hover:text-[#6B5E4E] dark:text-stone-100 dark:hover:text-stone-300 underline-offset-4 hover:underline"
          >
            {t("settings.activityLog.open")}
          </Link>
        </section>

        {/* Category settings */}
        <div id="categories" className="scroll-mt-6">
          <CategorySettings />
        </div>

        {/* Budget link-out */}
        <section
          id="budget"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                  {t("settings.budget.title")}
                </h2>
                <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.budget.description")}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/settings/budget"
            className="inline-flex items-center text-sm font-medium text-[#3D3020] hover:text-[#6B5E4E] dark:text-stone-100 dark:hover:text-stone-300 underline-offset-4 hover:underline"
          >
            {t("settings.budget.open")}
          </Link>
        </section>

        {/* Tools inline section (full tools UI embedded) */}
        <section
          id="data-tools"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <DataTools />
        </section>

        {/* Sessions inline section */}
        <section
          id="sessions"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                  {t("settings.sessions.title")}
                </h2>
                <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.sessions.description")}
                </p>
              </div>
            </div>
          </div>

          {loadingSessions && !sessionsData ? (
            <ul className="space-y-2">
              {[1, 2, 3].map((i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/60">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-[#A09080]" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <Skeleton className="h-6 w-14 rounded-md" />
                </li>
              ))}
            </ul>
          ) : sessionsError ? (
            <p className="text-sm text-red-600 dark:text-red-400">
              {t("settings.sessions.error")}
            </p>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-[#A09080] dark:text-stone-400">
              {t("settings.sessions.empty")}
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.slice(0, 5).map((s) => (
                <li
                  key={s.sessionId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-[#D4C9B0] bg-[#FDFAF4] px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/60"
                >
                  <div className="flex items-center gap-3">
                    <Monitor className="h-4 w-4 text-[#A09080]" />
                    <div>
                      <p className="font-medium">
                        {deviceLabel(s.userAgent)}
                        {s.isCurrent && (
                          <span className="ml-2 text-xs font-normal text-[#A09080] dark:text-stone-400">
                            {t("settings.sessions.thisDevice")}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#A09080] dark:text-stone-400">
                        {t(
                          "settings.sessions.lastActivePrefix",
                          {
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
                    className="inline-flex items-center gap-1.5 rounded-md border border-[#D4C9B0] px-2 py-1 text-xs text-[#3D3020] hover:bg-[#F5F0E8] disabled:opacity-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800"
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
              <p className="text-xs text-[#A09080] dark:text-stone-400">
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
                className="text-xs font-medium text-[#3D3020] hover:text-[#3D3020] dark:text-stone-300 dark:hover:text-stone-100 underline-offset-4 hover:underline"
              >
                {t("settings.sessions.manageAll")}
              </Link>
            </div>
          )}
        </section>

        {/* Privacy / Deactivate */}
        <section
          id="privacy"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <DeactivateAccountSection />
        </section>

        {/* Help & Feedback */}
        <section
          id="feedback"
          className="scroll-mt-6 rounded-lg border border-[#D4C9B0] bg-[#F5F0E8]/50 p-6 dark:border-stone-700 dark:bg-stone-900/30"
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
                  {t("settings.feedback.title")}
                </h2>
                <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
                  {t("settings.feedback.description")}
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/settings/feedback"
            className="inline-flex items-center text-sm font-medium text-[#3D3020] hover:text-[#6B5E4E] dark:text-stone-100 dark:hover:text-stone-300 underline-offset-4 hover:underline"
          >
            {t("settings.feedback.open")}
          </Link>
        </section>
      </div>
    </div>
  );
}

