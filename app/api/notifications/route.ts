import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import type { NotificationType } from "@prisma/client";
import {
  createNotification,
  listPersistedNotifications,
  countUnreadNotifications,
  computeVirtualAlerts,
  mergeNotifications,
} from "@/lib/notifications";

type SessionWithId = { user: { id?: string } };

const VALID_TYPES: NotificationType[] = [
  "EVENT_SLIP_DONE",
  "EVENT_IMPORT_DONE",
  "EVENT_CARD_PAYMENT",
];

/** GET /api/notifications — merged persisted + virtual alerts for the authenticated user. */
export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "50"), 100);
  const unreadOnly = url.searchParams.get("unreadOnly") === "true";

  const [persisted, virtual, unreadCount] = await Promise.all([
    listPersistedNotifications(userId, { limit, unreadOnly }),
    computeVirtualAlerts(userId),
    countUnreadNotifications(userId),
  ]);

  const items = mergeNotifications(persisted, virtual);

  return NextResponse.json({
    items: items.map((item) => ({
      ...item,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
    unreadCount: unreadCount + virtual.length,
  });
}

/**
 * POST /api/notifications — create an event notification from the client side.
 * Used by the slip upload dialog after confirming transactions.
 */
export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { type?: string; payload?: Record<string, unknown>; link?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.type || !VALID_TYPES.includes(body.type as NotificationType)) {
    return NextResponse.json(
      { error: `type must be one of: ${VALID_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  const payload = body.payload as Record<string, string | number | boolean | null | undefined> | undefined;
  await createNotification(userId, body.type as NotificationType, payload, body.link);

  return NextResponse.json({ ok: true }, { status: 201 });
}
