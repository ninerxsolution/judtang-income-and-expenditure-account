import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import { Prisma } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function PATCH(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { year?: number; month?: number; totalBudget?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year != null ? parseInt(String(body.year), 10) : NaN;
  const month = body.month != null ? parseInt(String(body.month), 10) : NaN;
  const totalBudget =
    body.totalBudget != null && Number.isFinite(Number(body.totalBudget)) && Number(body.totalBudget) >= 0
      ? new Prisma.Decimal(Number(body.totalBudget))
      : null;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Valid year and month (1-12) are required" },
      { status: 400 },
    );
  }

  try {
    const budgetMonth = await prisma.budgetMonth.upsert({
      where: { userId_year_month: { userId, year, month } },
      create: {
        userId,
        year,
        month,
        totalBudget,
      },
      update: { totalBudget },
    });
    await createActivityLog({
      userId,
      action: "BUDGET_MONTH_UPDATED",
      entityType: "budget_month",
      entityId: budgetMonth.id,
      details: { year, month, totalBudget: totalBudget != null ? Number(totalBudget) : null },
    });
    revalidateTag("budgets", "max");
    return NextResponse.json({
      id: budgetMonth.id,
      year: budgetMonth.year,
      month: budgetMonth.month,
      totalBudget: budgetMonth.totalBudget != null ? Number(budgetMonth.totalBudget) : null,
      createdAt: budgetMonth.createdAt.toISOString(),
      updatedAt: budgetMonth.updatedAt.toISOString(),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update month budget";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
