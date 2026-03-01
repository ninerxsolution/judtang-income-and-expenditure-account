import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";
import { createActivityLog } from "@/lib/activity-log";
import { isAccountIncomplete } from "@/lib/financial-accounts";
import { getCurrentOutstanding, recomputeOutstanding } from "./outstanding";

export type RecordPaymentParams = {
  userId: string;
  accountId: string;
  amount: number;
  occurredAt: Date;
  fromAccountId?: string;
  note?: string;
};

/**
 * Record a payment and allocate it to oldest unpaid statement first.
 * Creates PAYMENT transaction, updates statement paidAmount, marks isPaid when fully paid.
 * Reduces currentOutstanding and increases availableCredit.
 * When fromAccountId is provided, also creates EXPENSE on that account so its balance decreases.
 */
export async function recordPayment(params: RecordPaymentParams) {
  const { userId, accountId, amount, occurredAt, fromAccountId, note } = params;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: {
      type: true,
      userId: true,
      name: true,
      bankName: true,
      accountNumber: true,
      creditLimit: true,
      interestRate: true,
      cardType: true,
    },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    throw new Error("Account is not a credit card");
  }

  if (account.userId !== userId) {
    throw new Error("Account not found");
  }

  if (isAccountIncomplete(account)) {
    throw new Error(
      "Credit card account is incomplete. Please add bank, card number, credit limit, interest rate, and card type before using."
    );
  }

  const outstanding = await getCurrentOutstanding(accountId);
  if (amount > outstanding) {
    throw new Error("Payment cannot exceed outstanding balance");
  }

  const fromAccountIdTrimmed = fromAccountId?.trim();
  if (fromAccountIdTrimmed) {
    const fromAccount = await prisma.financialAccount.findUnique({
      where: { id: fromAccountIdTrimmed },
      select: { userId: true, type: true, bankName: true, accountNumber: true },
    });
    if (!fromAccount || fromAccount.userId !== userId) {
      throw new Error("From account not found");
    }
    if (fromAccount.type === "CREDIT_CARD") {
      throw new Error("Cannot pay credit card from another credit card");
    }
    if (isAccountIncomplete(fromAccount)) {
      throw new Error(
        "From account is incomplete. Please add bank and account number before using."
      );
    }
  }

  const unpaidStatements = await prisma.creditCardStatement.findMany({
    where: {
      accountId,
      isClosed: true,
      isPaid: false,
    },
    orderBy: { closingDate: "asc" },
  });

  const creditCardName = account.name ?? "Credit Card";
  const expenseNote = `ชำระบัตร: ${creditCardName}`;

  const transaction = await prisma.$transaction(async (tx) => {
    const paymentTx = await tx.transaction.create({
      data: {
        userId,
        type: TransactionType.PAYMENT,
        status: TransactionStatus.POSTED,
        amount,
        financialAccountId: accountId,
        occurredAt,
        postedDate: occurredAt,
        note: note ?? null,
      },
    });

    let remaining = amount;
    for (const stmt of unpaidStatements) {
      if (remaining <= 0) break;

      const unpaid = Number(stmt.statementBalance) - Number(stmt.paidAmount);
      const toApply = Math.min(remaining, unpaid);

      if (toApply <= 0) continue;

      const newPaidAmount = Number(stmt.paidAmount) + toApply;
      const isPaid = newPaidAmount >= Number(stmt.statementBalance);

      await tx.creditCardStatement.update({
        where: { id: stmt.id },
        data: {
          paidAmount: newPaidAmount,
          isPaid,
        },
      });

      remaining -= toApply;
    }

    if (fromAccountIdTrimmed) {
      await tx.transaction.create({
        data: {
          userId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.POSTED,
          amount,
          financialAccountId: fromAccountIdTrimmed,
          occurredAt,
          postedDate: occurredAt,
          note: expenseNote,
        },
      });
    }

    return paymentTx;
  });

  await recomputeOutstanding(accountId);

  void createActivityLog({
    userId,
    action: "CREDIT_CARD_PAYMENT",
    entityType: "transaction",
    entityId: transaction.id,
    details: {
      accountId,
      amount,
      occurredAt,
      fromAccountId: fromAccountIdTrimmed ?? undefined,
    },
  });

  return transaction;
}
