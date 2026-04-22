import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getTransactionsSummary } from "@/lib/transactions";
import { getTotalBalanceMeta } from "@/lib/balance";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey } from "@/lib/cache";

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

async function fetchSummary(
  userId: string,
  isAllTime: boolean,
  fromParam: string | null,
  toParam: string | null,
  financialAccountId: string | undefined,
) {
  const options: {
    from?: Date;
    to?: Date;
    financialAccountId?: string;
  } = { financialAccountId };

  if (!isAllTime && fromParam && toParam) {
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

  const [summary, balanceMeta] = await Promise.all([
    getTransactionsSummary(userId, options),
    getTotalBalanceMeta(userId),
  ]);
  return {
    ...summary,
    totalBalance: balanceMeta.thb,
    totalBalanceApproximate: balanceMeta.approximate,
  };
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

  const isAllTime = allParam === "1" || allParam === "true";

  try {
    const getCached = unstable_cache(
      (uid: string, all: boolean, from: string | null, to: string | null, accId: string | undefined) =>
        fetchSummary(uid, all, from, to, accId),
      cacheKey("transactions-summary", userId, isAllTime ? "1" : "0", fromParam ?? "", toParam ?? "", financialAccountIdParam ?? ""),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] },
    );
    const data = await getCached(userId, isAllTime, fromParam, toParam, financialAccountIdParam);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load summary" },
      { status: 500 },
    );
  }
}
