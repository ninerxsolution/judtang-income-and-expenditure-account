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
  type?: TransactionType;
  limit?: number;
  offset?: number;
};

export type UpdateTransactionParams = {
  type?: TransactionType;
  amount?: number;
  category?: string | null;
  note?: string | null;
  occurredAt?: Date;
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

  const { from, to, type, limit = 50, offset = 0 } = options;

  const where: {
    userId: string;
    type?: string;
    occurredAt?: { gte?: Date; lte?: Date };
  } = { userId };

  if (type === TransactionType.INCOME || type === TransactionType.EXPENSE) {
    where.type = type;
  }

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

export async function getTransactionById(userId: string, id: string) {
  if (!userId || !id) return null;
  return prisma.transaction.findFirst({
    where: { id, userId },
  });
}

export async function updateTransaction(
  userId: string,
  id: string,
  params: UpdateTransactionParams,
) {
  const existing = await getTransactionById(userId, id);
  if (!existing) {
    throw new Error("Transaction not found");
  }

  const type =
    params.type === TransactionType.INCOME || params.type === TransactionType.EXPENSE
      ? params.type
      : existing.type;
  const existingAmount = existing.amount;
  const amountNumber =
    params.amount != null
      ? Number(params.amount)
      : Number(existingAmount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error("Amount must be a positive number");
  }
  const category =
    params.category !== undefined
      ? (params.category != null && String(params.category).trim() !== ""
          ? String(params.category).trim()
          : null)
      : existing.category;
  const note =
    params.note !== undefined
      ? (params.note != null && String(params.note).trim() !== ""
          ? String(params.note).trim()
          : null)
      : existing.note;
  const occurredAt =
    params.occurredAt instanceof Date && !Number.isNaN(params.occurredAt.getTime())
      ? params.occurredAt
      : existing.occurredAt;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      type,
      amount: amountNumber,
      category,
      note,
      occurredAt,
    },
  });

  void createActivityLog({
    userId,
    action: "TRANSACTION_UPDATED",
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

export async function deleteTransaction(
  userId: string,
  id: string,
): Promise<boolean> {
  const existing = await getTransactionById(userId, id);
  if (!existing) return false;

  await prisma.transaction.delete({
    where: { id },
  });

  void createActivityLog({
    userId,
    action: "TRANSACTION_DELETED",
    entityType: "transaction",
    entityId: id,
    details: {
      type: existing.type,
      amount: existing.amount,
      occurredAt: existing.occurredAt,
    },
  });

  return true;
}

export type SummaryOptions = {
  from: Date;
  to: Date;
};

export async function getTransactionsSummary(
  userId: string,
  options: SummaryOptions,
) {
  if (!userId) {
    throw new Error("userId is required");
  }
  const { from, to } = options;
  const where = {
    userId,
    occurredAt: {
      gte: from,
      lte: to,
    },
  };

  const [incomeRows, expenseRows] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, type: TransactionType.INCOME },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { ...where, type: TransactionType.EXPENSE },
      _sum: { amount: true },
    }),
  ]);

  const income = Number(incomeRows._sum.amount ?? 0);
  const expense = Number(expenseRows._sum.amount ?? 0);
  return { income, expense };
}

