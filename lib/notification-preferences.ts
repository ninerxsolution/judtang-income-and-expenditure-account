/**
 * Per-user notification channel preferences.
 *
 * Preferences are stored per NotificationCategory; a missing row means "use the
 * registry default" (CATEGORY_DEFAULTS). `inApp` is the master switch for a
 * category — when it is off, nothing is persisted for that category and so no
 * email/push fires either (the persisted row is also the dedupe ledger).
 */
import type { NotificationType, NotificationCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CATEGORY_DEFAULTS,
  NOTIFICATION_CATEGORIES,
  getCategory,
  type ChannelMap,
} from "@/lib/notification-registry";

export type PreferenceMap = Record<NotificationCategory, ChannelMap>;

function defaultMap(): PreferenceMap {
  const map = {} as PreferenceMap;
  for (const cat of NOTIFICATION_CATEGORIES) {
    map[cat] = { ...CATEGORY_DEFAULTS[cat] };
  }
  return map;
}

/** Load a user's effective per-category preferences, filling defaults. */
export async function getPreferenceMap(userId: string): Promise<PreferenceMap> {
  const map = defaultMap();
  try {
    const rows = await prisma.notificationPreference.findMany({ where: { userId } });
    for (const row of rows) {
      map[row.category] = { inApp: row.inApp, email: row.email, push: row.push };
    }
  } catch {
    // Preferences are best-effort; fall back to defaults rather than break the caller.
  }
  return map;
}

/** Resolve channels for a type from a preloaded preference map (no I/O). */
export function resolveChannelsFromMap(map: PreferenceMap, type: NotificationType): ChannelMap {
  const category = getCategory(type);
  return map[category] ?? CATEGORY_DEFAULTS[category];
}

/** Resolve channels for a single notification type (one query). */
export async function resolveChannels(userId: string, type: NotificationType): Promise<ChannelMap> {
  const category = getCategory(type);
  try {
    const row = await prisma.notificationPreference.findUnique({
      where: { userId_category: { userId, category } },
    });
    if (row) return { inApp: row.inApp, email: row.email, push: row.push };
  } catch {
    // Best-effort; fall through to defaults.
  }
  return CATEGORY_DEFAULTS[category];
}

/** Upsert one category's channel preferences. */
export async function setPreference(
  userId: string,
  category: NotificationCategory,
  channels: Partial<ChannelMap>,
): Promise<void> {
  const base = CATEGORY_DEFAULTS[category];
  const next: ChannelMap = {
    inApp: channels.inApp ?? base.inApp,
    email: channels.email ?? base.email,
    push: channels.push ?? base.push,
  };
  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category } },
    create: { userId, category, ...next },
    update: next,
  });
}
