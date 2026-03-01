import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { subMonths, addMonths, addDays, startOfDay, endOfDay } from "date-fns";

export type StatementPeriod = {
  periodStart: Date;
  periodEnd: Date;
  closingDate: Date;
  dueDate: Date;
};

/**
 * Derive the active statement period from account's statementClosingDay and dueDay.
 * Returns null if account is not configured for statements.
 */
export async function getActiveStatementPeriod(
  accountId: string
): Promise<StatementPeriod | null> {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: { statementClosingDay: true, dueDay: true, type: true },
  });

  if (
    !account ||
    account.type !== "CREDIT_CARD" ||
    account.statementClosingDay == null ||
    account.dueDay == null
  ) {
    return null;
  }

  const closingDay = account.statementClosingDay;
  const dueDay = account.dueDay;

  const now = new Date();
  let closingDate = new Date(now.getFullYear(), now.getMonth(), closingDay);

  if (now.getDate() > closingDay) {
    closingDate = addMonths(closingDate, 1);
  } else if (now.getDate() < closingDay) {
    closingDate = subMonths(closingDate, 1);
  }

  const periodStart = subMonths(closingDate, 1);
  periodStart.setDate(closingDay + 1);
  const periodEnd = new Date(closingDate);
  periodEnd.setHours(23, 59, 59, 999);

  let dueDate = new Date(closingDate.getFullYear(), closingDate.getMonth(), dueDay);
  if (dueDay <= closingDay) {
    dueDate = addMonths(dueDate, 1);
  }

  return {
    periodStart: startOfDay(periodStart),
    periodEnd: endOfDay(periodEnd),
    closingDate: startOfDay(closingDate),
    dueDate: startOfDay(dueDate),
  };
}

/**
 * Get the period for a given closing date (for closing a specific statement).
 */
export function getPeriodForClosingDate(
  closingDate: Date,
  statementClosingDay: number,
  dueDay: number
): StatementPeriod {
  const closing = startOfDay(new Date(closingDate));
  const prevClosing = subMonths(closing, 1);
  const periodStart = addDays(prevClosing, 1);
  const periodEnd = endOfDay(closing);

  let dueDate = new Date(closing.getFullYear(), closing.getMonth(), dueDay);
  if (dueDay <= statementClosingDay) {
    dueDate = addMonths(dueDate, 1);
  }

  return {
    periodStart: startOfDay(periodStart),
    periodEnd,
    closingDate: closing,
    dueDate: startOfDay(dueDate),
  };
}

/**
 * Close statement for the given closing date.
 * Collects POSTED EXPENSE and INTEREST in the period, creates CreditCardStatement.
 * Throws if statement already exists for this period.
 */
export async function closeStatement(
  accountId: string,
  closingDate: Date
): Promise<{ id: string }> {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: {
      statementClosingDay: true,
      dueDay: true,
      type: true,
      userId: true,
    },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    throw new Error("Account is not a credit card");
  }

  if (account.statementClosingDay == null || account.dueDay == null) {
    throw new Error(
      "Statement cycle not configured. Please set statement closing day and due day in account settings."
    );
  }

  const period = getPeriodForClosingDate(
    closingDate,
    account.statementClosingDay,
    account.dueDay
  );

  const existing = await prisma.creditCardStatement.findFirst({
    where: {
      accountId,
      closingDate: {
        gte: startOfDay(period.closingDate),
        lte: endOfDay(period.closingDate),
      },
    },
  });

  if (existing) {
    throw new Error("Statement already closed for this period");
  }

  const transactions = await prisma.transaction.findMany({
    where: {
      financialAccountId: accountId,
      status: TransactionStatus.POSTED,
      type: { in: [TransactionType.EXPENSE, TransactionType.INTEREST] },
      occurredAt: {
        gte: period.periodStart,
        lte: period.periodEnd,
      },
    },
  });

  const statementBalance = transactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const minimumPayment = Math.max(
    statementBalance * 0.05,
    statementBalance > 0 ? 100 : 0
  );

  const statement = await prisma.creditCardStatement.create({
    data: {
      accountId,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      closingDate: period.closingDate,
      dueDate: period.dueDate,
      statementBalance,
      minimumPayment,
      isClosed: true,
    },
  });

  await prisma.transaction.updateMany({
    where: {
      id: { in: transactions.map((t) => t.id) },
    },
    data: { statementId: statement.id },
  });

  return { id: statement.id };
}

/**
 * Get the latest (most recent) statement for the account.
 */
export async function getLatestStatement(accountId: string) {
  return prisma.creditCardStatement.findFirst({
    where: { accountId },
    orderBy: { closingDate: "desc" },
  });
}
