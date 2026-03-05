import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getBudgetForMonth } from "@/lib/budget";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");

  const year = yearParam != null ? parseInt(yearParam, 10) : new Date().getFullYear();
  const month = monthParam != null ? parseInt(monthParam, 10) : new Date().getMonth() + 1;

  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Valid year and month (1-12) are required" },
      { status: 400 },
    );
  }

  try {
    const data = await getBudgetForMonth(userId, year, month);
    return NextResponse.json({
      budgetMonth: data.budgetMonth
        ? {
            ...data.budgetMonth,
            createdAt: data.budgetMonth.createdAt.toISOString(),
            updatedAt: data.budgetMonth.updatedAt.toISOString(),
          }
        : null,
      totalSpent: data.totalSpent,
      totalBudget: data.totalBudget,
      totalProgress: data.totalProgress,
      totalIndicator: data.totalIndicator,
      categoryBudgets: data.categoryBudgets,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load budget" },
      { status: 500 },
    );
  }
}
