import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { markNotificationsRead, markAllNotificationsRead } from "@/lib/notifications";

type SessionWithId = { user: { id?: string } };

/**
 * PATCH /api/notifications/read
 * Body: { ids: string[] } to mark specific notifications as read,
 * or { all: true } to mark all as read.
 */
export async function PATCH(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.all === true) {
    await markAllNotificationsRead(userId);
    return NextResponse.json({ ok: true });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json({ error: "ids must be a non-empty array, or pass all: true" }, { status: 400 });
  }

  const ids = body.ids.filter((id) => typeof id === "string");
  await markNotificationsRead(userId, ids);

  return NextResponse.json({ ok: true });
}
