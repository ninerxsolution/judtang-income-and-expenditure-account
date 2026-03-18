import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

type SessionWithId = {
  user: { id?: string; role?: string };
  sessionId?: string;
};

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const role = session?.user?.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const roleFilter = searchParams.get("role");
  const statusFilter = searchParams.get("status");
  const search = searchParams.get("search")?.trim();

  const where: Prisma.UserWhereInput = {};

  if (roleFilter && ["USER", "ADMIN"].includes(roleFilter)) {
    where.role = roleFilter as "USER" | "ADMIN";
  }
  if (statusFilter && ["ACTIVE", "SUSPENDED", "DELETED"].includes(statusFilter)) {
    where.status = statusFilter as "ACTIVE" | "SUSPENDED" | "DELETED";
  }
  if (search && search.length > 0) {
    where.OR = [
      { email: { contains: search } },
      { name: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        emailVerified: true,
        lastActiveAt: true,
        _count: {
          select: {
            transactions: true,
            financialAccounts: true,
          },
        },
      },
      orderBy: { lastActiveAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified?.toISOString() ?? null,
      lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
      createdAt: u.lastActiveAt?.toISOString() ?? "",
      transactionCount: u._count.transactions,
      accountCount: u._count.financialAccounts,
    })),
    total,
    page,
    limit,
  });
}
