import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import { Prisma } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { budgetMonthId?: string; categoryId?: string | null; limitAmount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const budgetMonthId = typeof body.budgetMonthId === "string" ? body.budgetMonthId.trim() : "";
  const categoryId =
    body.categoryId != null && String(body.categoryId).trim() !== ""
      ? String(body.categoryId).trim()
      : null;
  const limitAmount =
    body.limitAmount != null && Number.isFinite(Number(body.limitAmount)) && Number(body.limitAmount) > 0
      ? Number(body.limitAmount)
      : NaN;

  if (!budgetMonthId) {
    return NextResponse.json(
      { error: "budgetMonthId is required" },
      { status: 400 },
    );
  }
  if (!Number.isFinite(limitAmount)) {
    return NextResponse.json(
      { error: "limitAmount must be a positive number" },
      { status: 400 },
    );
  }

  const budgetMonth = await prisma.budgetMonth.findFirst({
    where: { id: budgetMonthId, userId },
  });
  if (!budgetMonth) {
    return NextResponse.json({ error: "Budget month not found" }, { status: 404 });
  }

  try {
    const existing = await prisma.budgetCategory.findFirst({
      where: { budgetMonthId, categoryId },
      include: { category: { select: { id: true, name: true } } },
    });
    const isCreate = !existing;
    const row = existing
      ? await prisma.budgetCategory.update({
          where: { id: existing.id },
          data: { limitAmount: new Prisma.Decimal(limitAmount) },
          include: { category: { select: { id: true, name: true } } },
        })
      : await prisma.budgetCategory.create({
          data: {
            budgetMonthId,
            categoryId,
            limitAmount: new Prisma.Decimal(limitAmount),
          },
          include: { category: { select: { id: true, name: true } } },
        });
    await createActivityLog({
      userId,
      action: isCreate ? "BUDGET_CATEGORY_CREATED" : "BUDGET_CATEGORY_UPDATED",
      entityType: "budget_category",
      entityId: row.id,
      details: { budgetMonthId, categoryId, limitAmount },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json({
      id: row.id,
      budgetMonthId: row.budgetMonthId,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      limitAmount: Number(row.limitAmount),
      createdAt: row.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to save category budget";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
