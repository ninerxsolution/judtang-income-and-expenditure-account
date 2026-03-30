import type { Language } from "@/i18n";

/**
 * Base URL and path helpers for links embedded in transactional emails.
 *
 * Production: prefer APP_BASE_URL so links match the public site even if NEXTAUTH_URL
 * points at an internal URL.
 *
 * Development (`next dev`): prefer NEXTAUTH_URL when set so copied prod APP_BASE_URL
 * in .env does not send users to production from a local signup.
 */

const DEFAULT_LOCAL_BASE = "http://localhost:3910";

function normalizeEmailPath(envValue: string | undefined, fallback: string): string {
  const raw = (envValue?.trim() || fallback).trim();
  return raw.startsWith("/") ? raw : `/${raw}`;
}

function preferNextAuthUrlForEmailLinks(): boolean {
  const appEnv = process.env.APP_ENV?.toLowerCase();
  if (appEnv === "development") return true;
  return process.env.NODE_ENV === "development";
}

export function getEmailAppBaseUrl(): string {
  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  const appBase = process.env.APP_BASE_URL?.trim();

  if (preferNextAuthUrlForEmailLinks() && nextAuth) {
    return nextAuth.replace(/\/+$/, "");
  }

  const raw = appBase || nextAuth || DEFAULT_LOCAL_BASE;
  return raw.replace(/\/+$/, "");
}

export function getEmailVerifyPath(): string {
  return normalizeEmailPath(process.env.EMAIL_VERIFY_URL, "/verify-email");
}

export function getEmailResetPasswordPath(): string {
  return normalizeEmailPath(process.env.EMAIL_RESET_PASSWORD_URL, "/reset-password");
}

export function buildVerifyEmailUrl(token: string, lang?: Language): string {
  const base = getEmailAppBaseUrl();
  const path = getEmailVerifyPath();
  const params = new URLSearchParams();
  params.set("token", token);
  if (lang === "en" || lang === "th") {
    params.set("lang", lang);
  }
  return `${base}${path}?${params.toString()}`;
}

export function buildResetPasswordUrl(token: string, lang?: Language): string {
  const base = getEmailAppBaseUrl();
  const path = getEmailResetPasswordPath();
  const params = new URLSearchParams();
  params.set("token", token);
  if (lang === "en" || lang === "th") {
    params.set("lang", lang);
  }
  return `${base}${path}?${params.toString()}`;
}

export function buildAdminReportDetailUrl(reportId: string): string {
  const base = getEmailAppBaseUrl();
  return `${base}/admin/reports/${encodeURIComponent(reportId)}`;
}

export function buildAdminContactMessageDetailUrl(messageId: string): string {
  const base = getEmailAppBaseUrl();
  return `${base}/admin/contact-messages/${encodeURIComponent(messageId)}`;
}
