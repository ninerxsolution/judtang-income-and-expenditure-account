import {
  Prisma,
  RecurringFrequency,
  TransactionStatus,
  TransactionType as PrismaTransactionType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { revalidateTag } from "@/lib/cache";
import { rebuildBalanceSnapshotsForFinancialAccountIds } from "@/lib/transaction-balance-snapshot";
import { getTransactionById, updateTransaction } from "@/lib/transactions";

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

  revalidateTag("recurring-transactions", "max");
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

  revalidateTag("recurring-transactions", "max");
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

  revalidateTag("recurring-transactions", "max");
}

export type RecurringDueItem = Awaited<ReturnType<typeof getDueRecurringTransactions>>[number];

/**
 * Calendar month bounds in the environment local timezone (matches legacy due-month logic).
 */
export function getCalendarMonthBounds(year: number, month: number): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return { periodStart, periodEnd };
}

export type RecurringLinkCandidate = Awaited<ReturnType<typeof listRecurringLinkCandidates>>[number];

export type ListRecurringLinkCandidatesOptions = {
  /** Trimmed substring search (note, account name, legacy category label, category name/nameEn, exact amount). */
  search?: string;
  /** Gregorian YYYY-MM-DD; narrows occurredAt to that local calendar day within the due month. */
  onDate?: string;
  /** Max rows returned (default 10, capped at 50). */
  limit?: number;
};

/**
 * Posted INCOME/EXPENSE rows in the due month with no recurring link and not part of a transfer group.
 */
export async function listRecurringLinkCandidates(
  userId: string,
  recurringId: string,
  year: number,
  month: number,
  options: ListRecurringLinkCandidatesOptions = {},
) {
  const template = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!template) {
    throw new Error("Recurring transaction not found");
  }
  if (template.type !== PrismaTransactionType.INCOME && template.type !== PrismaTransactionType.EXPENSE) {
    throw new Error("Recurring transactions only support INCOME or EXPENSE type");
  }

  const { periodStart, periodEnd } = getCalendarMonthBounds(year, month);

  let occurredAt: { gte: Date; lte: Date } = { gte: periodStart, lte: periodEnd };
  const onDateRaw = typeof options.onDate === "string" ? options.onDate.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(onDateRaw)) {
    const [dy, dm, dd] = onDateRaw.split("-").map(Number);
    const dayStart = new Date(dy, dm - 1, dd, 0, 0, 0, 0);
    const dayEnd = new Date(dy, dm - 1, dd, 23, 59, 59, 999);
    if (dayStart >= periodStart && dayEnd <= periodEnd) {
      occurredAt = { gte: dayStart, lte: dayEnd };
    }
  }

  const baseWhere: Prisma.TransactionWhereInput = {
    userId,
    type: template.type,
    status: TransactionStatus.POSTED,
    recurringTransactionId: null,
    transferGroupId: null,
    occurredAt,
  };

  const q = typeof options.search === "string" ? options.search.trim() : "";
  const andExtras: Prisma.TransactionWhereInput[] = [];
  if (q.length > 0) {
    const searchOr: Prisma.TransactionWhereInput[] = [];
    searchOr.push({ note: { contains: q } });
    searchOr.push({ category: { contains: q } });
    searchOr.push({ financialAccount: { name: { contains: q } } });
    searchOr.push({ categoryRef: { name: { contains: q } } });
    searchOr.push({ categoryRef: { nameEn: { contains: q } } });
    const amountStr = q.replace(/,/g, "");
    const num = Number.parseFloat(amountStr);
    if (Number.isFinite(num) && num > 0) {
      searchOr.push({ amount: { equals: new Prisma.Decimal(num) } });
    }
    if (/^[c][a-z0-9]{24}$/i.test(q)) {
      searchOr.push({ id: q });
    }
    andExtras.push({ OR: searchOr });
  }

  const safeLimit = Math.min(Math.max(options.limit ?? 10, 1), 50);

  const where: Prisma.TransactionWhereInput =
    andExtras.length > 0 ? { AND: [baseWhere, ...andExtras] } : baseWhere;

  return prisma.transaction.findMany({
    where,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: safeLimit,
    select: {
      id: true,
      occurredAt: true,
      amount: true,
      currency: true,
      note: true,
      financialAccountId: true,
      categoryId: true,
      financialAccount: { select: { id: true, name: true } },
      categoryRef: { select: { id: true, name: true, nameEn: true } },
    },
  });
}

/**
 * Returns all active recurring transactions that are due in the given year/month,
 * each annotated with whether a transaction was already recorded for that period.
 */
export async function getDueRecurringTransactions(userId: string, year: number, month: number) {
  const { periodStart, periodEnd } = getCalendarMonthBounds(year, month);

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

function assertOccurredAtInDueMonth(occurredAt: Date, year: number, month: number): void {
  const { periodStart, periodEnd } = getCalendarMonthBounds(year, month);
  if (occurredAt < periodStart || occurredAt > periodEnd) {
    throw new Error("Payment date must fall within the selected due month");
  }
}

/**
 * Creates an actual Transaction from a recurring template (i.e., "confirm payment"),
 * or links an existing manual row when `linkTransactionId` is set.
 */
export async function confirmRecurringTransaction(
  userId: string,
  recurringId: string,
  params: {
    dueYear: number;
    dueMonth: number;
    amount: number;
    occurredAt: Date;
    financialAccountId: string;
    categoryId?: string | null;
    note?: string | null;
    linkTransactionId?: string | null;
  },
) {
  const year = Number(params.dueYear);
  const month = Number(params.dueMonth);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("dueYear and dueMonth must be a valid calendar month");
  }

  const template = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });
  if (!template) throw new Error("Recurring transaction not found");

  const amount = Number(params.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const { periodStart, periodEnd } = getCalendarMonthBounds(year, month);
  assertOccurredAtInDueMonth(params.occurredAt, year, month);

  const existingForMonth = await prisma.transaction.findFirst({
    where: {
      userId,
      recurringTransactionId: recurringId,
      occurredAt: { gte: periodStart, lte: periodEnd },
    },
    select: { id: true },
  });
  if (existingForMonth) {
    throw new Error("Already recorded for this recurring item in the selected month");
  }

  const categoryIdResolved = params.categoryId ?? template.categoryId;
  const noteResolved = params.note?.trim() ?? template.note ?? null;

  const linkId =
    params.linkTransactionId != null && String(params.linkTransactionId).trim() !== ""
      ? String(params.linkTransactionId).trim()
      : null;

  if (linkId) {
    const candidate = await prisma.transaction.findFirst({
      where: {
        id: linkId,
        userId,
        type: template.type,
        status: TransactionStatus.POSTED,
        recurringTransactionId: null,
        transferGroupId: null,
        occurredAt: { gte: periodStart, lte: periodEnd },
      },
    });
    if (!candidate) {
      throw new Error("Selected transaction cannot be linked for this recurring item and month");
    }

    await updateTransaction(userId, linkId, {
      amount,
      financialAccountId: params.financialAccountId,
      categoryId: categoryIdResolved,
      note: noteResolved,
      occurredAt: params.occurredAt,
      recurringTransactionId: recurringId,
      activityLogExtras: {
        source: "recurring-link",
        recurringId,
        recurringName: template.name,
      },
    });

    revalidateTag("transactions", "max");
    revalidateTag("recurring-transactions", "max");

    const refreshed = await getTransactionById(userId, linkId);
    return refreshed ?? candidate;
  }

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      type: template.type,
      status: "POSTED",
      amount,
      financialAccountId: params.financialAccountId,
      categoryId: categoryIdResolved,
      note: noteResolved,
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

  await rebuildBalanceSnapshotsForFinancialAccountIds(userId, [params.financialAccountId]);

  revalidateTag("transactions", "max");
  revalidateTag("recurring-transactions", "max");

  const refreshed = await getTransactionById(userId, transaction.id);
  return refreshed ?? transaction;
}
