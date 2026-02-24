import { prisma } from "@/lib/prisma";
import { createActivityLog } from "@/lib/activity-log";

export const TransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export type CreateTransactionParams = {
  userId: string;
  type: TransactionType;
  amount: number;
  category?: string;
  note?: string;
  occurredAt: Date;
};

export type ListTransactionsOptions = {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
};

export async function createTransaction(params: CreateTransactionParams) {
  const { userId } = params;
  if (!userId) {
    throw new Error("userId is required");
  }

  const type = params.type;
  if (type !== TransactionType.INCOME && type !== TransactionType.EXPENSE) {
    throw new Error("Invalid transaction type");
  }

  const amountNumber = Number(params.amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const category =
    params.category != null && String(params.category).trim() !== ""
      ? String(params.category).trim()
      : null;
  const note =
    params.note != null && String(params.note).trim() !== ""
      ? String(params.note).trim()
      : null;

  const occurredAt = params.occurredAt;
  if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
    throw new Error("occurredAt must be a valid Date");
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type,
      amount: amountNumber,
      category,
      note,
      occurredAt,
    },
  });

  void createActivityLog({
    userId,
    action: "TRANSACTION_CREATED",
    entityType: "transaction",
    entityId: transaction.id,
    details: {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      occurredAt: transaction.occurredAt,
    },
  });

  return transaction;
}

export async function listTransactionsByUser(
  userId: string,
  options: ListTransactionsOptions = {},
) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { from, to, limit = 50, offset = 0 } = options;

  const where: {
    userId: string;
    occurredAt?: { gte?: Date; lte?: Date };
  } = { userId };

  if (from || to) {
    where.occurredAt = {};
    if (from instanceof Date && !Number.isNaN(from.getTime())) {
      where.occurredAt.gte = from;
    }
    if (to instanceof Date && !Number.isNaN(to.getTime())) {
      where.occurredAt.lte = to;
    }
    if (
      where.occurredAt &&
      !where.occurredAt.gte &&
      !where.occurredAt.lte
    ) {
      delete where.occurredAt;
    }
  }

  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const safeOffset = Math.max(offset, 0);

  return prisma.transaction.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: safeLimit,
    skip: safeOffset,
  });
}

