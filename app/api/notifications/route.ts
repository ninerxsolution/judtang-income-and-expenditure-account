import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import type { NotificationType } from "@prisma/client";
import {
  notify,
  listNotifications,
  countUnreadNotifications,
  generateNotifications,
  pruneOldNotifications,
  deleteNotifications,
} from "@/lib/notifications";
import { CLIENT_CREATABLE_TYPES } from "@/lib/notification-registry";

type SessionWithId = { user: { id?: string } };

/** Server-controlled link per client-creatable type (never trust the client's link). */
const CLIENT_TYPE_LINK: Record<string, string> = {
  EVENT_SLIP_DONE: "/dashboard/transactions",
};

function toInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** GET /api/notifications — generates fresh alerts, then returns the user's list. */
export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  // Generate-on-load: reconcile alerts with current state (idempotent), then
  // opportunistically prune old read rows. Neither blocks the response on error.
  await generateNotifications(userId);
  void pruneOldNotifications(userId);

  const [items, unreadCount] = await Promise.all([
    listNotifications(userId, { limit, unreadOnly }),
    countUnreadNotifications(userId),
  ]);

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    unreadCount,
  });
}

/**
 * POST /api/notifications — create a client-originated event notification.
 * Locked down: only whitelisted types, the link is server-owned, and the
 * payload is coerced to safe numeric/boolean fields (no arbitrary injection).
 */
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; payload?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type as NotificationType | undefined;
  if (!type || !CLIENT_CREATABLE_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `type must be one of: ${CLIENT_CREATABLE_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const p = body.payload ?? {};
  let payload: Record<string, string | number | boolean | null> = {};
  if (type === "EVENT_SLIP_DONE") {
    payload = {
      createdCount: toInt(p.createdCount),
      totalCount: toInt(p.totalCount),
      hasErrors: Boolean(p.hasErrors),
    };
  }

  await notify(userId, type, { payload, link: CLIENT_TYPE_LINK[type] });
  return NextResponse.json({ ok: true }, { status: 201 });
}

/** DELETE /api/notifications — remove notifications by id. Body: { ids: string[] }. */
export async function DELETE(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body.ids) ? body.ids.filter((id) => typeof id === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
  }

  await deleteNotifications(userId, ids);
  return NextResponse.json({ ok: true });
}
