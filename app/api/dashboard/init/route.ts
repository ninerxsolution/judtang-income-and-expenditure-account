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

type SessionWithId = { user: { id?: string }; sessionId?: string };

const DASHBOARD_TIMEZONE = "Asia/Bangkok";

function getCurrentMonthRange(timezone: string): { from: Date; to: Date } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === "year")?.value ?? "0", 10);
  const month = parseInt(parts.find((p) => p.type === "month")?.value ?? "0", 10);

  // Get timezone offset at noon of the 1st to avoid DST edge cases
  const refDate = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0, 0));
  const refFmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    second: "numeric",
  });
  const rp = refFmt.formatToParts(refDate);
  const tzH = parseInt(rp.find((p) => p.type === "hour")?.value ?? "0", 10);
  const tzM = parseInt(rp.find((p) => p.type === "minute")?.value ?? "0", 10);
  const tzS = parseInt(rp.find((p) => p.type === "second")?.value ?? "0", 10);
  const offsetMs =
    (tzH * 3600 + tzM * 60 + tzS) * 1000 -
    (refDate.getUTCHours() * 3600 + refDate.getUTCMinutes() * 60 + refDate.getUTCSeconds()) * 1000;

  const daysInMonth = new Date(year, month, 0).getDate();
  const fromMs = Date.UTC(year, month - 1, 1, 0, 0, 0, 0) - offsetMs;
  const toMs = Date.UTC(year, month - 1, daysInMonth, 0, 0, 0, 0) - offsetMs + 24 * 3600000 - 1;

  return { from: new Date(fromMs), to: new Date(toMs) };
}

async function fetchDashboardInit(userId: string) {
  const monthRange = getCurrentMonthRange(DASHBOARD_TIMEZONE);

  const [user, summaryResult, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    (async () => {
      const [summary, totalBalance] = await Promise.all([
        getTransactionsSummary(userId, { from: monthRange.from, to: monthRange.to }),
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
    const data = await fetchDashboardInit(userId);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 },
    );
  }
}
