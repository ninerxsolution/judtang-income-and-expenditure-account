import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountBalance } from "@/lib/balance";
import { getCurrentOutstanding, getAvailableCredit, getLatestStatement } from "@/lib/credit-card";
import type { AccountType } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const account = await prisma.financialAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const balance = await getAccountBalance(account.id);

  const lastTx = await prisma.transaction.findFirst({
    where: { financialAccountId: account.id },
    orderBy: { occurredAt: "desc" },
    select: { occurredAt: true },
  });

  const base = {
    id: account.id,
    name: account.name,
    type: account.type,
    initialBalance: Number(account.initialBalance),
    isActive: account.isActive,
    isDefault: account.isDefault,
    lastCheckedAt: account.lastCheckedAt?.toISOString() ?? null,
    createdAt: account.createdAt.toISOString(),
    balance,
    lastTransactionDate: lastTx?.occurredAt?.toISOString() ?? null,
    bankName: account.bankName ?? null,
    accountNumber: account.accountNumber ?? null,
  };

  if (account.type === "CREDIT_CARD") {
    const [currentOutstanding, availableCredit, latestStatement] = await Promise.all([
      getCurrentOutstanding(account.id),
      getAvailableCredit(account.id),
      getLatestStatement(account.id),
    ]);
    return NextResponse.json({
      ...base,
      creditLimit: account.creditLimit != null ? Number(account.creditLimit) : null,
      statementClosingDay: account.statementClosingDay,
      dueDay: account.dueDay,
      interestRate: account.interestRate != null ? Number(account.interestRate) : null,
      cardType: account.cardType ?? null,
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
    });
  }

  return NextResponse.json(base);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const account = await prisma.financialAccount.findFirst({
    where: { id, userId },
  });

  if (!account) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    name?: string;
    type?: string;
    initialBalance?: number;
    lastCheckedAt?: string;
    isDefault?: boolean;
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

  const validTypes: AccountType[] = ["BANK", "CREDIT_CARD", "WALLET", "CASH", "OTHER"];
  const data: {
    name?: string;
    type?: AccountType;
    initialBalance?: number;
    lastCheckedAt?: Date;
    isDefault?: boolean;
    creditLimit?: number;
    statementClosingDay?: number;
    dueDay?: number;
    interestRate?: number | null;
    cardType?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }
  if (validTypes.includes(body.type as AccountType)) {
    data.type = body.type as AccountType;
  }
  if (typeof body.initialBalance === "number" && Number.isFinite(body.initialBalance)) {
    data.initialBalance = body.initialBalance;
  }
  if (body.lastCheckedAt) {
    const d = new Date(body.lastCheckedAt);
    if (!Number.isNaN(d.getTime())) {
      data.lastCheckedAt = d;
    }
  }
  if (typeof body.isDefault === "boolean") {
    data.isDefault = body.isDefault;
    if (body.isDefault) {
      await prisma.financialAccount.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }
  }
  if (account.type === "CREDIT_CARD") {
    if (typeof body.creditLimit === "number" && Number.isFinite(body.creditLimit) && body.creditLimit >= 0) {
      data.creditLimit = body.creditLimit;
    }
    if (typeof body.statementClosingDay === "number" && body.statementClosingDay >= 1 && body.statementClosingDay <= 31) {
      data.statementClosingDay = body.statementClosingDay;
    }
    if (typeof body.dueDay === "number" && body.dueDay >= 1 && body.dueDay <= 31) {
      data.dueDay = body.dueDay;
    }
    if (body.interestRate !== undefined) {
      data.interestRate =
        typeof body.interestRate === "number" &&
        Number.isFinite(body.interestRate) &&
        body.interestRate >= 0
          ? body.interestRate
          : null;
    }
    if (body.cardType !== undefined) {
      data.cardType =
        typeof body.cardType === "string" && body.cardType.trim()
          ? body.cardType.trim()
          : null;
    }
  }
  if (body.bankName !== undefined) {
    data.bankName = typeof body.bankName === "string" && body.bankName.trim() ? body.bankName.trim() : null;
  }
  if (body.accountNumber !== undefined) {
    const digits = typeof body.accountNumber === "string" ? body.accountNumber.replace(/\D/g, "") : "";
    data.accountNumber = digits ? digits : null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(account);
  }

  try {
    const updated = await prisma.financialAccount.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      initialBalance: Number(updated.initialBalance),
      isActive: updated.isActive,
      isDefault: updated.isDefault,
      creditLimit: updated.creditLimit != null ? Number(updated.creditLimit) : null,
      statementClosingDay: updated.statementClosingDay,
      dueDay: updated.dueDay,
      interestRate: updated.interestRate != null ? Number(updated.interestRate) : null,
      cardType: updated.cardType ?? null,
      bankName: updated.bankName ?? null,
      accountNumber: updated.accountNumber ?? null,
      lastCheckedAt: updated.lastCheckedAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to update financial account" },
      { status: 500 }
    );
  }
}
