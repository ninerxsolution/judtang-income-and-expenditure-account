/**
 * GET: current user profile (id, name, email, image, lastActiveAt, hasPassword).
 * PATCH: update display name (body: { name: string }).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      lastActiveAt: true,
      password: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    image: user.image ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    hasPassword: !!user.password,
  });
}

export async function PATCH(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name } = body;
  if (name !== undefined) {
    const trimmed = typeof name === "string" ? name.trim() : "";
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    const oldName = existing?.name ?? null;
    await prisma.user.update({
      where: { id: userId },
      data: { name: trimmed || null },
    });
    const newName = trimmed || null;
    if (oldName !== newName) {
      void createActivityLog({
        userId,
        action: ActivityLogAction.USER_PROFILE_UPDATED,
        entityType: "user",
        entityId: userId,
        details: {
          changes: [{ field: "name", from: oldName ?? "", to: newName ?? "" }],
        },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
