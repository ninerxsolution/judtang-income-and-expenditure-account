import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import { Prisma } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const templates = await prisma.budgetTemplate.findMany({
      where: { userId },
      include: {
        categoryLimits: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(
      templates.map((t) => ({
        id: t.id,
        name: t.name,
        isActive: t.isActive,
        totalBudget: t.totalBudget != null ? Number(t.totalBudget) : null,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        categoryLimits: t.categoryLimits.map((cl) => ({
          id: cl.id,
          categoryId: cl.categoryId,
          categoryName: cl.category?.name ?? null,
          limitAmount: Number(cl.limitAmount),
          createdAt: cl.createdAt.toISOString(),
        })),
      })),
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to load budget templates" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 },
    );
  }

  const isActive = body.isActive !== false;
  const totalBudget =
    body.totalBudget != null && Number.isFinite(Number(body.totalBudget)) && Number(body.totalBudget) > 0
      ? new Prisma.Decimal(Number(body.totalBudget))
      : null;
  const categoryLimits = Array.isArray(body.categoryLimits)
    ? body.categoryLimits.filter(
        (cl): cl is { categoryId: string; limitAmount: number } =>
          typeof cl?.categoryId === "string" &&
          cl.categoryId.trim() !== "" &&
          Number.isFinite(Number(cl?.limitAmount)) &&
          Number(cl.limitAmount) > 0,
      )
    : [];

  try {
    const template = await prisma.budgetTemplate.create({
      data: {
        userId,
        name,
        isActive,
        totalBudget,
        categoryLimits:
          categoryLimits.length > 0
            ? {
                create: categoryLimits.map((cl) => ({
                  categoryId: cl.categoryId.trim(),
                  limitAmount: new Prisma.Decimal(cl.limitAmount),
                })),
              }
            : undefined,
      },
      include: {
        categoryLimits: {
          include: { category: { select: { id: true, name: true } } },
        },
      },
    });
    await createActivityLog({
      userId,
      action: "BUDGET_TEMPLATE_CREATED",
      entityType: "budget_template",
      entityId: template.id,
      details: { name, categoryCount: template.categoryLimits.length },
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
    const msg = e instanceof Error ? e.message : "Failed to create template";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
