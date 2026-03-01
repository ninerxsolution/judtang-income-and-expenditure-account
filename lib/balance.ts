import { prisma } from "@/lib/prisma";
import { TransactionType } from "@prisma/client";
import { getCurrentOutstanding } from "@/lib/credit-card";

/**
 * Balance = initialBalance + sum(INCOME) - sum(EXPENSE) + sum(TRANSFER in) - sum(TRANSFER out)
 * TRANSFER: financialAccountId = source (-amount), transferAccountId = destination (+amount).
 * For CREDIT_CARD: returns -currentOutstanding (liability as negative from user perspective).
 */
export async function getAccountBalance(accountId: string): Promise<number> {
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: { initialBalance: true, type: true },
  });

  if (!account) {
    return 0;
  }

  if (account.type === "CREDIT_CARD") {
    const outstanding = await getCurrentOutstanding(accountId);
    return -outstanding;
  }

  const [incomeSum, expenseSum, transferOutSum, transferInSum] = await Promise.all([
    prisma.transaction.aggregate({
      where: { financialAccountId: accountId, type: TransactionType.INCOME },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { financialAccountId: accountId, type: TransactionType.EXPENSE },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { financialAccountId: accountId, type: TransactionType.TRANSFER },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { transferAccountId: accountId, type: TransactionType.TRANSFER },
      _sum: { amount: true },
    }),
  ]);

  const income = Number(incomeSum._sum.amount ?? 0);
  const expense = Number(expenseSum._sum.amount ?? 0);
  const transferOut = Number(transferOutSum._sum.amount ?? 0);
  const transferIn = Number(transferInSum._sum.amount ?? 0);
  const initial = Number(account.initialBalance);

  return initial + income - expense - transferOut + transferIn;
}
