import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/transactions";
import {
  TransactionStatus,
  TransactionType as PrismaTransactionType,
} from "@prisma/client";
import {
  computeBaseAmountThb,
  defaultExchangeRateThbPerUnit,
  isBaseCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { parseOccurredAt } from "@/lib/date-range";
import { revalidateTag } from "@/lib/cache";
import { rebuildBalanceSnapshotsForFinancialAccountIds } from "@/lib/transaction-balance-snapshot";

const MAX_BULK_ROWS = 500;

const ALLOWED_TYPES = new Set<string>([
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER,
]);

type BulkTransactionInput = {
  type: string;
  amount: number;
  financialAccountId?: string | null;
  transferAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  occurredAt: string;
};

type SessionWithId = { user: { id?: string }; sessionId?: string };

type ValidationError = { index: number; message: string };

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { transactions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.transactions)) {
    return NextResponse.json(
      { error: "transactions must be an array" },
      { status: 400 },
    );
  }

  const items = body.transactions as BulkTransactionInput[];

  if (items.length === 0) {
    return NextResponse.json(
      { error: "transactions array is empty" },
      { status: 400 },
    );
  }

  if (items.length > MAX_BULK_ROWS) {
    return NextResponse.json(
      { error: `Too many transactions (max ${MAX_BULK_ROWS})` },
      { status: 400 },
    );
  }

  const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);

  const errors: ValidationError[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const typeUpper = (item.type ?? "").toString().trim().toUpperCase();

    if (!ALLOWED_TYPES.has(typeUpper)) {
      errors.push({
        index: i,
        message: "type must be INCOME, EXPENSE, or TRANSFER",
      });
      continue;
    }

    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({ index: i, message: "amount must be a positive number" });
      continue;
    }

    if (!item.occurredAt) {
      errors.push({ index: i, message: "occurredAt is required" });
      continue;
    }

    const parsed = parseOccurredAt(item.occurredAt);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ index: i, message: "occurredAt must be a valid date" });
      continue;
    }

    if (typeUpper === TransactionType.TRANSFER) {
      if (!item.transferAccountId) {
        errors.push({
          index: i,
          message: "transferAccountId is required for TRANSFER",
        });
        continue;
      }
      const finId = item.financialAccountId?.trim() || defaultAccount.id;
      const toId = String(item.transferAccountId).trim();
      if (finId === toId) {
        errors.push({
          index: i,
          message:
            "transferAccountId must be different from financialAccountId",
        });
        continue;
      }
      const [fromA, toA] = await Promise.all([
        prisma.financialAccount.findFirst({
          where: { id: finId, userId },
          select: { currency: true },
        }),
        prisma.financialAccount.findFirst({
          where: { id: toId, userId },
          select: { currency: true },
        }),
      ]);
      if (!fromA || !toA) {
        errors.push({
          index: i,
          message: "Source or destination account not found",
        });
        continue;
      }
      if (
        normalizeCurrencyCode(fromA.currency) !==
        normalizeCurrencyCode(toA.currency)
      ) {
        errors.push({
          index: i,
          message:
            "Cross-currency transfers are not supported in bulk monthly entry",
        });
        continue;
      }
    } else {
      const finId = item.financialAccountId?.trim() || defaultAccount.id;
      const acc = await prisma.financialAccount.findFirst({
        where: { id: finId, userId },
        select: { id: true },
      });
      if (!acc) {
        errors.push({
          index: i,
          message: "Financial account not found",
        });
        continue;
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 },
    );
  }

  try {
    const accountIdsForSnapshots = new Set<string>();
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;

      for (const item of items) {
        const typeUpper = item.type.toString().trim().toUpperCase();
        const amount = Number(item.amount);
        const occurredAt = parseOccurredAt(item.occurredAt);
        const financialAccountId =
          item.financialAccountId?.trim() || defaultAccount.id;
        const categoryId = item.categoryId?.trim() || null;
        const note = item.note?.trim() || null;
        const transferAccountId =
          typeUpper === TransactionType.TRANSFER
            ? item.transferAccountId?.trim() || null
            : null;

        const fromAccount = await tx.financialAccount.findFirst({
          where: { id: financialAccountId, userId },
          select: { currency: true },
        });
        if (!fromAccount) {
          throw new Error(`Financial account not found: ${financialAccountId}`);
        }
        const fromCur = normalizeCurrencyCode(fromAccount.currency);
        let exchangeRateThb = 1;
        if (!isBaseCurrency(fromCur)) {
          exchangeRateThb = defaultExchangeRateThbPerUnit(fromCur);
        }
        const baseAmountVal = computeBaseAmountThb(amount, fromCur, exchangeRateThb);

        let category: string | null = null;
        if (categoryId) {
          const cat = await tx.category.findFirst({
            where: { id: categoryId, userId },
            select: { name: true },
          });
          category = cat?.name ?? null;
        }

        await tx.transaction.create({
          data: {
            userId,
            type: typeUpper as PrismaTransactionType,
            status: TransactionStatus.POSTED,
            amount,
            currency: fromCur,
            exchangeRate: exchangeRateThb,
            baseAmount: baseAmountVal,
            financialAccountId,
            transferAccountId:
              typeUpper === TransactionType.TRANSFER && transferAccountId
                ? transferAccountId
                : undefined,
            categoryId,
            category,
            note,
            occurredAt,
            postedDate: occurredAt,
          },
        });
        accountIdsForSnapshots.add(financialAccountId);
        if (transferAccountId) {
          accountIdsForSnapshots.add(transferAccountId);
        }
        createdCount += 1;
      }

      return { createdCount };
    });

    await rebuildBalanceSnapshotsForFinancialAccountIds(userId, [...accountIdsForSnapshots]);

    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_IMPORT,
      entityType: "transaction",
      details: {
        source: "bulk-entry",
        createdCount: result.createdCount,
        totalRows: items.length,
      },
    });

    revalidateTag("transactions", "max");
    revalidateTag("financial-accounts", "max");
    revalidateTag("dashboard-init", "max");

    return NextResponse.json({
      createdCount: result.createdCount,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to create transactions" },
      { status: 500 },
    );
  }
}
