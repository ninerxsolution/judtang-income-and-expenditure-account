import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDateRangeInTimezone } from "@/lib/date-range";
import { getSummaryByCategory } from "@/lib/transactions";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;

  const fromRange = fromParam ? getDateRangeInTimezone(fromParam, timezoneParam) : null;
  const toRange = toParam ? getDateRangeInTimezone(toParam, timezoneParam) : null;

  if (!fromRange || !toRange) {
    return NextResponse.json(
      { error: "from and to query parameters are required (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  try {
    const result = await getSummaryByCategory(userId, {
      from: fromRange.from,
      to: toRange.to,
      financialAccountId: financialAccountIdParam,
    });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load summary by category" },
      { status: 500 },
    );
  }
}
