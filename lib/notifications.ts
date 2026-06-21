/**
 * Notifications — unified persisted model.
 *
 * Every notification is a real `Notification` row. Two flavours, both persisted:
 *   - EVENT_*  discrete events, created server-side at the moment they happen
 *              (via `notify`), optionally deduped by `dedupeKey`.
 *   - ALERT_*  conditions recomputed from domain state by `generateNotifications`
 *              (idempotent upsert keyed by `dedupeKey`) and auto-resolved when
 *              the condition no longer holds.
 *
 * `notify` is the single entry point: it resolves the user's channel
 * preferences, persists the in-app row (which doubles as the dedupe ledger),
 * and — in later phases — fans out to email / web push for newly created rows.
 */
import { Prisma, type NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getDueRecurringTransactions } from "@/lib/recurring-transactions";
import { getBudgetForMonth, getBudgetIndicator } from "@/lib/budget";
import { isAccountIncomplete } from "@/lib/financial-accounts";
import { ALERT_TYPES } from "@/lib/notification-registry";
import {
  getPreferenceMap,
  resolveChannels,
  resolveChannelsFromMap,
  type PreferenceMap,
} from "@/lib/notification-preferences";
import type { ChannelMap } from "@/lib/notification-registry";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationPayload = Record<string, string | number | boolean | null | undefined>;

export type NotificationItem = {
  id: string;
  type: string;
  payload: NotificationPayload | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export type NotifyOptions = {
  payload?: NotificationPayload;
  link?: string;
  /** Idempotency key (unique per user). Set for alerts and dedupable events. */
  dedupeKey?: string;
  /** Preloaded channel decision (skips the per-call preference query). */
  channels?: ChannelMap;
};

/** A candidate alert the generator wants to exist for the current state. */
type AlertCandidate = {
  type: NotificationType;
  dedupeKey: string;
  payload: NotificationPayload;
  link: string | null;
};

// ---------------------------------------------------------------------------
// Low-level persistence
// ---------------------------------------------------------------------------

/**
 * Inserts a notification row. When `dedupeKey` is set, a duplicate
 * (userId, dedupeKey) is treated as "already exists" rather than an error.
 * Returns whether a NEW row was created (used to gate email/push).
 */
async function persistNotification(
  userId: string,
  type: NotificationType,
  opts: NotifyOptions,
): Promise<{ created: boolean }> {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        payload: opts.payload ?? undefined,
        link: opts.link ?? null,
        dedupeKey: opts.dedupeKey ?? null,
      },
    });
    return { created: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Unique (userId, dedupeKey) — row already exists; not an error.
      return { created: false };
    }
    // Never fail the caller because of a notification insert.
    return { created: false };
  }
}

/**
 * Single entry point for raising a notification. Honors the user's per-category
 * channel preferences. `inApp` is the master switch — when off, nothing is
 * persisted (and therefore no email/push fires).
 */
export async function notify(
  userId: string,
  type: NotificationType,
  opts: NotifyOptions = {},
): Promise<{ created: boolean }> {
  const channels = opts.channels ?? (await resolveChannels(userId, type));
  if (!channels.inApp) return { created: false };

  const result = await persistNotification(userId, type, opts);

  // Email / web-push fan-out is wired in later phases and only for `created`
  // (first-occurrence) rows so generate-on-load never re-sends.
  // if (result.created && channels.email) void dispatchEmail(...)
  // if (result.created && channels.push) void dispatchPush(...)

  return result;
}

// ---------------------------------------------------------------------------
// Read / list / count
// ---------------------------------------------------------------------------

export async function listNotifications(
  userId: string,
  options: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationItem[]> {
  const { limit = 50, unreadOnly = false } = options;
  const rows = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, type: true, payload: true, link: true, readAt: true, createdAt: true },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    payload: (row.payload ?? null) as NotificationPayload | null,
    link: row.link,
    readAt: row.readAt,
    createdAt: row.createdAt,
  }));
}

export async function markNotificationsRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markNotificationsUnread(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { readAt: null },
  });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

/** Delete one or more notifications (scoped to the user). */
export async function deleteNotifications(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.deleteMany({ where: { id: { in: ids }, userId } });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

// ---------------------------------------------------------------------------
// Alert generation (idempotent + auto-resolving)
// ---------------------------------------------------------------------------

/** Days ahead to warn about an upcoming credit-card due date. */
const CARD_DUE_WARNING_DAYS = 7;
/** Budget progress at/above which we raise a near/over-limit alert. */
const BUDGET_NEAR_LIMIT_THRESHOLD = 0.9;

/**
 * Computes the alert notifications that SHOULD exist for the user right now.
 * Pure read of domain state — no writes.
 */
async function computeAlertCandidates(userId: string): Promise<AlertCandidate[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const ym = `${year}-${month}`;

  const [recurringDue, budget, accounts, user, budgetTemplateCount] = await Promise.all([
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
    prisma.user.findUnique({ where: { id: userId }, select: { deleteAfter: true, status: true } }),
    prisma.budgetTemplate.count({ where: { userId } }),
  ]);

  const candidates: AlertCandidate[] = [];

  // ----- Recurring due -----
  const unpaidDue = recurringDue.filter((t) => !t.isPaid);
  if (unpaidDue.length > 0) {
    candidates.push({
      type: "ALERT_RECURRING_DUE",
      dedupeKey: `recurring-due:${ym}`,
      payload: { count: unpaidDue.length, year, month },
      link: "/dashboard/recurring",
    });
  }

  // ----- Credit card due -----
  const creditCards = accounts.filter((a) => a.type === "CREDIT_CARD");
  for (const card of creditCards) {
    if (!card.dueDay) continue;
    const dueThisMonth = new Date(year, month - 1, card.dueDay);
    const nextDue = dueThisMonth >= now ? dueThisMonth : new Date(year, month, card.dueDay);
    const daysRemaining = Math.ceil((nextDue.getTime() - now.getTime()) / 86_400_000);
    if (daysRemaining <= CARD_DUE_WARNING_DAYS) {
      const dueKey = `${nextDue.getFullYear()}-${nextDue.getMonth() + 1}`;
      candidates.push({
        type: "ALERT_CARD_DUE",
        dedupeKey: `card-due:${card.id}:${dueKey}`,
        payload: {
          accountId: card.id,
          accountName: card.name,
          last4: card.accountNumber ? card.accountNumber.slice(-4) : "",
          dueDate: nextDue.toISOString(),
          daysRemaining,
          isOverdue: daysRemaining < 0,
        },
        link: `/dashboard/accounts/${card.id}`,
      });
    }
  }

  // ----- Budget over / near limit -----
  if (budget.budgetMonth) {
    if (
      budget.totalBudget != null &&
      budget.totalBudget > 0 &&
      budget.totalProgress >= BUDGET_NEAR_LIMIT_THRESHOLD
    ) {
      const indicator = getBudgetIndicator(budget.totalProgress);
      candidates.push({
        type: "ALERT_BUDGET",
        dedupeKey: `budget-total:${ym}`,
        payload: {
          year,
          month,
          categoryName: null,
          progress: budget.totalProgress,
          isOver: indicator === "over",
          indicator,
        },
        link: "/dashboard/settings/budget",
      });
    }
    for (const cat of budget.categoryBudgets) {
      if (cat.progress >= BUDGET_NEAR_LIMIT_THRESHOLD) {
        const indicator = getBudgetIndicator(cat.progress);
        candidates.push({
          type: "ALERT_BUDGET",
          dedupeKey: `budget-cat:${cat.id}:${ym}`,
          payload: {
            year,
            month,
            categoryName: cat.categoryName ?? null,
            progress: cat.progress,
            isOver: indicator === "over",
            indicator,
          },
          link: "/dashboard/settings/budget",
        });
      }
    }
  } else if (budgetTemplateCount > 0) {
    // Budget user with no budget applied this month — gentle nudge.
    candidates.push({
      type: "ALERT_NO_BUDGET",
      dedupeKey: `no-budget:${ym}`,
      payload: { year, month },
      link: "/dashboard/settings/budget",
    });
  }

  // ----- Incomplete accounts -----
  for (const acc of accounts.filter((a) => isAccountIncomplete(a))) {
    candidates.push({
      type: "ALERT_INCOMPLETE_ACCOUNT",
      dedupeKey: `incomplete-account:${acc.id}`,
      payload: { accountId: acc.id, accountName: acc.name },
      link: "/dashboard/accounts",
    });
  }

  // ----- Pending account deletion (user can still cancel) -----
  if (user?.deleteAfter && user.status !== "DELETED" && user.deleteAfter > now) {
    candidates.push({
      type: "ALERT_DELETION_PENDING",
      dedupeKey: `deletion-pending:${user.deleteAfter.toISOString().slice(0, 10)}`,
      payload: { deleteAfter: user.deleteAfter.toISOString() },
      link: "/dashboard/settings",
    });
  }

  return candidates;
}

/**
 * Idempotently reconciles a user's alert notifications with current state:
 * creates newly-true alerts (deduped) and deletes still-unread alerts whose
 * condition no longer holds. Safe to call on every dashboard load.
 */
export async function generateNotifications(userId: string): Promise<void> {
  let candidates: AlertCandidate[];
  try {
    candidates = await computeAlertCandidates(userId);
  } catch {
    return; // never block the request on alert generation
  }

  const candidateKeys = candidates.map((c) => c.dedupeKey);

  // Which candidate alerts already exist (so we only fire email/push once).
  const existing = candidateKeys.length
    ? await prisma.notification.findMany({
        where: { userId, type: { in: ALERT_TYPES }, dedupeKey: { in: candidateKeys } },
        select: { dedupeKey: true },
      })
    : [];
  const existingKeys = new Set(existing.map((e) => e.dedupeKey));

  let prefMap: PreferenceMap | null = null;
  const newCandidates = candidates.filter((c) => !existingKeys.has(c.dedupeKey));
  if (newCandidates.length > 0) {
    prefMap = await getPreferenceMap(userId);
    for (const c of newCandidates) {
      await notify(userId, c.type, {
        payload: c.payload,
        link: c.link ?? undefined,
        dedupeKey: c.dedupeKey,
        channels: resolveChannelsFromMap(prefMap, c.type),
      });
    }
  }

  // Auto-resolve: drop unread alerts whose condition cleared. With no current
  // candidates, every unread alert is stale and removed.
  await prisma.notification.deleteMany({
    where: {
      userId,
      readAt: null,
      type: { in: ALERT_TYPES },
      ...(candidateKeys.length ? { dedupeKey: { notIn: candidateKeys } } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Retention
// ---------------------------------------------------------------------------

/** Days after which a READ notification is purged. */
const READ_RETENTION_DAYS = 60;

/** Best-effort cleanup of old read notifications. Called opportunistically. */
export async function pruneOldNotifications(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - READ_RETENTION_DAYS * 86_400_000);
  try {
    await prisma.notification.deleteMany({
      where: { userId, readAt: { not: null, lt: cutoff } },
    });
  } catch {
    // ignore
  }
}
