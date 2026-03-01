import { TransactionType as PrismaTransactionType, TransactionStatus as PrismaTransactionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { recomputeOutstanding } from "@/lib/credit-card";

export const TransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
  TRANSFER: "TRANSFER",
  PAYMENT: "PAYMENT",
  INTEREST: "INTEREST",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  PENDING: "PENDING",
  POSTED: "POSTED",
  VOID: "VOID",
} as const;

export type CreateTransactionParams = {
  userId: string;
  type: TransactionType;
  amount: number;
  financialAccountId: string;
  categoryId?: string | null;
  category?: string;
  note?: string | null;
  occurredAt: Date;
  status?: "PENDING" | "POSTED";
  postedDate?: Date;
  statementId?: string | null;
};

export type ListTransactionsOptions = {
  from?: Date;
  to?: Date;
  type?: TransactionType;
  financialAccountId?: string;
  limit?: number;
  offset?: number;
};

export type UpdateTransactionParams = {
  type?: TransactionType;
  amount?: number;
  financialAccountId?: string;
  categoryId?: string | null;
  category?: string | null;
  note?: string | null;
  occurredAt?: Date;
  status?: "PENDING" | "POSTED" | "VOID";
  postedDate?: Date | null;
};

export async function createTransaction(params: CreateTransactionParams) {
  const { userId } = params;
  if (!userId) {
    throw new Error("userId is required");
  }

  const type = params.type;
  const validTypes = [
    TransactionType.INCOME,
    TransactionType.EXPENSE,
    TransactionType.TRANSFER,
    TransactionType.PAYMENT,
    TransactionType.INTEREST,
    TransactionType.ADJUSTMENT,
  ];
  if (!validTypes.includes(type)) {
    throw new Error("Invalid transaction type");
  }

  const amountNumber = Number(params.amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (!params.financialAccountId) {
    throw new Error("financialAccountId is required");
  }

  const category =
    params.category != null && String(params.category).trim() !== ""
      ? String(params.category).trim()
      : null;
  const note =
    params.note != null && String(params.note).trim() !== ""
      ? String(params.note).trim()
      : null;
  const categoryId =
    params.categoryId != null && String(params.categoryId).trim() !== ""
      ? String(params.categoryId).trim()
      : null;

  const occurredAt = params.occurredAt;
  if (!(occurredAt instanceof Date) || Number.isNaN(occurredAt.getTime())) {
    throw new Error("occurredAt must be a valid Date");
  }

  const status = params.status === "PENDING" ? PrismaTransactionStatus.PENDING : PrismaTransactionStatus.POSTED;
  const postedDate = status === PrismaTransactionStatus.POSTED
    ? (params.postedDate ?? occurredAt)
    : null;

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: type as PrismaTransactionType,
      status,
      amount: amountNumber,
      financialAccountId: params.financialAccountId,
      categoryId,
      category,
      note,
      occurredAt,
      postedDate,
      statementId: params.statementId ?? undefined,
    },
  });

  if (params.financialAccountId) {
    const account = await prisma.financialAccount.findUnique({
      where: { id: params.financialAccountId },
      select: { type: true, name: true },
    });
    if (account?.type === "CREDIT_CARD") {
      void recomputeOutstanding(params.financialAccountId);
    }
    const categoryRow = params.categoryId
      ? await prisma.category.findUnique({
          where: { id: params.categoryId },
          select: { name: true },
        })
      : null;
    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_CREATED,
      entityType: "transaction",
      entityId: transaction.id,
      details: {
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        categoryName: categoryRow?.name ?? transaction.category ?? undefined,
        occurredAt: transaction.occurredAt,
        accountName: account?.name,
        financialAccountId: params.financialAccountId,
      },
    });
  } else {
    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_CREATED,
      entityType: "transaction",
      entityId: transaction.id,
      details: {
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        occurredAt: transaction.occurredAt,
      },
    });
  }

  return transaction;
}

export async function listTransactionsByUser(
  userId: string,
  options: ListTransactionsOptions = {},
) {
  if (!userId) {
    throw new Error("userId is required");
  }

  const { from, to, type, financialAccountId, limit = 50, offset = 0 } = options;

  const where: {
    userId: string;
    type?: PrismaTransactionType;
    financialAccountId?: string;
    occurredAt?: { gte?: Date; lte?: Date };
  } = { userId };

  const filterTypes = [
    TransactionType.INCOME,
    TransactionType.EXPENSE,
    TransactionType.TRANSFER,
    TransactionType.PAYMENT,
    TransactionType.INTEREST,
    TransactionType.ADJUSTMENT,
  ];
  if (type && filterTypes.includes(type)) {
    where.type = type as PrismaTransactionType;
  }

  if (financialAccountId) {
    where.financialAccountId = financialAccountId;
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
    include: {
      financialAccount: { select: { id: true, name: true } },
      categoryRef: { select: { id: true, name: true } },
    },
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

  const validUpdateTypes = [
    TransactionType.INCOME,
    TransactionType.EXPENSE,
    TransactionType.TRANSFER,
    TransactionType.PAYMENT,
    TransactionType.INTEREST,
    TransactionType.ADJUSTMENT,
  ];
  const type =
    params.type && validUpdateTypes.includes(params.type)
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
  const categoryId =
    params.categoryId !== undefined
      ? (params.categoryId != null && String(params.categoryId).trim() !== ""
          ? String(params.categoryId).trim()
          : null)
      : existing.categoryId;
  const financialAccountId =
    params.financialAccountId ?? existing.financialAccountId;
  const occurredAt =
    params.occurredAt instanceof Date && !Number.isNaN(params.occurredAt.getTime())
      ? params.occurredAt
      : existing.occurredAt;

  const updateData: Parameters<typeof prisma.transaction.update>[0]["data"] = {
    type: type as PrismaTransactionType,
    amount: amountNumber,
    category,
    note,
    occurredAt,
    categoryId,
  };
  if (financialAccountId) {
    updateData.financialAccountId = financialAccountId;
  }
  if (params.status !== undefined) {
    updateData.status = params.status as PrismaTransactionStatus;
  }
  if (params.postedDate !== undefined) {
    updateData.postedDate = params.postedDate;
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data: updateData,
  });

  const account = transaction.financialAccountId
    ? await prisma.financialAccount.findUnique({
        where: { id: transaction.financialAccountId },
        select: { type: true, name: true },
      })
    : null;
  if (account?.type === "CREDIT_CARD" && transaction.financialAccountId) {
    void recomputeOutstanding(transaction.financialAccountId);
  }
  const categoryRow = transaction.categoryId
    ? await prisma.category.findUnique({
        where: { id: transaction.categoryId },
        select: { name: true },
      })
    : null;
  const newAccountName = account?.name;
  const newCategoryName = categoryRow?.name ?? transaction.category ?? undefined;

  const changes: { field: string; from: string; to: string }[] = [];
  if (existing.type !== transaction.type) {
    changes.push({ field: "type", from: existing.type, to: transaction.type });
  }
  if (Number(existing.amount) !== Number(transaction.amount)) {
    changes.push({
      field: "amount",
      from: String(existing.amount),
      to: String(transaction.amount),
    });
  }
  const existingCategoryName = existing.categoryId
    ? (
        await prisma.category.findUnique({
          where: { id: existing.categoryId },
          select: { name: true },
        })
      )?.name ?? existing.category
    : existing.category;
  if ((existingCategoryName ?? "") !== (newCategoryName ?? "")) {
    changes.push({
      field: "category",
      from: existingCategoryName ?? "—",
      to: newCategoryName ?? "—",
    });
  }
  const existingOccurredAt = existing.occurredAt instanceof Date
    ? existing.occurredAt.toISOString()
    : String(existing.occurredAt ?? "");
  const newOccurredAt = transaction.occurredAt instanceof Date
    ? transaction.occurredAt.toISOString()
    : String(transaction.occurredAt ?? "");
  if (existingOccurredAt !== newOccurredAt) {
    changes.push({
      field: "date",
      from: existingOccurredAt,
      to: newOccurredAt,
    });
  }
  const existingAccountName = existing.financialAccountId
    ? (
        await prisma.financialAccount.findUnique({
          where: { id: existing.financialAccountId },
          select: { name: true },
        })
      )?.name
    : undefined;
  if ((existingAccountName ?? "") !== (newAccountName ?? "")) {
    changes.push({
      field: "account",
      from: existingAccountName ?? "—",
      to: newAccountName ?? "—",
    });
  }

  void createActivityLog({
    userId,
    action: ActivityLogAction.TRANSACTION_UPDATED,
    entityType: "transaction",
    entityId: transaction.id,
    details: {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      categoryName: newCategoryName,
      occurredAt: transaction.occurredAt,
      accountName: newAccountName,
      financialAccountId: transaction.financialAccountId,
      changes: changes.length > 0 ? changes : undefined,
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

  const financialAccountId = existing.financialAccountId;

  let accountName: string | undefined;
  let categoryName: string | undefined;
  if (financialAccountId) {
    const account = await prisma.financialAccount.findUnique({
      where: { id: financialAccountId },
      select: { type: true, name: true },
    });
    if (account?.type === "CREDIT_CARD") {
      void recomputeOutstanding(financialAccountId);
    }
    accountName = account?.name;
  }
  if (existing.categoryId) {
    const categoryRow = await prisma.category.findUnique({
      where: { id: existing.categoryId },
      select: { name: true },
    });
    categoryName = categoryRow?.name ?? existing.category ?? undefined;
  } else if (existing.category) {
    categoryName = existing.category;
  }

  await prisma.transaction.delete({
    where: { id },
  });

  void createActivityLog({
    userId,
    action: ActivityLogAction.TRANSACTION_DELETED,
    entityType: "transaction",
    entityId: id,
    details: {
      type: existing.type,
      amount: existing.amount,
      occurredAt: existing.occurredAt,
      accountName,
      categoryName,
      note: existing.note ?? undefined,
    },
  });

  return true;
}

export type SummaryOptions = {
  from?: Date;
  to?: Date;
  financialAccountId?: string;
};

export async function getTransactionsSummary(
  userId: string,
  options: SummaryOptions,
) {
  if (!userId) {
    throw new Error("userId is required");
  }
  const { from, to, financialAccountId } = options;
  const where: {
    userId: string;
    occurredAt?: { gte: Date; lte: Date };
    financialAccountId?: string;
  } = {
    userId,
  };
  if (from != null && to != null) {
    where.occurredAt = { gte: from, lte: to };
  }
  if (financialAccountId) {
    where.financialAccountId = financialAccountId;
  }

  const [incomeRows, expenseRows] = await Promise.all([
    prisma.transaction.aggregate({
      where: { ...where, type: PrismaTransactionType.INCOME },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        ...where,
        type: { in: [PrismaTransactionType.EXPENSE, PrismaTransactionType.INTEREST] },
      },
      _sum: { amount: true },
    }),
  ]);

  const income = Number(incomeRows._sum.amount ?? 0);
  const expense = Number(expenseRows._sum.amount ?? 0);
  return { income, expense };
}

