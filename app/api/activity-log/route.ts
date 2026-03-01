import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType") ?? undefined;
  const action = searchParams.get("action") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = Math.min(
    limitParam ? parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
    MAX_LIMIT
  );

  const where: { userId: string; entityType?: string; action?: string; createdAt?: object } = {
    userId,
  };
  if (entityType) where.entityType = entityType;
  if (action) where.action = action;

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) {
        (where.createdAt as { gte?: Date }).gte = from;
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!Number.isNaN(to.getTime())) {
        (where.createdAt as { lte?: Date }).lte = to;
      }
    }
    if (Object.keys(where.createdAt).length === 0) delete where.createdAt;
  }

  const logs = await prisma.activityLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      action: true,
      entityType: true,
      entityId: true,
      details: true,
      createdAt: true,
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const data = logs.map((log) => {
    const user = log.user;
    const userDisplayName =
      user == null
        ? "System"
        : (user.name?.trim() || user.email?.trim() || "Unknown");
    return {
      id: log.id,
      userId: log.userId,
      userDisplayName,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      details: log.details,
      createdAt: log.createdAt.toISOString(),
    };
  });

  return NextResponse.json(data);
}
