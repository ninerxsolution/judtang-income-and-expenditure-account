import { prisma } from "@/lib/prisma";
import { createTransaction, TransactionType } from "@/lib/transactions";
import { getCurrentOutstanding, recomputeOutstanding } from "@/lib/credit-card/outstanding";
import { isAccountIncomplete } from "@/lib/financial-accounts";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

export type ApplyInterestResult =
  | { applied: true; transactionId: string; amount: number }
  | { applied: false; message: string };

/**
 * Applies interest for a credit card account from interestCalculatedUntil (or fallback)
 * to today, using current outstanding and annual interest rate.
 * Creates one INTEREST transaction and updates interestCalculatedUntil.
 */
export async function applyInterest(
  accountId: string,
  userId: string
): Promise<ApplyInterestResult> {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    throw new Error("Not found");
  }

  if (isAccountIncomplete(account)) {
    throw new Error("Credit card account is incomplete");
  }

  const rate = account.interestRate != null ? Number(account.interestRate) : 0;
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error("Invalid interest rate");
  }

  const outstanding = await getCurrentOutstanding(accountId);
  if (outstanding <= 0) {
    return { applied: false, message: "No outstanding balance" };
  }

  const now = new Date();
  let fromDate: Date;

  if (account.interestCalculatedUntil) {
    fromDate = new Date(account.interestCalculatedUntil);
  } else {
    const lastStatement = await prisma.creditCardStatement.findFirst({
      where: { accountId },
      orderBy: { periodEnd: "desc" },
      select: { periodEnd: true },
    });
    if (lastStatement) {
      fromDate = new Date(lastStatement.periodEnd);
    } else {
      fromDate = new Date(account.createdAt);
      fromDate.setDate(1);
      fromDate.setHours(0, 0, 0, 0);
    }
  }

  const toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const fromTime = fromDate.getTime();
  const toTime = toDate.getTime();
  if (toTime <= fromTime) {
    return { applied: false, message: "No period to calculate interest" };
  }

  const days = Math.max(1, Math.ceil((toTime - fromTime) / (24 * 60 * 60 * 1000)));
  const annualRateDecimal = rate / 100;
  const interestAmount = Math.round((outstanding * (annualRateDecimal / 365) * days) * 100) / 100;
  if (interestAmount <= 0) {
    return { applied: false, message: "Calculated interest is zero" };
  }

  const transaction = await createTransaction({
    userId,
    type: TransactionType.INTEREST,
    amount: interestAmount,
    financialAccountId: accountId,
    occurredAt: toDate,
    status: "POSTED",
    note: "Interest",
  });

  await prisma.financialAccount.update({
    where: { id: accountId },
    data: { interestCalculatedUntil: toDate },
  });

  await recomputeOutstanding(accountId);

  void createActivityLog({
    userId,
    action: ActivityLogAction.CREDIT_CARD_INTEREST_APPLIED,
    entityType: "FinancialAccount",
    entityId: accountId,
    details: { transactionId: transaction.id, amount: interestAmount, fromDate: fromDate.toISOString(), toDate: toDate.toISOString() },
  });

  return {
    applied: true,
    transactionId: transaction.id,
    amount: interestAmount,
  };
}
