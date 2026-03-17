import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getNetWorthTrend } from "@/lib/balance";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;
  const yearNumber = yearParam ? Number.parseInt(yearParam, 10) : NaN;

  if (!Number.isFinite(yearNumber)) {
    return NextResponse.json(
      { error: "year query parameter is required (YYYY)" },
      { status: 400 },
    );
  }

  try {
    const result = await getNetWorthTrend(userId, {
      year: yearNumber,
      timezone: timezoneParam,
      financialAccountId: financialAccountIdParam,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load net worth trend" },
      { status: 500 },
    );
  }
}
