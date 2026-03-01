import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getTransactionsSummary } from "@/lib/transactions";

type SessionWithId = { user: { id?: string }; sessionId?: string };

function startOfMonth(year: number, month: number): Date {
  const d = new Date(year, month, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfMonth(year: number, month: number): Date {
  const d = new Date(year, month + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const allParam = searchParams.get("all");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;

  const options: {
    from?: Date;
    to?: Date;
    financialAccountId?: string;
  } = {
    financialAccountId: financialAccountIdParam,
  };

  const isAllTime = allParam === "1" || allParam === "true";

  if (isAllTime) {
    // All-time: no date filter (options.from and options.to stay undefined)
  } else if (fromParam && toParam) {
    const fromDate = new Date(fromParam);
    const toDate = new Date(toParam);
    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      options.from = fromDate;
      options.to = toDate;
    }
  }

  if (!isAllTime && (options.from == null || options.to == null)) {
    const now = new Date();
    options.from = startOfMonth(now.getFullYear(), now.getMonth());
    options.to = endOfMonth(now.getFullYear(), now.getMonth());
  }

  try {
    const summary = await getTransactionsSummary(userId, options);
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json(
      { error: "Failed to load summary" },
      { status: 500 },
    );
  }
}
