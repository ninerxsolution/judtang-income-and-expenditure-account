/**
 * GET: current user profile (id, name, email, image, lastActiveAt, hasPassword).
 * PATCH: update display name (body: { name: string }).
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey, revalidateTag } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

async function fetchUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      lastActiveAt: true,
      password: true,
      accounts: { select: { provider: true } },
    },
  });

  if (!user) return null;

  type AccountItem = (typeof user.accounts)[number];
  const linkedAccounts = user.accounts.map((a: AccountItem) => a.provider);

  return {
    id: user.id,
    name: user.name ?? null,
    email: user.email ?? null,
    emailVerified: !!user.emailVerified,
    emailVerifiedAt: user.emailVerified?.toISOString() ?? null,
    image: user.image ?? null,
    lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
    hasPassword: !!user.password,
    linkedAccounts,
  };
}

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const getCached = unstable_cache(
      (uid: string) => fetchUserProfile(uid),
      cacheKey("users-me", userId),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["users-me"] },
    );
    const data = await getCached(userId);
    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
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
    revalidateTag("users-me", "max");
    revalidateTag("dashboard-init", "max");
  }

  return NextResponse.json({ ok: true });
}
