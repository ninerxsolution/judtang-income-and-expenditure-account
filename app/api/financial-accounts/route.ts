import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { getAccountBalance } from "@/lib/balance";
import { getCurrentOutstanding, getAvailableCredit, getLatestStatement } from "@/lib/credit-card";
import { maskAccountNumber } from "@/lib/format";
import { isAccountIncomplete } from "@/lib/financial-accounts";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey, revalidateTag } from "@/lib/cache";
import type { AccountType } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const DAYS_INACTIVE_WARNING = 7;
const DAYS_LAST_CHECKED_WARNING = 30;

async function fetchFinancialAccountsList(
  userId: string,
  includeInactive: boolean,
): Promise<unknown[]> {
  const isActiveFilter = includeInactive ? false : true;
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: isActiveFilter },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  const result = await Promise.all(
    accounts.map(async (acc) => {
      const [balance, txCount, lastTx] = await Promise.all([
        getAccountBalance(acc.id),
        prisma.transaction.count({ where: { financialAccountId: acc.id } }),
        prisma.transaction.findFirst({
          where: { financialAccountId: acc.id },
          orderBy: { occurredAt: "desc" },
          select: { occurredAt: true },
        }),
      ]);
      const lastTransactionDate = lastTx?.occurredAt ?? null;

      const now = new Date();
      const daysSinceLastTransaction = lastTransactionDate
        ? Math.floor(
            (now.getTime() - lastTransactionDate.getTime()) / (24 * 60 * 60 * 1000)
          )
        : null;
      const daysSinceLastChecked = acc.lastCheckedAt
        ? Math.floor(
            (now.getTime() - acc.lastCheckedAt.getTime()) / (24 * 60 * 60 * 1000)
          )
        : null;

      const recentlyChecked =
        acc.lastCheckedAt != null &&
        (daysSinceLastChecked ?? 999) < DAYS_INACTIVE_WARNING;
      const needsAttention =
        (daysSinceLastTransaction != null &&
          daysSinceLastTransaction >= DAYS_INACTIVE_WARNING &&
          !recentlyChecked) ||
        (daysSinceLastChecked != null &&
          daysSinceLastChecked >= DAYS_LAST_CHECKED_WARNING);

      const isIncomplete = isAccountIncomplete(acc);

      const base = {
        id: acc.id,
        name: acc.name,
        type: acc.type,
        initialBalance: Number(acc.initialBalance),
        isActive: acc.isActive,
        isDefault: acc.isDefault,
        isHidden: acc.isHidden,
        lastCheckedAt: acc.lastCheckedAt?.toISOString() ?? null,
        createdAt: acc.createdAt.toISOString(),
        balance,
        lastTransactionDate: lastTransactionDate?.toISOString() ?? null,
        daysSinceLastTransaction,
        daysSinceLastChecked,
        needsAttention,
        isIncomplete,
        transactionCount: txCount,
        bankName: acc.bankName ?? null,
        accountNumberMasked: maskAccountNumber(acc.accountNumber),
      };

      if (acc.type === "CREDIT_CARD") {
        const [currentOutstanding, availableCredit, latestStatement] = await Promise.all([
          getCurrentOutstanding(acc.id),
          getAvailableCredit(acc.id),
          getLatestStatement(acc.id),
        ]);
        return {
          ...base,
          creditLimit: acc.creditLimit != null ? Number(acc.creditLimit) : null,
          statementClosingDay: acc.statementClosingDay,
          dueDay: acc.dueDay,
          interestRate: acc.interestRate != null ? Number(acc.interestRate) : null,
          cardType: acc.cardType ?? null,
          currentOutstanding,
          availableCredit,
          latestStatement: latestStatement
            ? {
                id: latestStatement.id,
                closingDate: latestStatement.closingDate.toISOString().slice(0, 10),
                dueDate: latestStatement.dueDate.toISOString().slice(0, 10),
                statementBalance: Number(latestStatement.statementBalance),
                paidAmount: Number(latestStatement.paidAmount),
                isPaid: latestStatement.isPaid,
              }
            : null,
        };
      }

      return base;
    })
  );

  return result;
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const includeInactive = searchParams.get("inactive") === "true";

  try {
    if (!includeInactive) {
      await ensureUserHasDefaultFinancialAccount(userId);
    }

    const getCached = unstable_cache(
      (uid: string, inactive: boolean) => fetchFinancialAccountsList(uid, inactive),
      cacheKey("financial-accounts", userId, includeInactive ? "1" : "0"),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["financial-accounts"] },
    );
    const result = await getCached(userId, includeInactive);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Failed to load financial accounts" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?: string;
    type?: string;
    initialBalance?: number;
    creditLimit?: number;
    statementClosingDay?: number;
    dueDay?: number;
    interestRate?: number | null;
    cardType?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const validTypes: AccountType[] = ["BANK", "CREDIT_CARD", "WALLET", "CASH", "OTHER"];
  const type = validTypes.includes(body.type as AccountType)
    ? (body.type as AccountType)
    : "CASH";

  const initialBalance = Number(body.initialBalance);
  const initialBalanceNum = Number.isFinite(initialBalance) ? initialBalance : 0;

  const createData: Parameters<typeof prisma.financialAccount.create>[0]["data"] = {
    userId,
    name,
    type,
    initialBalance: initialBalanceNum,
    isActive: true,
    isDefault: false,
  };

  if (type === "CREDIT_CARD") {
    if (typeof body.creditLimit === "number" && Number.isFinite(body.creditLimit) && body.creditLimit >= 0) {
      createData.creditLimit = body.creditLimit;
    }
    if (typeof body.statementClosingDay === "number" && body.statementClosingDay >= 1 && body.statementClosingDay <= 31) {
      createData.statementClosingDay = body.statementClosingDay;
    }
    if (typeof body.dueDay === "number" && body.dueDay >= 1 && body.dueDay <= 31) {
      createData.dueDay = body.dueDay;
    }
    if (body.interestRate !== undefined) {
      createData.interestRate =
        typeof body.interestRate === "number" &&
        Number.isFinite(body.interestRate) &&
        body.interestRate >= 0
          ? body.interestRate
          : null;
    }
    if (body.cardType !== undefined) {
      createData.cardType =
        typeof body.cardType === "string" && body.cardType.trim()
          ? body.cardType.trim()
          : null;
    }
  }
  if (body.bankName !== undefined) {
    createData.bankName = typeof body.bankName === "string" && body.bankName.trim() ? body.bankName.trim() : null;
  }
  if (body.accountNumber !== undefined) {
    const digits = typeof body.accountNumber === "string" ? body.accountNumber.replace(/\D/g, "") : "";
    createData.accountNumber = digits ? digits : null;
  }

  try {
    const account = await prisma.financialAccount.create({
      data: createData,
    });

    void createActivityLog({
      userId,
      action: ActivityLogAction.FINANCIAL_ACCOUNT_CREATED,
      entityType: "financialAccount",
      entityId: account.id,
      details: {
        name: account.name,
        type: account.type,
        initialBalance: Number(account.initialBalance),
      },
    });

    revalidateTag("financial-accounts", "max");
    revalidateTag("transactions", "max");
    return NextResponse.json({
      id: account.id,
      name: account.name,
      type: account.type,
      initialBalance: Number(account.initialBalance),
      isActive: account.isActive,
      isDefault: account.isDefault,
      creditLimit: account.creditLimit != null ? Number(account.creditLimit) : null,
      statementClosingDay: account.statementClosingDay,
      dueDay: account.dueDay,
      interestRate: account.interestRate != null ? Number(account.interestRate) : null,
      cardType: account.cardType ?? null,
      bankName: account.bankName ?? null,
      accountNumber: account.accountNumber ?? null,
      lastCheckedAt: account.lastCheckedAt?.toISOString() ?? null,
      createdAt: account.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create financial account" },
      { status: 500 }
    );
  }
}
