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
    select: {
      initialBalance: true,
      type: true,
      cardAccountType: true,
      linkedAccountId: true,
    },
  });

  if (!account) {
    return 0;
  }

  if (account.type === "CREDIT_CARD") {
    const isDebit =
      account.cardAccountType?.toLowerCase() === "debit" &&
      Boolean(account.linkedAccountId?.trim());
    if (isDebit) {
      return getAccountBalance(account.linkedAccountId!);
    }
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

/**
 * Total net balance = sum of all active account balances for the user.
 * Asset accounts (BANK, WALLET, CASH, OTHER) contribute positively;
 * CREDIT_CARD (credit) contributes negatively (liability).
 * Debit cards are excluded — their balance is the same as the linked bank account.
 */
export async function getTotalBalance(userId: string): Promise<number> {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true, type: true, cardAccountType: true, linkedAccountId: true },
  });
  const toSum = accounts.filter((a) => {
    if (a.type !== "CREDIT_CARD") return true;
    const isDebit =
      a.cardAccountType?.toLowerCase() === "debit" &&
      Boolean(a.linkedAccountId?.trim());
    return !isDebit;
  });
  const balances = await Promise.all(
    toSum.map((a) => getAccountBalance(a.id))
  );
  return balances.reduce((sum, b) => sum + b, 0);
}
