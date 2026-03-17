import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { getAccountBalance } from "@/lib/balance";
import { getCurrentOutstanding, getAvailableCredit, getLatestStatement } from "@/lib/credit-card";
import { maskAccountNumber } from "@/lib/format";
import {
  getAccountNumberForMasking,
  processAccountNumberForStorage,
} from "@/lib/account-number";
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

      // needsAttention: show yellow when BOTH (1) no recent activity AND (2) not recently verified.
      // Recent activity (transactions) = user has been using the account; no need to prompt.
      // "Mark as verified" updates lastCheckedAt, which clears the yellow border.
      const hasRecentActivity =
        daysSinceLastTransaction != null &&
        daysSinceLastTransaction < DAYS_INACTIVE_WARNING;
      const recentlyVerified =
        daysSinceLastChecked != null &&
        daysSinceLastChecked < DAYS_LAST_CHECKED_WARNING;
      const needsAttention =
        !hasRecentActivity && !recentlyVerified;

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
        accountNumberMasked: maskAccountNumber(
          getAccountNumberForMasking(acc.accountNumber, acc.accountNumberMode)
        ),
        accountNumberMode: acc.accountNumberMode ?? null,
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
          cardAccountType: acc.cardAccountType ?? null,
          cardNetwork: acc.cardNetwork ?? null,
          linkedAccountId: acc.linkedAccountId ?? null,
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
    cardAccountType?: string | null;
    cardNetwork?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    accountNumberMode?: string | null;
    linkedAccountId?: string | null;
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
    if (body.cardAccountType !== undefined) {
      createData.cardAccountType =
        typeof body.cardAccountType === "string" && body.cardAccountType.trim()
          ? body.cardAccountType.trim()
          : null;
    }
    if (body.cardNetwork !== undefined) {
      createData.cardNetwork =
        typeof body.cardNetwork === "string" && body.cardNetwork.trim()
          ? body.cardNetwork.trim()
          : null;
    }
    if (body.linkedAccountId !== undefined) {
      const linkedId =
        typeof body.linkedAccountId === "string" && body.linkedAccountId.trim()
          ? body.linkedAccountId.trim()
          : null;
      if (linkedId) {
        const linked = await prisma.financialAccount.findFirst({
          where: { id: linkedId, userId, isActive: true },
        });
        if (
          linked &&
          (linked.type === "BANK" || linked.type === "WALLET") &&
          !isAccountIncomplete(linked)
        ) {
          createData.linkedAccountId = linkedId;
        } else {
          createData.linkedAccountId = null;
        }
      } else {
        createData.linkedAccountId = null;
      }
    }
  }
  if (body.bankName !== undefined) {
    createData.bankName = typeof body.bankName === "string" && body.bankName.trim() ? body.bankName.trim() : null;
  }
  if (body.accountNumber !== undefined) {
    const mode = body.accountNumberMode === "FULL" ? "FULL" : "LAST_4_ONLY";
    try {
      const { accountNumber: stored, accountNumberMode: storedMode } =
        processAccountNumberForStorage(body.accountNumber, mode, type);
      if (stored !== null) {
        createData.accountNumber = stored;
        createData.accountNumberMode = storedMode;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("ENCRYPTION_KEY") || msg.includes("encryption")) {
        return NextResponse.json(
          {
            error:
              "Full account number storage requires ENCRYPTION_KEY to be configured on the server. Please contact support or use last-4-digits mode.",
          },
          { status: 400 }
        );
      }
      throw e;
    }
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
    revalidateTag("dashboard-init", "max");
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
      cardAccountType: account.cardAccountType ?? null,
      cardNetwork: account.cardNetwork ?? null,
      bankName: account.bankName ?? null,
      accountNumber: null,
      accountNumberMode: account.accountNumberMode ?? null,
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
