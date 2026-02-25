"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { User, Monitor, Trash2, LogOut } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FormField } from "@/components/auth/form-field";
import { MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/validation";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  lastActiveAt: string | null;
  hasPassword: boolean;
};

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

export default function UserPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionsData, setSessionsData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Name form
  const [nameValue, setNameValue] = useState("");
  const [namePending, setNamePending] = useState(false);
  const [nameMessage, setNameMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const [revoking, setRevoking] = useState<string | null>(null);

  async function fetchProfile() {
    const res = await fetch("/api/users/me");
    if (!res.ok) {
      if (res.status === 401) {
        await signOut({ callbackUrl: "/sign-in" });
        return null;
      }
      throw new Error("Failed to load profile");
    }
    return res.json() as Promise<Profile>;
  }

  async function fetchSessions() {
    const res = await fetch("/api/sessions");
    if (!res.ok) {
      if (res.status === 401) {
        await signOut({ callbackUrl: "/sign-in" });
        return null;
      }
      throw new Error("Failed to load sessions");
    }
    return res.json() as Promise<SessionsResponse>;
  }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [profileData, sessionsResp] = await Promise.all([fetchProfile(), fetchSessions()]);
      if (profileData) {
        setProfile(profileData);
        setNameValue(profileData.name ?? "");
      }
      if (sessionsResp) setSessionsData(sessionsResp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  async function handleUpdateName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNameMessage(null);
    setNamePending(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNameMessage({ type: "error", text: data.error ?? "Failed to update name" });
        return;
      }
      setNameMessage({ type: "ok", text: "Name updated." });
      setProfile((p) => (p ? { ...p, name: nameValue.trim() || null } : null));
    } finally {
      setNamePending(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPasswordMessage({ type: "error", text: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      setPasswordMessage({ type: "error", text: `Password must be at most ${MAX_PASSWORD_LENGTH} characters.` });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }
    setPasswordPending(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.error ?? "Failed to change password" });
        return;
      }
      setPasswordMessage({ type: "ok", text: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setPasswordPending(false);
    }
  }

  async function revokeOne(sessionId: string) {
    setRevoking(sessionId);
    try {
      const url = "/api/sessions?sessionId=" + encodeURIComponent(sessionId);
      const res = await fetch(url, { method: "DELETE" });
      const json = await res.json();
      if (json.signOut) {
        await signOut({ callbackUrl: "/sign-in" });
        return;
      }
      const data = await fetchSessions();
      if (data) setSessionsData(data);
    } finally {
      setRevoking(null);
    }
  }

  async function revokeAllOthers() {
    setRevoking("others");
    try {
      await fetch("/api/sessions?revokeAllOthers=true", { method: "DELETE" });
      const data = await fetchSessions();
      if (data) setSessionsData(data);
    } finally {
      setRevoking(null);
    }
  }

  if (loading && !profile) {
    return (
      <div className="space-y-10">
        <Skeleton className="h-7 w-40" />
        <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-6">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </section>
        <section className="space-y-4 rounded-lg border border-border bg-muted/30 p-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-24" />
        </section>
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-red-600 dark:text-red-400">{error}</p>
    );
  }

  if (!profile) return null;

  const sessions = sessionsData?.sessions ?? [];
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-10">
      <h1 className="text-xl font-semibold">User profile</h1>

      {/* Profile block */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">Profile</h2>
        <div className="flex items-center gap-4">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.image}
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
              <User className="h-8 w-8 text-zinc-500 dark:text-zinc-400" />
            </div>
          )}
          <div>
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              {profile.name || "—"}
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{profile.email ?? "—"}</p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {profile.hasPassword ? "Signed in with email & password" : "Signed in with Google"}
            </p>
            {profile.lastActiveAt && (
              <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                Last active {formatDate(profile.lastActiveAt)}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Settings: change name */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">Settings</h2>
        <form onSubmit={handleUpdateName} className="space-y-4">
          <FormField
            id="profile-name"
            label="Display name"
            value={nameValue}
            onChange={setNameValue}
          />
          <button
            type="submit"
            disabled={namePending}
            className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
          >
            {namePending ? "Saving…" : "Save name"}
          </button>
          {nameMessage && (
            <p
              className={
                nameMessage.type === "ok"
                  ? "text-sm text-green-600 dark:text-green-400"
                  : "text-sm text-red-600 dark:text-red-400"
              }
            >
              {nameMessage.text}
            </p>
          )}
        </form>

        {/* Change password (only if has password) */}
        {profile.hasPassword ? (
          <form onSubmit={handleChangePassword} className="mt-8 space-y-4">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Change password</h3>
            <FormField
              id="current-password"
              label="Current password"
              type="password"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
            <FormField
              id="new-password"
              label="New password"
              type="password"
              value={newPassword}
              onChange={setNewPassword}
              autoComplete="new-password"
            />
            <FormField
              id="confirm-password"
              label="Confirm new password"
              type="password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={passwordPending}
              className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
            >
              {passwordPending ? "Updating…" : "Change password"}
            </button>
            {passwordMessage && (
              <p
                className={
                  passwordMessage.type === "ok"
                    ? "text-sm text-green-600 dark:text-green-400"
                    : "text-sm text-red-600 dark:text-red-400"
                }
              >
                {passwordMessage.text}
              </p>
            )}
          </form>
        ) : (
          <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            Signed in with Google — no password to change.
          </p>
        )}
      </section>

      {/* Sessions block */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Active sessions</h2>
          <Link
            href="/dashboard/sessions"
            className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            View all
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
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
        </div>
        <ul className="space-y-3">
          {sessions.slice(0, 5).map((s) => (
            <li
              key={s.sessionId}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-3"
            >
              <div className="flex items-center gap-3">
                <Monitor className="h-4 w-4 text-zinc-500" />
                <div>
                  <p className="text-sm font-medium">
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
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 dark:border-zinc-600 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                Revoke
              </button>
            </li>
          ))}
        </ul>
        {sessions.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No sessions.</p>
        )}
        {sessions.length > 5 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/dashboard/sessions" className="underline">
              View all {sessions.length} sessions
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}
