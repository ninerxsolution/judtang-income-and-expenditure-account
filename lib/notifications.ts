/**
 * Notifications library — event-based (persisted) and virtual (computed on demand).
 *
 * Persisted types (stored in DB):
 *   EVENT_SLIP_DONE — OCR slip confirmed + transactions created
 *   EVENT_IMPORT_DONE — CSV import completed
 *   EVENT_CARD_PAYMENT — credit card payment recorded
 *
 * Virtual types (computed from existing domain data, not stored):
 *   ALERT_RECURRING_DUE — recurring templates due this month and unpaid
 *   ALERT_CARD_DUE — credit card due within the next N days
 *   ALERT_BUDGET — monthly/category budget over or near limit
 *   ALERT_INCOMPLETE_ACCOUNT — financial account missing required fields
 */

import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDueRecurringTransactions } from "@/lib/recurring-transactions";
import { getBudgetForMonth, getBudgetIndicator } from "@/lib/budget";
import { isAccountIncomplete } from "@/lib/financial-accounts";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type NotificationPayload = Record<string, string | number | boolean | null | undefined>;

/** Notification loaded from the database. */
export type PersistedNotificationItem = {
  id: string;
  type: string;
  payload: NotificationPayload | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
  kind: "persisted";
};

/** Alert computed at request time from domain data — not stored in DB. */
export type VirtualNotificationItem = {
  /** Synthetic stable ID, e.g. "recurring:2026-03:tpl-abc" */
  id: string;
  type: string;
  payload: NotificationPayload;
  link: string | null;
  readAt: null;
  createdAt: Date;
  kind: "virtual";
};

export type AnyNotificationItem = PersistedNotificationItem | VirtualNotificationItem;

// Virtual alert types (not stored in DB — used only on the frontend)
export const VirtualNotificationType = {
  ALERT_RECURRING_DUE: "ALERT_RECURRING_DUE",
  ALERT_CARD_DUE: "ALERT_CARD_DUE",
  ALERT_BUDGET: "ALERT_BUDGET",
  ALERT_INCOMPLETE_ACCOUNT: "ALERT_INCOMPLETE_ACCOUNT",
} as const;

export type VirtualNotificationTypeValue =
  (typeof VirtualNotificationType)[keyof typeof VirtualNotificationType];

// ---------------------------------------------------------------------------
// Persisted notifications
// ---------------------------------------------------------------------------

/**
 * Creates a persisted notification for a user. Never throws — failures are
 * swallowed so the calling request is not interrupted.
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  payload?: NotificationPayload,
  link?: string,
): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        payload: payload ?? undefined,
        link: link ?? null,
      },
    });
  } catch {
    // Do not fail the caller if notification insert fails
  }
}

/** List persisted notifications for a user, newest first. */
export async function listPersistedNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<PersistedNotificationItem[]> {
  const { limit = 50, unreadOnly = false } = options;
  const rows = await prisma.notification.findMany({
    where: {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      payload: true,
      link: true,
      readAt: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: (row.payload ?? null) as NotificationPayload | null,
    link: row.link,
    readAt: row.readAt,
    createdAt: row.createdAt,
    kind: "persisted" as const,
  }));
}

/** Mark specific notifications as read. Only updates notifications that belong to the user. */
export async function markNotificationsRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Mark specific notifications as unread. Only updates notifications that belong to the user. */
export async function markNotificationsUnread(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { readAt: null },
  });
}

/** Mark all unread notifications as read for a user. */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Count unread persisted notifications for a user. */
export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

// ---------------------------------------------------------------------------
// Virtual alerts — computed from existing domain data
// ---------------------------------------------------------------------------

/** Number of days ahead to warn about upcoming credit card due dates. */
const CARD_DUE_WARNING_DAYS = 7;

/** Budget progress threshold for "near limit" alert. */
const BUDGET_NEAR_LIMIT_THRESHOLD = 0.9;

/**
 * Computes virtual (non-persisted) alert items for a user based on the
 * current state of their data.
 */
export async function computeVirtualAlerts(userId: string): Promise<VirtualNotificationItem[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based

  const [recurringDue, budget, accounts] = await Promise.all([
    getDueRecurringTransactions(userId, year, month),
    getBudgetForMonth(userId, year, month),
    prisma.financialAccount.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        name: true,
        type: true,
        bankName: true,
        accountNumber: true,
        accountNumberMode: true,
        creditLimit: true,
        statementClosingDay: true,
        dueDay: true,
        interestRate: true,
        cardAccountType: true,
        linkedAccountId: true,
      },
    }),
  ]);

  const alerts: VirtualNotificationItem[] = [];

  // ----- Recurring due -----
  const unpaidDue = recurringDue.filter((t) => !t.isPaid);
  if (unpaidDue.length > 0) {
    alerts.push({
      id: `recurring:${year}-${month}`,
      type: VirtualNotificationType.ALERT_RECURRING_DUE,
      payload: {
        count: unpaidDue.length,
        year,
        month,
      },
      link: "/dashboard/recurring",
      readAt: null,
      createdAt: new Date(year, month - 1, 1), // start of current month
      kind: "virtual",
    });
  }

  // ----- Credit card due -----
  const creditCards = accounts.filter((a) => a.type === "CREDIT_CARD");
  for (const card of creditCards) {
    if (!card.dueDay) continue;

    // Compute next due date in this or next month
    const dueThisMonth = new Date(year, month - 1, card.dueDay);
    const nextDue =
      dueThisMonth >= now
        ? dueThisMonth
        : new Date(year, month, card.dueDay); // next month

    const daysRemaining = Math.ceil(
      (nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysRemaining <= CARD_DUE_WARNING_DAYS) {
      const last4 =
        card.accountNumber ? card.accountNumber.slice(-4) : null;
      alerts.push({
        id: `card-due:${card.id}`,
        type: VirtualNotificationType.ALERT_CARD_DUE,
        payload: {
          accountId: card.id,
          accountName: card.name,
          last4: last4 ?? "",
          dueDate: nextDue.toISOString(),
          daysRemaining,
          isOverdue: daysRemaining < 0,
        },
        link: `/dashboard/accounts/${card.id}`,
        readAt: null,
        createdAt: nextDue,
        kind: "virtual",
      });
    }
  }

  // ----- Budget over / near limit -----
  if (budget.budgetMonth) {
    // Total budget
    if (
      budget.totalBudget != null &&
      budget.totalBudget > 0 &&
      budget.totalProgress >= BUDGET_NEAR_LIMIT_THRESHOLD
    ) {
      const indicator = getBudgetIndicator(budget.totalProgress);
      alerts.push({
        id: `budget-total:${year}-${month}`,
        type: VirtualNotificationType.ALERT_BUDGET,
        payload: {
          year,
          month,
          categoryName: null,
          progress: budget.totalProgress,
          isOver: indicator === "over",
          indicator,
        },
        link: `/dashboard/settings/budget`,
        readAt: null,
        createdAt: new Date(year, month - 1, 1),
        kind: "virtual",
      });
    }

    // Per-category budgets
    for (const cat of budget.categoryBudgets) {
      if (cat.progress >= BUDGET_NEAR_LIMIT_THRESHOLD) {
        const indicator = getBudgetIndicator(cat.progress);
        alerts.push({
          id: `budget-cat:${cat.id}`,
          type: VirtualNotificationType.ALERT_BUDGET,
          payload: {
            year,
            month,
            categoryName: cat.categoryName ?? null,
            progress: cat.progress,
            isOver: indicator === "over",
            indicator,
          },
          link: `/dashboard/settings/budget`,
          readAt: null,
          createdAt: new Date(year, month - 1, 1),
          kind: "virtual",
        });
      }
    }
  }

  // ----- Incomplete accounts -----
  const incompleteAccounts = accounts.filter((a) => isAccountIncomplete(a));
  for (const acc of incompleteAccounts) {
    alerts.push({
      id: `incomplete-account:${acc.id}`,
      type: VirtualNotificationType.ALERT_INCOMPLETE_ACCOUNT,
      payload: { accountId: acc.id, accountName: acc.name },
      link: `/dashboard/accounts`,
      readAt: null,
      createdAt: now,
      kind: "virtual",
    });
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Merged list
// ---------------------------------------------------------------------------

/** Merges persisted + virtual alerts, sorted newest first. */
export function mergeNotifications(
  persisted: PersistedNotificationItem[],
  virtual: VirtualNotificationItem[],
): AnyNotificationItem[] {
  const all: AnyNotificationItem[] = [...persisted, ...virtual];
  all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return all;
}
