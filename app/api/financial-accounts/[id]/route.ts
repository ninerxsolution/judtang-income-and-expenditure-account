import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getAccountBalance } from "@/lib/balance";
import { getCurrentOutstanding, getAvailableCredit, getLatestStatement } from "@/lib/credit-card";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import {
  getAccountNumberForMasking,
  getFullAccountNumber,
  processAccountNumberForStorage,
} from "@/lib/account-number";
import { isAccountIncomplete } from "@/lib/financial-accounts";
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

  const [lastTx, transactionCount] = await Promise.all([
    prisma.transaction.findFirst({
      where: {
        OR: [
          { financialAccountId: account.id },
          { transferAccountId: account.id },
        ],
      },
      orderBy: { occurredAt: "desc" },
      select: { occurredAt: true },
    }),
    prisma.transaction.count({
      where: {
        OR: [
          { financialAccountId: account.id },
          { transferAccountId: account.id },
        ],
      },
    }),
  ]);

  const accountNumberForForm =
    getFullAccountNumber(account.accountNumber, account.accountNumberMode) ??
    account.accountNumber ??
    null;

  const isIncomplete = isAccountIncomplete(account);

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
    accountNumber: accountNumberForForm,
    accountNumberMode: account.accountNumberMode ?? null,
    isIncomplete,
    transactionCount,
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
      cardAccountType: account.cardAccountType ?? null,
      cardNetwork: account.cardNetwork ?? null,
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
    isHidden?: boolean;
    creditLimit?: number;
    statementClosingDay?: number;
    dueDay?: number;
    interestRate?: number | null;
    cardAccountType?: string | null;
    cardNetwork?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    accountNumberMode?: string | null;
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
    isHidden?: boolean;
    creditLimit?: number;
    statementClosingDay?: number;
    dueDay?: number;
    interestRate?: number | null;
    cardAccountType?: string | null;
    cardNetwork?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    accountNumberMode?: string | null;
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
  if (typeof body.isHidden === "boolean") {
    data.isHidden = body.isHidden;
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
    if (body.cardAccountType !== undefined) {
      data.cardAccountType =
        typeof body.cardAccountType === "string" && body.cardAccountType.trim()
          ? body.cardAccountType.trim()
          : null;
    }
    if (body.cardNetwork !== undefined) {
      data.cardNetwork =
        typeof body.cardNetwork === "string" && body.cardNetwork.trim()
          ? body.cardNetwork.trim()
          : null;
    }
  }
  if (body.bankName !== undefined) {
    data.bankName = typeof body.bankName === "string" && body.bankName.trim() ? body.bankName.trim() : null;
  }
  if (body.accountNumber !== undefined) {
    const mode = body.accountNumberMode === "FULL" ? "FULL" : "LAST_4_ONLY";
    const { accountNumber: stored, accountNumberMode: storedMode } =
      processAccountNumberForStorage(body.accountNumber, mode, account.type);
    data.accountNumber = stored;
    data.accountNumberMode = storedMode;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(account);
  }

  try {
    const updated = await prisma.financialAccount.update({
      where: { id },
      data,
    });

    const changes: { field: string; from: string; to: string }[] = [];
    if (data.name !== undefined && account.name !== updated.name) {
      changes.push({ field: "name", from: account.name, to: updated.name });
    }
    if (data.type !== undefined && account.type !== updated.type) {
      changes.push({ field: "type", from: account.type, to: updated.type });
    }
    if (data.initialBalance !== undefined && Number(account.initialBalance) !== Number(updated.initialBalance)) {
      changes.push({
        field: "initialBalance",
        from: String(account.initialBalance),
        to: String(updated.initialBalance),
      });
    }
    if (data.isDefault !== undefined && account.isDefault !== updated.isDefault) {
      changes.push({
        field: "isDefault",
        from: String(account.isDefault),
        to: String(updated.isDefault),
      });
    }
    if (data.isHidden !== undefined && account.isHidden !== updated.isHidden) {
      changes.push({
        field: "isHidden",
        from: String(account.isHidden),
        to: String(updated.isHidden),
      });
    }
    if (data.bankName !== undefined && (account.bankName ?? "") !== (updated.bankName ?? "")) {
      changes.push({
        field: "bankName",
        from: account.bankName ?? "—",
        to: updated.bankName ?? "—",
      });
    }
    if (data.accountNumber !== undefined && (account.accountNumber ?? "") !== (updated.accountNumber ?? "")) {
      const mask = (v: string | null, m: string | null) => {
        const digits = getAccountNumberForMasking(v, m);
        return digits ? "••••" + digits.slice(-4) : "—";
      };
      changes.push({
        field: "accountNumber",
        from: mask(account.accountNumber, account.accountNumberMode),
        to: mask(updated.accountNumber, updated.accountNumberMode),
      });
    }
    if (account.type === "CREDIT_CARD") {
      if (data.creditLimit !== undefined && Number(account.creditLimit ?? 0) !== Number(updated.creditLimit ?? 0)) {
        changes.push({
          field: "creditLimit",
          from: String(account.creditLimit ?? ""),
          to: String(updated.creditLimit ?? ""),
        });
      }
      if (data.statementClosingDay !== undefined && account.statementClosingDay !== updated.statementClosingDay) {
        changes.push({
          field: "statementClosingDay",
          from: String(account.statementClosingDay ?? ""),
          to: String(updated.statementClosingDay ?? ""),
        });
      }
      if (data.dueDay !== undefined && account.dueDay !== updated.dueDay) {
        changes.push({
          field: "dueDay",
          from: String(account.dueDay ?? ""),
          to: String(updated.dueDay ?? ""),
        });
      }
      if (data.interestRate !== undefined && (account.interestRate ?? null) !== (updated.interestRate ?? null)) {
        changes.push({
          field: "interestRate",
          from: account.interestRate != null ? String(account.interestRate) : "—",
          to: updated.interestRate != null ? String(updated.interestRate) : "—",
        });
      }
      if (data.cardAccountType !== undefined && (account.cardAccountType ?? "") !== (updated.cardAccountType ?? "")) {
        changes.push({
          field: "cardAccountType",
          from: account.cardAccountType ?? "—",
          to: updated.cardAccountType ?? "—",
        });
      }
      if (data.cardNetwork !== undefined && (account.cardNetwork ?? "") !== (updated.cardNetwork ?? "")) {
        changes.push({
          field: "cardNetwork",
          from: account.cardNetwork ?? "—",
          to: updated.cardNetwork ?? "—",
        });
      }
    }
    if (data.lastCheckedAt !== undefined) {
      const oldVal = account.lastCheckedAt?.toISOString() ?? "—";
      const newVal = updated.lastCheckedAt?.toISOString() ?? "—";
      if (oldVal !== newVal) {
        changes.push({ field: "lastCheckedAt", from: oldVal, to: newVal });
      }
    }

    void createActivityLog({
      userId,
      action: ActivityLogAction.FINANCIAL_ACCOUNT_UPDATED,
      entityType: "financialAccount",
      entityId: updated.id,
      details: {
        name: updated.name,
        type: updated.type,
        changes: changes.length > 0 ? changes : undefined,
      },
    });

    revalidateTag("financial-accounts", "max");
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");
    const accountNumberForForm =
      getFullAccountNumber(updated.accountNumber, updated.accountNumberMode) ??
      updated.accountNumber ??
      null;

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      type: updated.type,
      initialBalance: Number(updated.initialBalance),
      isActive: updated.isActive,
      isDefault: updated.isDefault,
      isHidden: updated.isHidden,
      creditLimit: updated.creditLimit != null ? Number(updated.creditLimit) : null,
      statementClosingDay: updated.statementClosingDay,
      dueDay: updated.dueDay,
      interestRate: updated.interestRate != null ? Number(updated.interestRate) : null,
      cardAccountType: updated.cardAccountType ?? null,
      cardNetwork: updated.cardNetwork ?? null,
      bankName: updated.bankName ?? null,
      accountNumber: accountNumberForForm,
      accountNumberMode: updated.accountNumberMode ?? null,
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

export async function DELETE(
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

  if (account.isDefault) {
    return NextResponse.json(
      { error: "Cannot delete the default account" },
      { status: 400 }
    );
  }

  const txCount = await prisma.transaction.count({
    where: { financialAccountId: id },
  });

  try {
    if (txCount > 0) {
      await prisma.financialAccount.update({
        where: { id },
        data: { isActive: false },
      });
      void createActivityLog({
        userId,
        action: ActivityLogAction.FINANCIAL_ACCOUNT_DISABLED,
        entityType: "financialAccount",
        entityId: id,
        details: { name: account.name, type: account.type },
      });
    } else {
      await prisma.financialAccount.delete({
        where: { id },
      });
      void createActivityLog({
        userId,
        action: ActivityLogAction.FINANCIAL_ACCOUNT_DELETED,
        entityType: "financialAccount",
        entityId: id,
        details: { name: account.name, type: account.type },
      });
    }
    revalidateTag("financial-accounts", "max");
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
