/**
 * GET: Batch API for dashboard initial load.
 * Returns user, summary, appInfo, and recentTransactions in a single response.
 * Reduces HTTP round-trips on dashboard load.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTransactionsSummary, listTransactionsByUser } from "@/lib/transactions";
import { getTotalBalance } from "@/lib/balance";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

async function fetchDashboardInit(userId: string) {
  const [user, summaryResult, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    (async () => {
      const [summary, totalBalance] = await Promise.all([
        getTransactionsSummary(userId, {}),
        getTotalBalance(userId),
      ]);
      return { ...summary, totalBalance };
    })(),
    listTransactionsByUser(userId, { limit: 8, offset: 0 }),
  ]);

  const appName = process.env.APP_NAME ?? "Judtang";
  const appVersion = process.env.APP_VERSION ?? "0.1.0";
  const patchVersion = process.env.PATCH_VERSION ?? "";
  const appInfo = {
    appName,
    appVersion,
    patchVersion,
    fullVersion: patchVersion ? `${appVersion} (${patchVersion})` : appVersion,
  };

  type TxItem = (typeof transactions)[number];
  const recentTransactions = transactions.map((tx: TxItem) => {
    const t = tx as TxItem & {
      financialAccount?: { id: string; name: string } | null;
      transferAccount?: { id: string; name: string } | null;
      categoryRef?: { id: string; name: string } | null;
    };
    return {
      id: t.id,
      type: t.type,
      amount:
        typeof t.amount === "object" && t.amount != null && "toNumber" in t.amount
          ? (t.amount as { toNumber: () => number }).toNumber()
          : Number(t.amount),
      financialAccount: t.financialAccount ?? null,
      categoryRef: t.categoryRef ?? null,
      category: t.category,
      note: t.note,
      occurredAt: t.occurredAt.toISOString(),
    };
  });

  return {
    user: user
      ? {
          name: user.name ?? null,
          email: user.email ?? null,
          image: user.image ?? null,
        }
      : null,
    summary: summaryResult,
    appInfo,
    recentTransactions,
  };
}

export async function GET() {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const getCached = unstable_cache(
      (uid: string) => fetchDashboardInit(uid),
      cacheKey("dashboard-init", userId),
      {
        revalidate: CACHE_REVALIDATE_SECONDS,
        tags: ["dashboard-init", "transactions", "users-me"],
      },
    );
    const data = await getCached(userId);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
