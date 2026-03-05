"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import {
  User,
  Monitor,
  Trash2,
  LogOut,
  CheckCircle2,
  Mail,
  Pencil,
  KeyRound,
  Link2,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from "@/components/ui/dialog";
import { FormField } from "@/components/auth/form-field";
import {
  MAX_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/validation";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import { ActivityHeatmap } from "@/components/dashboard/activity-heatmap";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  image: string | null;
  lastActiveAt: string | null;
  hasPassword: boolean;
  linkedAccounts: string[];
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
  const [nameDialogOpen, setNameDialogOpen] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const [revoking, setRevoking] = useState<string | null>(null);

  const [resendPending, setResendPending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { t } = useI18n();

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResendVerification() {
    if (profile?.emailVerified || resendPending || resendCooldown > 0) return;
    setResendPending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? t("common.errors.generic"));
        return;
      }
      toast.success(t("profile.resendVerificationSuccess"));
      setResendCooldown(60);
    } finally {
      setResendPending(false);
    }
  }

  async function handleUpdateName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setNamePending(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameValue.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to update name");
        return;
      }
      toast.success(t("profile.nameUpdated"));
      setProfile((p) => (p ? { ...p, name: nameValue.trim() || null } : null));
      setNameDialogOpen(false);
    } finally {
      setNamePending(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      toast.error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      toast.error(`Password must be at most ${MAX_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
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
        toast.error(data.error ?? "Failed to change password");
        return;
      }
      toast.success(t("profile.passwordUpdated"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordDialogOpen(false);
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

      {/* Profile block */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">Profile</h2>
        <div className="flex flex-wrap items-center gap-4">
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
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{profile.email ?? "—"}</p>
              {profile.email && (
                profile.emailVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3" />
                    {t("profile.emailVerified")}
                  </span>
                ) : (
                  <span className="inline-flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-amber-600 dark:text-amber-500">
                      {t("profile.emailNotVerified")}
                    </span>
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={resendPending || resendCooldown > 0}
                      className="inline-flex items-center gap-1 rounded border border-zinc-300 dark:border-zinc-600 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                      <Mail className="h-3 w-3" />
                      {resendCooldown > 0
                        ? t("profile.resendCooldown", { count: resendCooldown })
                        : t("profile.resendVerification")}
                    </button>
                  </span>
                )
              )}
            </div>
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

      <div className="min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <ActivityHeatmap />
      </div>

      {/* Settings: name + password as buttons with dialogs */}
      <section className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/50 p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4">
          {t("settings.title")}
        </h2>
        <div className="space-y-4">
          {/* Display name */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("profile.displayName")}
              </p>
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                {profile.name || "—"}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setNameValue(profile.name ?? "");
                setNameDialogOpen(true);
              }}
            >
              <Pencil className="h-4 w-4" />
              {t("profile.editName")}
            </Button>
          </div>

          {/* Change password (only if has password) */}
          {profile.hasPassword ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4">
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {t("profile.changePassword")}
                </p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  ••••••••
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordDialogOpen(true);
                }}
              >
                <KeyRound className="h-4 w-4" />
                {t("profile.changePassword")}
              </Button>
            </div>
          ) : (
            <p className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4 text-sm text-zinc-500 dark:text-zinc-400">
              {t("profile.noPasswordHint")}
            </p>
          )}

          {/* Linked accounts: Link Google for password users */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 p-4">
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("profile.linkedAccounts")}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                {(profile.linkedAccounts ?? []).includes("google")
                  ? t("profile.googleLinked")
                  : profile.hasPassword
                    ? t("profile.googleNotLinked")
                    : t("profile.googleOnly")}
              </p>
            </div>
            {profile.hasPassword && !(profile.linkedAccounts ?? []).includes("google") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => signIn("google", { callbackUrl: "/dashboard/me" })}
              >
                <Link2 className="h-4 w-4" />
                {t("profile.linkGoogle")}
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Edit name dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("profile.editNameDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("profile.editNameDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateName} className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <DialogBody className="space-y-4 pl-1">
              <FormField
                id="profile-name"
                label={t("profile.displayName")}
                value={nameValue}
                onChange={setNameValue}
                maxLength={MAX_NAME_LENGTH}
              />
            </DialogBody>
            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNameDialogOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={namePending}>
                {namePending ? t("profile.savingName") : t("profile.saveName")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change password dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t("profile.changePasswordDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("profile.changePasswordDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <DialogBody className="space-y-4 pl-1">
              <FormField
                id="current-password"
                label={t("profile.currentPassword")}
                type="password"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                maxLength={MAX_PASSWORD_LENGTH}
              />
              <FormField
                id="new-password"
                label={t("profile.newPassword")}
                type="password"
                value={newPassword}
                onChange={setNewPassword}
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
              />
              <FormField
                id="confirm-password"
                label={t("profile.confirmPassword")}
                type="password"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
              />
            </DialogBody>
            <DialogFooter className="shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordDialogOpen(false)}
              >
                {t("common.actions.cancel")}
              </Button>
              <Button type="submit" disabled={passwordPending}>
                {passwordPending
                  ? t("profile.updatingPassword")
                  : t("profile.updatePassword")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <Link href="/dashboard/settings/sessions" className="underline">
              View all {sessions.length} sessions
            </Link>
          </p>
        )}
      </section>
    </div>
  );
}

