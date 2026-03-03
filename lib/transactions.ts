import { Prisma, TransactionType as PrismaTransactionType, TransactionStatus as PrismaTransactionStatus } from "@prisma/client";
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
  transferAccountId?: string | null;
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
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

export type UpdateTransactionParams = {
  type?: TransactionType;
  amount?: number;
  financialAccountId?: string;
  transferAccountId?: string | null;
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

  if (type === TransactionType.TRANSFER) {
    const toId = params.transferAccountId != null ? String(params.transferAccountId).trim() : "";
    if (!toId) {
      throw new Error("transferAccountId is required for TRANSFER");
    }
    if (toId === params.financialAccountId) {
      throw new Error("transferAccountId must be different from financialAccountId");
    }
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
      transferAccountId:
        type === TransactionType.TRANSFER && params.transferAccountId
          ? params.transferAccountId
          : undefined,
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
    const transferAccount =
      type === TransactionType.TRANSFER && params.transferAccountId
        ? await prisma.financialAccount.findUnique({
            where: { id: params.transferAccountId },
            select: { name: true },
          })
        : null;
    const categoryRow = params.categoryId
      ? await prisma.category.findUnique({
          where: { id: params.categoryId },
          select: { name: true },
        })
      : null;
    const details: Record<string, unknown> = {
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      categoryName: categoryRow?.name ?? transaction.category ?? undefined,
      occurredAt: transaction.occurredAt,
      accountName: account?.name,
      financialAccountId: params.financialAccountId,
    };
    if (type === TransactionType.TRANSFER && transferAccount?.name) {
      details.toAccountName = transferAccount.name;
    }
    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_CREATED,
      entityType: "transaction",
      entityId: transaction.id,
      details,
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

  const { from, to, type, financialAccountId, categoryId, search, limit = 50, offset = 0 } = options;

  const where: {
    userId: string;
    type?: PrismaTransactionType;
    financialAccountId?: string;
    categoryId?: string;
    OR?: Array<{ financialAccountId?: string; transferAccountId?: string }>;
    occurredAt?: { gte?: Date; lte?: Date };
    AND?: Prisma.TransactionWhereInput[];
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

  if (categoryId && categoryId.trim()) {
    where.categoryId = categoryId.trim();
  }

  if (financialAccountId) {
    where.OR = [
      { financialAccountId },
      { transferAccountId: financialAccountId },
    ];
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

  const q = typeof search === "string" ? search.trim() : "";
  if (q) {
    const searchOr: Prisma.TransactionWhereInput[] = [];
    searchOr.push({ note: { contains: q } });
    searchOr.push({ category: { contains: q } });
    searchOr.push({ financialAccount: { name: { contains: q } } });
    searchOr.push({ transferAccount: { name: { contains: q } } });
    searchOr.push({ categoryRef: { name: { contains: q } } });
    const num = Number.parseFloat(q);
    if (Number.isFinite(num) && num > 0) {
      searchOr.push({ amount: { equals: new Prisma.Decimal(num) } });
    }
    const upperQ = q.toUpperCase();
    if (filterTypes.includes(upperQ as TransactionType)) {
      searchOr.push({ type: upperQ as PrismaTransactionType });
    }
    const cuidLike = /^[c][a-z0-9]{24}$/i.test(q);
    if (cuidLike) {
      searchOr.push({ id: q });
    }
    where.AND = [{ OR: searchOr }];
  }

  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const safeOffset = Math.max(offset, 0);

  return prisma.transaction.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: safeLimit,
    skip: safeOffset,
    include: {
      financialAccount: {
        select: {
          id: true,
          name: true,
          type: true,
          bankName: true,
          cardNetwork: true,
          accountNumber: true,
          accountNumberMode: true,
        },
      },
      transferAccount: {
        select: {
          id: true,
          name: true,
          type: true,
          bankName: true,
          cardNetwork: true,
          accountNumber: true,
          accountNumberMode: true,
        },
      },
      categoryRef: { select: { id: true, name: true } },
    },
  });
}

export async function getTransactionById(userId: string, id: string) {
  if (!userId || !id) return null;
  return prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      financialAccount: { select: { id: true, name: true } },
      transferAccount: { select: { id: true, name: true } },
      categoryRef: { select: { id: true, name: true } },
    },
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
  const transferAccountId =
    params.transferAccountId !== undefined
      ? params.transferAccountId != null && String(params.transferAccountId).trim() !== ""
        ? String(params.transferAccountId).trim()
        : null
      : existing.transferAccountId;
  if (type === TransactionType.TRANSFER) {
    if (!transferAccountId) {
      throw new Error("transferAccountId is required for TRANSFER");
    }
    if (transferAccountId === financialAccountId) {
      throw new Error("transferAccountId must be different from financialAccountId");
    }
  }
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
  if (type === TransactionType.TRANSFER) {
    updateData.transferAccountId = transferAccountId;
  } else {
    updateData.transferAccountId = null;
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
    include: {
      financialAccount: { select: { id: true, name: true } },
      transferAccount: { select: { id: true, name: true } },
      categoryRef: { select: { id: true, name: true } },
    },
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
  const existingTransferAccountName = existing.transferAccountId
    ? (existing as { transferAccount?: { name: string } }).transferAccount?.name
    : undefined;
  const newTransferAccountName = transaction.transferAccountId
    ? (
        await prisma.financialAccount.findUnique({
          where: { id: transaction.transferAccountId },
          select: { name: true },
        })
      )?.name
    : undefined;
  if ((existingTransferAccountName ?? "") !== (newTransferAccountName ?? "")) {
    changes.push({
      field: "toAccount",
      from: existingTransferAccountName ?? "—",
      to: newTransferAccountName ?? "—",
    });
  }

  const activityDetails: Record<string, unknown> = {
    type: transaction.type,
    amount: transaction.amount,
    category: transaction.category,
    categoryName: newCategoryName,
    occurredAt: transaction.occurredAt,
    accountName: newAccountName,
    financialAccountId: transaction.financialAccountId,
    changes: changes.length > 0 ? changes : undefined,
  };
  if (transaction.type === "TRANSFER" && newTransferAccountName) {
    activityDetails.toAccountName = newTransferAccountName;
  }

  void createActivityLog({
    userId,
    action: ActivityLogAction.TRANSACTION_UPDATED,
    entityType: "transaction",
    entityId: transaction.id,
    details: activityDetails,
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

export type SummaryByMonthOptions = {
  year: number;
  timezone?: string;
  financialAccountId?: string;
};

export type SummaryByMonthItem = {
  monthIndex: number;
  income: number;
  expense: number;
};

export async function getSummaryByMonth(
  userId: string,
  options: SummaryByMonthOptions,
): Promise<SummaryByMonthItem[]> {
  if (!userId) throw new Error("userId is required");
  const { year, timezone = "Asia/Bangkok", financialAccountId } = options;
  const { getDateRangeInTimezone, toDateStringInTimezone } = await import("@/lib/date-range");

  const fromRange = getDateRangeInTimezone(`${year}-01-01`, timezone);
  const toRange = getDateRangeInTimezone(`${year}-12-31`, timezone);
  if (!fromRange || !toRange) throw new Error("Invalid year");

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: fromRange.from, lte: toRange.to },
      type: {
        in: [
          PrismaTransactionType.INCOME,
          PrismaTransactionType.EXPENSE,
          PrismaTransactionType.INTEREST,
        ],
      },
      ...(financialAccountId ? { financialAccountId } : {}),
    },
    select: { occurredAt: true, type: true, amount: true },
  });

  const monthMap = new Map<
    number,
    { income: number; expense: number }
  >();
  for (let m = 0; m < 12; m++) {
    monthMap.set(m, { income: 0, expense: 0 });
  }

  for (const tx of transactions) {
    const dateStr = toDateStringInTimezone(tx.occurredAt, timezone);
    const monthPart = dateStr.split("-")[1];
    const m = monthPart ? parseInt(monthPart, 10) - 1 : 0;
    const prev = monthMap.get(m) ?? { income: 0, expense: 0 };
    const typeUpper = String(tx.type).toUpperCase();
    const amt = Number(tx.amount) || 0;
    if (typeUpper === "INCOME") {
      monthMap.set(m, { ...prev, income: prev.income + amt });
    } else if (typeUpper === "EXPENSE" || typeUpper === "INTEREST") {
      monthMap.set(m, { ...prev, expense: prev.expense + amt });
    }
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([monthIndex, { income, expense }]) => ({
      monthIndex,
      income,
      expense,
    }));
}

export type SummaryByCategoryOptions = {
  from: Date;
  to: Date;
  financialAccountId?: string;
};

export type SummaryByCategoryItem = {
  categoryId: string | null;
  categoryName: string;
  amount: number;
};

export async function getSummaryByCategory(
  userId: string,
  options: SummaryByCategoryOptions,
): Promise<SummaryByCategoryItem[]> {
  if (!userId) throw new Error("userId is required");
  const { from, to, financialAccountId } = options;

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      occurredAt: { gte: from, lte: to },
      type: {
        in: [PrismaTransactionType.EXPENSE, PrismaTransactionType.INTEREST],
      },
      ...(financialAccountId ? { financialAccountId } : {}),
    },
    select: {
      amount: true,
      categoryId: true,
      category: true,
      categoryRef: { select: { name: true } },
    },
  });

  const map = new Map<string, { categoryId: string | null; categoryName: string; amount: number }>();
  for (const tx of transactions) {
    const name =
      tx.categoryRef?.name ??
      (tx.category && tx.category.trim() ? tx.category.trim() : null) ??
      "—";
    const key = tx.categoryId ?? `str:${name}`;
    const prev = map.get(key);
    const amt = Number(tx.amount) || 0;
    if (prev) {
      map.set(key, { ...prev, amount: prev.amount + amt });
    } else {
      map.set(key, {
        categoryId: tx.categoryId,
        categoryName: name,
        amount: amt,
      });
    }
  }

  return Array.from(map.values())
    .filter((x) => x.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

