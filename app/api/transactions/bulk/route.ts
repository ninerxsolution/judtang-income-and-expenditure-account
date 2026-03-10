import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/transactions";
import type { TransactionType as PrismaTransactionType } from "@prisma/client";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { parseOccurredAt } from "@/lib/date-range";
import { revalidateTag } from "@/lib/cache";

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
      if (
        item.financialAccountId &&
        item.transferAccountId === item.financialAccountId
      ) {
        errors.push({
          index: i,
          message:
            "transferAccountId must be different from financialAccountId",
        });
      }
    }
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 },
    );
  }

  const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);

  try {
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

        await tx.transaction.create({
          data: {
            userId,
            type: typeUpper as PrismaTransactionType,
            amount,
            financialAccountId,
            transferAccountId: transferAccountId ?? undefined,
            categoryId,
            note,
            occurredAt,
          },
        });
        createdCount += 1;
      }

      return { createdCount };
    });

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
