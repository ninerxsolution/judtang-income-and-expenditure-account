import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getBudgetCoverageForYear } from "@/lib/budget";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year =
    yearParam != null ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (!Number.isFinite(year)) {
    return NextResponse.json(
      { error: "Valid year is required" },
      { status: 400 },
    );
  }

  try {
    const data = await getBudgetCoverageForYear(userId, year);
    return NextResponse.json({
      year: data.year,
      configuredMonthCount: data.configuredMonthCount,
      months: data.months.map((month) => ({
        ...month,
        updatedAt: month.updatedAt?.toISOString() ?? null,
      })),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load budget coverage" },
      { status: 500 },
    );
  }
}
