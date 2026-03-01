import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";
import { recomputeOutstanding } from "./outstanding";

/**
 * Post a PENDING transaction: set status to POSTED.
 * Statement assignment happens when statement is closed.
 */
export async function postTransaction(transactionId: string): Promise<void> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { financialAccount: true },
  });

  if (!tx || tx.status !== TransactionStatus.PENDING) {
    throw new Error("Transaction not found or already posted");
  }

  const postedDate = tx.postedDate ?? new Date();

  await prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status: TransactionStatus.POSTED,
      postedDate,
    },
  });

  if (tx.financialAccountId && tx.financialAccount?.type === "CREDIT_CARD") {
    await recomputeOutstanding(tx.financialAccountId);
  }
}
