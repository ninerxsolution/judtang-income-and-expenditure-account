import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import { Prisma } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const template = await prisma.budgetTemplate.findFirst({
    where: { id, userId },
    include: {
      categoryLimits: {
        include: { category: { select: { id: true, name: true } } },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: template.id,
    name: template.name,
    isActive: template.isActive,
    totalBudget: template.totalBudget != null ? Number(template.totalBudget) : null,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
    categoryLimits: template.categoryLimits.map((cl) => ({
      id: cl.id,
      categoryId: cl.categoryId,
      categoryName: cl.category?.name ?? null,
      limitAmount: Number(cl.limitAmount),
      createdAt: cl.createdAt.toISOString(),
    })),
  });
}

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
  const existing = await prisma.budgetTemplate.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    name?: string;
    isActive?: boolean;
    totalBudget?: number | null;
    categoryLimits?: Array<{ categoryId: string; limitAmount: number }>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: {
    name?: string;
    isActive?: boolean;
    totalBudget?: Prisma.Decimal | null;
    categoryLimits?: { deleteMany: Record<string, never>; create: Array<{ categoryId: string; limitAmount: Prisma.Decimal }> };
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.isActive === "boolean") {
    updates.isActive = body.isActive;
  }
  if (body.totalBudget !== undefined) {
    updates.totalBudget =
      body.totalBudget != null && Number.isFinite(Number(body.totalBudget)) && Number(body.totalBudget) > 0
        ? new Prisma.Decimal(Number(body.totalBudget))
        : null;
  }
  if (Array.isArray(body.categoryLimits)) {
    const valid = body.categoryLimits.filter(
      (cl): cl is { categoryId: string; limitAmount: number } =>
        typeof cl?.categoryId === "string" &&
        cl.categoryId.trim() !== "" &&
        Number.isFinite(Number(cl?.limitAmount)) &&
        Number(cl.limitAmount) > 0,
    );
    updates.categoryLimits = {
      deleteMany: {},
      create: valid.map((cl) => ({
        categoryId: cl.categoryId.trim(),
        limitAmount: new Prisma.Decimal(cl.limitAmount),
      })),
    };
  }

  try {
    const template = await prisma.budgetTemplate.update({
      where: { id },
      data: updates,
      include: {
        categoryLimits: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });
    await createActivityLog({
      userId,
      action: "BUDGET_TEMPLATE_UPDATED",
      entityType: "budget_template",
      entityId: template.id,
      details: { name: template.name },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json({
      id: template.id,
      name: template.name,
      isActive: template.isActive,
      totalBudget: template.totalBudget != null ? Number(template.totalBudget) : null,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
      categoryLimits: template.categoryLimits.map((cl) => ({
        id: cl.id,
        categoryId: cl.categoryId,
        categoryName: cl.category?.name ?? null,
        limitAmount: Number(cl.limitAmount),
        createdAt: cl.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update template";
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
  const existing = await prisma.budgetTemplate.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.budgetTemplate.delete({ where: { id } });
    await createActivityLog({
      userId,
      action: "BUDGET_TEMPLATE_DELETED",
      entityType: "budget_template",
      entityId: id,
      details: { name: existing.name },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete template" },
      { status: 500 },
    );
  }
}
