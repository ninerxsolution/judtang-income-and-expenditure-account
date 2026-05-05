import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, type PrismaClient } from "@prisma/client";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountBalance } from "@/lib/balance";
import {
  isFinancialAccountBalanceReconciliationEligible,
} from "@/lib/financial-accounts";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";

type SessionWithId = { user: { id?: string }; sessionId?: string };

type BalanceReconciliationDelegate = PrismaClient["balanceReconciliation"];

/** Runtime PrismaClient can lack this delegate if `npx prisma generate` was not run after the model was added. */
function getBalanceReconciliationDelegate(
  client: PrismaClient,
): BalanceReconciliationDelegate | null {
  const value: unknown = Reflect.get(client, "balanceReconciliation");
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (
    typeof o.create !== "function" ||
    typeof o.findMany !== "function" ||
    typeof o.count !== "function"
  ) {
    return null;
  }
  return value as BalanceReconciliationDelegate;
}

function prismaReconciliationClientStaleResponse(): NextResponse {
  return NextResponse.json(
    {
      errorCode: "RECONCILIATION_PRISMA_CLIENT_STALE",
      error:
        "Prisma Client is out of date (BalanceReconciliation is missing). Run `npx prisma generate` and restart the dev server, then try again.",
    },
    { status: 503 },
  );
}

function isStalePrismaBalanceReconciliationCreateError(e: unknown): boolean {
  if (!(e instanceof TypeError)) {
    return false;
  }
  const m = e.message;
  return (
    m.includes("Cannot read properties of undefined") &&
    (m.includes("reading 'create'") || m.includes('reading "create"'))
  );
}

function isMissingBalanceReconciliationTable(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return true;
  }
  if (e instanceof Error) {
    const m = e.message.toLowerCase();
    return (
      m.includes("balancereconciliation") &&
      (m.includes("doesn't exist") ||
        m.includes("does not exist") ||
        m.includes("unknown table"))
    );
  }
  return false;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toDecimal2(n: number): Prisma.Decimal {
  return new Prisma.Decimal(roundMoney2(n).toFixed(2));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: financialAccountId } = await params;

  const account = await prisma.financialAccount.findFirst({
    where: { id: financialAccountId, userId },
    select: { id: true, type: true, cardAccountType: true },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isFinancialAccountBalanceReconciliationEligible(account)) {
    return NextResponse.json(
      { error: "Balance reconciliation is not available for this account type" },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawOffset = searchParams.get("offset");
  const rawLimit = searchParams.get("limit");
  const offsetParsed = rawOffset != null ? Number.parseInt(rawOffset, 10) : 0;
  const limitParsed = rawLimit != null ? Number.parseInt(rawLimit, 10) : DEFAULT_PAGE_SIZE;
  const offset =
    Number.isFinite(offsetParsed) && offsetParsed >= 0 ? Math.floor(offsetParsed) : 0;
  const take = Number.isFinite(limitParsed)
    ? Math.min(Math.max(1, Math.floor(limitParsed)), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;

  const recoDelegate = getBalanceReconciliationDelegate(prisma);
  if (recoDelegate === null) {
    return prismaReconciliationClientStaleResponse();
  }

  try {
    const [rows, total] = await Promise.all([
      recoDelegate.findMany({
        where: { userId, financialAccountId },
        orderBy: { checkedAt: "desc" },
        skip: offset,
        take,
      }),
      recoDelegate.count({
        where: { userId, financialAccountId },
      }),
    ]);

    return NextResponse.json({
      items: rows.map((r) => ({
        id: r.id,
        checkedAt: r.checkedAt.toISOString(),
        appBalance: Number(r.appBalance),
        statedBalance: Number(r.statedBalance),
        difference: Number(r.difference),
        currency: r.currency,
        note: r.note,
      })),
      total,
      offset,
      limit: take,
    });
  } catch (e) {
    if (!isMissingBalanceReconciliationTable(e)) {
      console.error("[GET /api/financial-accounts/[id]/reconciliation]", e);
    }
    return NextResponse.json({
      items: [],
      total: 0,
      offset,
      limit: take,
    });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: financialAccountId } = await params;

  const account = await prisma.financialAccount.findFirst({
    where: { id: financialAccountId, userId },
    select: {
      id: true,
      type: true,
      cardAccountType: true,
      currency: true,
    },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isFinancialAccountBalanceReconciliationEligible(account)) {
    return NextResponse.json(
      { error: "Balance reconciliation is not available for this account type" },
      { status: 400 },
    );
  }

  let body: { statedBalance?: unknown; note?: unknown };
  try {
    body = (await request.json()) as { statedBalance?: unknown; note?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const statedRaw = body.statedBalance;
  const statedNum =
    typeof statedRaw === "number"
      ? statedRaw
      : typeof statedRaw === "string"
        ? Number.parseFloat(statedRaw.replace(/,/g, ""))
        : Number.NaN;

  if (!Number.isFinite(statedNum)) {
    return NextResponse.json(
      { error: "statedBalance must be a finite number" },
      { status: 400 },
    );
  }

  let note: string | null = null;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== "string") {
      return NextResponse.json({ error: "note must be a string" }, { status: 400 });
    }
    const trimmed = body.note.trim();
    note = trimmed.length > 0 ? trimmed.slice(0, 2000) : null;
  }

  const appBalance = roundMoney2(await getAccountBalance(financialAccountId));
  const statedBalance = roundMoney2(statedNum);
  const difference = roundMoney2(statedBalance - appBalance);
  const currency = account.currency ?? "THB";

  const recoDelegate = getBalanceReconciliationDelegate(prisma);
  if (recoDelegate === null) {
    return prismaReconciliationClientStaleResponse();
  }

  try {
    // Use sequential batch transaction (array form). Interactive `tx` clients can omit
    // newly added models in some Prisma/runtime setups, causing tx.balanceReconciliation to be undefined.
    const [row] = await prisma.$transaction([
      recoDelegate.create({
        data: {
          userId,
          financialAccountId,
          appBalance: toDecimal2(appBalance),
          statedBalance: toDecimal2(statedBalance),
          difference: toDecimal2(difference),
          currency,
          note,
        },
      }),
      prisma.financialAccount.update({
        where: { id: financialAccountId },
        data: { lastCheckedAt: new Date() },
      }),
    ]);

    void createActivityLog({
      userId,
      action: ActivityLogAction.BALANCE_RECONCILIATION_RECORDED,
      entityType: "financialAccount",
      entityId: financialAccountId,
      details: {
        reconciliationId: row.id,
        appBalance,
        statedBalance,
        difference,
        currency,
      },
    });

    revalidateTag("financial-accounts", "max");
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");

    return NextResponse.json({
      id: row.id,
      checkedAt: row.checkedAt.toISOString(),
      appBalance: Number(row.appBalance),
      statedBalance: Number(row.statedBalance),
      difference: Number(row.difference),
      currency: row.currency,
      note: row.note,
    });
  } catch (e) {
    if (isMissingBalanceReconciliationTable(e)) {
      return NextResponse.json(
        {
          errorCode: "RECONCILIATION_TABLE_MISSING",
          error:
            "The BalanceReconciliation table is missing. Run `npm run db:push` (or apply migrations), then try again.",
        },
        { status: 503 },
      );
    }
    if (isStalePrismaBalanceReconciliationCreateError(e)) {
      return prismaReconciliationClientStaleResponse();
    }
    console.error("[POST /api/financial-accounts/[id]/reconciliation]", e);
    return NextResponse.json(
      { error: "Failed to record balance reconciliation" },
      { status: 500 },
    );
  }
}
