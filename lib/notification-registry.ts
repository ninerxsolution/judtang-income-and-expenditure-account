/**
 * Single source of truth for notification types.
 *
 * Every NotificationType maps to exactly one entry here: its kind (discrete
 * event vs. recomputed alert), category (used for per-user channel
 * preferences), severity (drives UI colour), and a lucide icon name (the UI
 * maps the string to a component so this module stays framework-free and can
 * run on the server).
 *
 * Channel defaults are per-category (see CATEGORY_DEFAULTS) to match the
 * NotificationPreference model, which is keyed by category.
 */
import type { NotificationType, NotificationCategory } from "@prisma/client";

export type NotificationKind = "event" | "alert";
export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationChannel = "inApp" | "email" | "push";
export type ChannelMap = Record<NotificationChannel, boolean>;

export type NotificationTypeMeta = {
  kind: NotificationKind;
  category: NotificationCategory;
  severity: NotificationSeverity;
  /** lucide-react icon name; UI resolves it to a component. */
  icon: string;
};

/**
 * Exhaustive map of every NotificationType. The `Record<NotificationType, …>`
 * makes TypeScript fail the build if a new enum member is added without an
 * entry here — that is the whole point of centralising it.
 */
export const NOTIFICATION_REGISTRY: Record<NotificationType, NotificationTypeMeta> = {
  // --- Transactions ---
  EVENT_SLIP_DONE: { kind: "event", category: "TRANSACTION", severity: "info", icon: "Receipt" },
  EVENT_IMPORT_DONE: { kind: "event", category: "TRANSACTION", severity: "info", icon: "Upload" },
  EVENT_EXPORT_DONE: { kind: "event", category: "TRANSACTION", severity: "info", icon: "Download" },
  EVENT_CROSS_CURRENCY_TRANSFER: { kind: "event", category: "TRANSACTION", severity: "info", icon: "ArrowLeftRight" },
  // --- Credit card ---
  EVENT_CARD_PAYMENT: { kind: "event", category: "CARD", severity: "info", icon: "CreditCard" },
  EVENT_CARD_STATEMENT_CLOSED: { kind: "event", category: "CARD", severity: "info", icon: "FileText" },
  EVENT_CARD_INTEREST_APPLIED: { kind: "event", category: "CARD", severity: "warning", icon: "Percent" },
  ALERT_CARD_DUE: { kind: "alert", category: "CARD", severity: "warning", icon: "CalendarClock" },
  ALERT_CREDIT_LIMIT: { kind: "alert", category: "CARD", severity: "warning", icon: "Gauge" },
  // --- Budget ---
  ALERT_BUDGET: { kind: "alert", category: "BUDGET", severity: "warning", icon: "PieChart" },
  ALERT_NO_BUDGET: { kind: "alert", category: "BUDGET", severity: "info", icon: "PiggyBank" },
  // --- Accounts ---
  EVENT_RECONCILE_MISMATCH: { kind: "event", category: "ACCOUNT", severity: "critical", icon: "Scale" },
  ALERT_INCOMPLETE_ACCOUNT: { kind: "alert", category: "ACCOUNT", severity: "warning", icon: "AlertTriangle" },
  ALERT_NEGATIVE_BALANCE: { kind: "alert", category: "ACCOUNT", severity: "critical", icon: "TrendingDown" },
  // --- Recurring ---
  EVENT_RECURRING_POSTED: { kind: "event", category: "RECURRING", severity: "info", icon: "Repeat" },
  ALERT_RECURRING_DUE: { kind: "alert", category: "RECURRING", severity: "warning", icon: "Repeat" },
  // --- Security / account lifecycle ---
  EVENT_SECURITY_NEW_SIGN_IN: { kind: "event", category: "SECURITY", severity: "critical", icon: "LogIn" },
  EVENT_SECURITY_PASSWORD_CHANGED: { kind: "event", category: "SECURITY", severity: "critical", icon: "KeyRound" },
  EVENT_SECURITY_SESSION_REVOKED: { kind: "event", category: "SECURITY", severity: "critical", icon: "ShieldX" },
  EVENT_ACCOUNT_DEACTIVATED: { kind: "event", category: "SECURITY", severity: "warning", icon: "UserX" },
  EVENT_ACCOUNT_STATUS_CHANGED: { kind: "event", category: "SECURITY", severity: "critical", icon: "ShieldAlert" },
  ALERT_DELETION_PENDING: { kind: "alert", category: "SECURITY", severity: "critical", icon: "Clock" },
  // --- Reports ---
  EVENT_REPORT_SUBMITTED: { kind: "event", category: "REPORT", severity: "info", icon: "Flag" },
  EVENT_REPORT_STATUS_CHANGED: { kind: "event", category: "REPORT", severity: "info", icon: "MessageSquare" },
  // --- Announcements ---
  EVENT_ANNOUNCEMENT: { kind: "event", category: "ANNOUNCEMENT", severity: "info", icon: "Megaphone" },
};

/** Per-category default channels, used when a user has no preference row. */
export const CATEGORY_DEFAULTS: Record<NotificationCategory, ChannelMap> = {
  SECURITY: { inApp: true, email: true, push: true },
  CARD: { inApp: true, email: false, push: true },
  ACCOUNT: { inApp: true, email: false, push: true },
  BUDGET: { inApp: true, email: false, push: false },
  RECURRING: { inApp: true, email: false, push: false },
  TRANSACTION: { inApp: true, email: false, push: false },
  REPORT: { inApp: true, email: false, push: false },
  ANNOUNCEMENT: { inApp: true, email: false, push: false },
};

/** Stable display order for the preferences UI. */
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "SECURITY",
  "CARD",
  "BUDGET",
  "ACCOUNT",
  "RECURRING",
  "TRANSACTION",
  "REPORT",
  "ANNOUNCEMENT",
];

const ALL_TYPES = Object.keys(NOTIFICATION_REGISTRY) as NotificationType[];

/** Every alert-kind type — the set the generator owns and may auto-resolve. */
export const ALERT_TYPES: NotificationType[] = ALL_TYPES.filter(
  (t) => NOTIFICATION_REGISTRY[t].kind === "alert",
);

/** Event types a client may create via POST /api/notifications (server still owns link/payload shaping). */
export const CLIENT_CREATABLE_TYPES: NotificationType[] = ["EVENT_SLIP_DONE"];

export function getMeta(type: NotificationType): NotificationTypeMeta {
  return NOTIFICATION_REGISTRY[type];
}

export function isAlertType(type: NotificationType): boolean {
  return NOTIFICATION_REGISTRY[type]?.kind === "alert";
}

export function getCategory(type: NotificationType): NotificationCategory {
  return NOTIFICATION_REGISTRY[type].category;
}

export function getSeverity(type: NotificationType): NotificationSeverity {
  return NOTIFICATION_REGISTRY[type].severity;
}
