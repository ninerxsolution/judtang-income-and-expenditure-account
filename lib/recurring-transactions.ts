import { RecurringFrequency, TransactionType as PrismaTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";

export { RecurringFrequency };

export const RecurringTransactionType = {
  INCOME: "INCOME",
  EXPENSE: "EXPENSE",
} as const;

export type RecurringTransactionType = (typeof RecurringTransactionType)[keyof typeof RecurringTransactionType];

export type CreateRecurringTransactionParams = {
  userId: string;
  name: string;
  type: RecurringTransactionType;
  amount: number;
  categoryId?: string | null;
  financialAccountId?: string | null;
  frequency: RecurringFrequency;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  startDate: Date;
  endDate?: Date | null;
  note?: string | null;
};

export type UpdateRecurringTransactionParams = {
  name?: string;
  type?: RecurringTransactionType;
  amount?: number;
  categoryId?: string | null;
  financialAccountId?: string | null;
  frequency?: RecurringFrequency;
  dayOfMonth?: number | null;
  monthOfYear?: number | null;
  startDate?: Date;
  endDate?: Date | null;
  isActive?: boolean;
  note?: string | null;
};

const recurringTransactionInclude = {
  categoryRef: true,
  financialAccount: true,
} as const;

export async function createRecurringTransaction(params: CreateRecurringTransactionParams) {
  const { userId } = params;

  if (!["INCOME", "EXPENSE"].includes(params.type)) {
    throw new Error("Recurring transactions only support INCOME or EXPENSE type");
  }

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  if (params.frequency === RecurringFrequency.YEARLY && !params.monthOfYear) {
    throw new Error("monthOfYear is required for YEARLY frequency");
  }

  const recurring = await prisma.recurringTransaction.create({
    data: {
      userId,
      name: params.name.trim(),
      type: params.type as PrismaTransactionType,
      amount,
      categoryId: params.categoryId ?? null,
      financialAccountId: params.financialAccountId ?? null,
      frequency: params.frequency,
      dayOfMonth: params.dayOfMonth ?? null,
      monthOfYear: params.monthOfYear ?? null,
      startDate: params.startDate,
      endDate: params.endDate ?? null,
      note: params.note?.trim() ?? null,
      isActive: true,
    },
    include: recurringTransactionInclude,
  });

  await createActivityLog({
    userId,
    action: ActivityLogAction.RECURRING_TRANSACTION_CREATED,
    entityType: "RecurringTransaction",
    entityId: recurring.id,
    details: { name: recurring.name, frequency: recurring.frequency },
  });

  revalidateTag("recurring-transactions");
  return recurring;
}

export async function listRecurringTransactions(userId: string) {
  return prisma.recurringTransaction.findMany({
    where: { userId },
    include: recurringTransactionInclude,
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
}

export async function getRecurringTransactionById(userId: string, id: string) {
  return prisma.recurringTransaction.findFirst({
    where: { id, userId },
    include: recurringTransactionInclude,
  });
}

export async function updateRecurringTransaction(
  userId: string,
  id: string,
  params: UpdateRecurringTransactionParams,
) {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Recurring transaction not found");

  if (params.amount !== undefined) {
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Amount must be a positive number");
    }
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id },
    data: {
      ...(params.name !== undefined && { name: params.name.trim() }),
      ...(params.type !== undefined && { type: params.type as PrismaTransactionType }),
      ...(params.amount !== undefined && { amount: Number(params.amount) }),
      ...(params.categoryId !== undefined && { categoryId: params.categoryId }),
      ...(params.financialAccountId !== undefined && { financialAccountId: params.financialAccountId }),
      ...(params.frequency !== undefined && { frequency: params.frequency }),
      ...(params.dayOfMonth !== undefined && { dayOfMonth: params.dayOfMonth }),
      ...(params.monthOfYear !== undefined && { monthOfYear: params.monthOfYear }),
      ...(params.startDate !== undefined && { startDate: params.startDate }),
      ...(params.endDate !== undefined && { endDate: params.endDate }),
      ...(params.isActive !== undefined && { isActive: params.isActive }),
      ...(params.note !== undefined && { note: params.note?.trim() ?? null }),
    },
    include: recurringTransactionInclude,
  });

  await createActivityLog({
    userId,
    action: ActivityLogAction.RECURRING_TRANSACTION_UPDATED,
    entityType: "RecurringTransaction",
    entityId: id,
    details: params,
  });

  revalidateTag("recurring-transactions");
  return updated;
}

export async function deleteRecurringTransaction(userId: string, id: string) {
  const existing = await prisma.recurringTransaction.findFirst({ where: { id, userId } });
  if (!existing) throw new Error("Recurring transaction not found");

  await prisma.recurringTransaction.delete({ where: { id } });

  await createActivityLog({
    userId,
    action: ActivityLogAction.RECURRING_TRANSACTION_DELETED,
    entityType: "RecurringTransaction",
    entityId: id,
    details: { name: existing.name },
  });

  revalidateTag("recurring-transactions");
}

export type RecurringDueItem = Awaited<ReturnType<typeof getDueRecurringTransactions>>[number];

/**
 * Returns all active recurring transactions that are due in the given year/month,
 * each annotated with whether a transaction was already recorded for that period.
 */
export async function getDueRecurringTransactions(userId: string, year: number, month: number) {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const templates = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      startDate: { lte: periodEnd },
      OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      // For YEARLY, only include if monthOfYear matches
      NOT: {
        AND: [
          { frequency: RecurringFrequency.YEARLY },
          { monthOfYear: { not: month } },
        ],
      },
    },
    include: {
      ...recurringTransactionInclude,
      transactions: {
        where: {
          occurredAt: { gte: periodStart, lte: periodEnd },
        },
        orderBy: { occurredAt: "desc" },
      },
    },
    orderBy: [{ dayOfMonth: "asc" }, { name: "asc" }],
  });

  return templates.map((t) => ({
    ...t,
    isPaid: t.transactions.length > 0,
  }));
}

/**
 * Creates an actual Transaction from a recurring template (i.e., "confirm payment").
 * Links the created transaction back to the template via recurringTransactionId.
 */
export async function confirmRecurringTransaction(
  userId: string,
  recurringId: string,
  params: {
    amount: number;
    occurredAt: Date;
    financialAccountId: string;
    categoryId?: string | null;
    note?: string | null;
  },
) {
  const template = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!template) throw new Error("Recurring transaction not found");

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: template.type,
      status: "POSTED",
      amount,
      financialAccountId: params.financialAccountId,
      categoryId: params.categoryId ?? template.categoryId,
      note: params.note?.trim() ?? template.note ?? null,
      occurredAt: params.occurredAt,
      recurringTransactionId: recurringId,
    },
    include: {
      financialAccount: true,
      categoryRef: true,
      recurringTransaction: true,
    },
  });

  await createActivityLog({
    userId,
    action: ActivityLogAction.TRANSACTION_CREATED,
    entityType: "Transaction",
    entityId: transaction.id,
    details: { source: "recurring", recurringId, name: template.name },
  });

  revalidateTag("transactions");
  revalidateTag("recurring-transactions");

  return transaction;
}
