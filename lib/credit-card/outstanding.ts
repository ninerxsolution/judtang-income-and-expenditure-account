import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";

/**
 * Get current outstanding (debt) for a credit card account.
 * Outstanding = sum(EXPENSE + INTEREST) - sum(PAYMENT + ADJUSTMENT + INCOME)
 * INCOME on credit card = refund. Only POSTED transactions, exclude VOID.
 */
export async function getCurrentOutstanding(accountId: string): Promise<number> {
  const [expenseInterestSum, paymentAdjustmentIncomeSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        financialAccountId: accountId,
        status: TransactionStatus.POSTED,
        type: { in: [TransactionType.EXPENSE, TransactionType.INTEREST] },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        financialAccountId: accountId,
        status: TransactionStatus.POSTED,
        type: {
          in: [TransactionType.PAYMENT, TransactionType.ADJUSTMENT, TransactionType.INCOME],
        },
      },
      _sum: { amount: true },
    }),
  ]);

  const expenseInterest = Number(expenseInterestSum._sum.amount ?? 0);
  const credits = Number(paymentAdjustmentIncomeSum._sum.amount ?? 0);
  return Math.max(0, expenseInterest - credits);
}

/**
 * Get sum of PENDING transaction amounts (EXPENSE + INTEREST) that reduce available credit.
 */
export async function getPendingAmount(accountId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: {
      financialAccountId: accountId,
      status: TransactionStatus.PENDING,
      type: { in: [TransactionType.EXPENSE, TransactionType.INTEREST] },
    },
    _sum: { amount: true },
  });
  return Number(result._sum.amount ?? 0);
}

/**
 * Get available credit = creditLimit - currentOutstanding - pendingAmount
 * Returns null if creditLimit is not set.
 */
export async function getAvailableCredit(accountId: string): Promise<number | null> {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: { creditLimit: true },
  });

  if (!account || account.creditLimit == null) {
    return null;
  }

  const creditLimit = Number(account.creditLimit);
  const outstanding = await getCurrentOutstanding(accountId);
  const pending = await getPendingAmount(accountId);

  return Math.max(0, creditLimit - outstanding - pending);
}

/**
 * Recalculate and update FinancialAccount.currentOutstanding and availableCredit.
 */
export async function recomputeOutstanding(accountId: string): Promise<void> {
  const outstanding = await getCurrentOutstanding(accountId);
  const available = await getAvailableCredit(accountId);

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: {
      currentOutstanding: outstanding,
      availableCredit: available,
    },
  });
}
