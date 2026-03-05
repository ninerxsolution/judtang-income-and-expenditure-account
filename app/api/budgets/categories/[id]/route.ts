import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import { Prisma } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.budgetCategory.findUnique({
    where: { id },
    include: { budgetMonth: true },
  });
  if (!row || row.budgetMonth.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { limitAmount?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const limitAmount =
    body.limitAmount != null && Number.isFinite(Number(body.limitAmount)) && Number(body.limitAmount) > 0
      ? Number(body.limitAmount)
      : NaN;
  if (!Number.isFinite(limitAmount)) {
    return NextResponse.json(
      { error: "limitAmount must be a positive number" },
      { status: 400 },
    );
  }

  try {
    const updated = await prisma.budgetCategory.update({
      where: { id },
      data: { limitAmount: new Prisma.Decimal(limitAmount) },
      include: { category: { select: { id: true, name: true } } },
    });
    await createActivityLog({
      userId,
      action: "BUDGET_CATEGORY_UPDATED",
      entityType: "budget_category",
      entityId: updated.id,
      details: { limitAmount },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json({
      id: updated.id,
      budgetMonthId: updated.budgetMonthId,
      categoryId: updated.categoryId,
      categoryName: updated.category?.name ?? null,
      limitAmount: Number(updated.limitAmount),
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update category budget";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const row = await prisma.budgetCategory.findUnique({
    where: { id },
    include: { budgetMonth: true },
  });
  if (!row || row.budgetMonth.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.budgetCategory.delete({ where: { id } });
    await createActivityLog({
      userId,
      action: "BUDGET_CATEGORY_DELETED",
      entityType: "budget_category",
      entityId: id,
      details: { budgetMonthId: row.budgetMonthId, categoryId: row.categoryId },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete category budget" },
      { status: 500 },
    );
  }
}
