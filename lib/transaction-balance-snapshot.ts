import { AccountType, Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ledgerNetChangeForAccount } from "@/lib/transaction-ledger-delta";

type LedgerRow = {
  id: string;
  userId: string;
  type: string;
  status: string;
  amount: Prisma.Decimal;
  financialAccountId: string | null;
  transferAccountId: string | null;
  transferLeg: string | null;
  occurredAt: Date;
  createdAt: Date;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function notVoidWhere(): Prisma.TransactionWhereInput {
  return { status: { not: TransactionStatus.VOID } };
}

async function loadAccountForSnapshot(accountId: string, userId: string) {
  return prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
    select: {
      type: true,
      cardAccountType: true,
      linkedAccountId: true,
      initialBalance: true,
    },
  });
}

/**
 * Rebuilds stored running-balance columns for every transaction row that touches this ledger account.
 * Call after create/update/delete so snapshots stay aligned with list order (occurredAt, createdAt, id).
 */
export async function rebuildBalanceSnapshotsForLedgerAccount(
  userId: string,
  ledgerAccountId: string,
): Promise<void> {
  const acc = await loadAccountForSnapshot(ledgerAccountId, userId);
  if (!acc) return;

  const isDebit =
    acc.type === "CREDIT_CARD" &&
    acc.cardAccountType?.toLowerCase() === "debit" &&
    Boolean(acc.linkedAccountId?.trim());
  if (isDebit) {
    await rebuildDebitCardLinkedSnapshots(userId, ledgerAccountId, acc.linkedAccountId!);
    return;
  }
  if (acc.type === "CREDIT_CARD") {
    await rebuildCreditSnapshotsForCard(userId, ledgerAccountId);
    return;
  }
  await rebuildAssetSnapshotsForLedger(userId, ledgerAccountId);
}

export async function rebuildBalanceSnapshotsForFinancialAccountIds(
  userId: string,
  rawAccountIds: readonly string[],
): Promise<void> {
  const seen = new Set<string>();
  for (const id of rawAccountIds) {
    const trimmed = id?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    await rebuildBalanceSnapshotsForLedgerAccount(userId, trimmed);
  }
}

async function rebuildAssetSnapshotsForLedger(userId: string, ledgerAccountId: string): Promise<void> {
  const acc = await prisma.financialAccount.findFirst({
    where: { id: ledgerAccountId, userId },
    select: { initialBalance: true },
  });
  if (!acc) return;

  const rows =
    (await prisma.transaction.findMany({
      where: {
        userId,
        ...notVoidWhere(),
        OR: [{ financialAccountId: ledgerAccountId }, { transferAccountId: ledgerAccountId }],
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        amount: true,
        financialAccountId: true,
        transferAccountId: true,
        transferLeg: true,
        occurredAt: true,
        createdAt: true,
      },
    })) ?? [];

  let running = roundMoney(Number(acc.initialBalance ?? 0));
  const patches = new Map<string, { accountBalanceAfter?: number; transferAccountBalanceAfter?: number }>();

  for (const row of rows) {
    const r = row as LedgerRow;
    const delta = ledgerNetChangeForAccount(r, ledgerAccountId);
    running = roundMoney(running + delta);

    if (r.financialAccountId === ledgerAccountId) {
      const prev = patches.get(r.id) ?? {};
      patches.set(r.id, { ...prev, accountBalanceAfter: running });
    }
    if (r.transferAccountId === ledgerAccountId) {
      const prev = patches.get(r.id) ?? {};
      patches.set(r.id, { ...prev, transferAccountBalanceAfter: running });
    }
  }

  await flushPatches(patches);
  await rebuildDebitSnapshotsForCardsLinkedToBank(userId, ledgerAccountId);
}

/**
 * Debit-card postings use `financialAccountId` / `transferAccountId` on the card, while
 * `getAccountBalance` for that card follows the linked bank pool. Rebuild snapshots on card
 * legs using the bank's initial balance plus combined deltas on both the card and linked bank.
 */
async function rebuildDebitCardLinkedSnapshots(
  userId: string,
  debitCardId: string,
  linkedBankId: string,
): Promise<void> {
  const bank = await prisma.financialAccount.findFirst({
    where: { id: linkedBankId, userId },
    select: { initialBalance: true },
  });
  if (!bank) return;

  const rows =
    (await prisma.transaction.findMany({
      where: {
        userId,
        ...notVoidWhere(),
        OR: [
          { financialAccountId: debitCardId },
          { transferAccountId: debitCardId },
          { financialAccountId: linkedBankId },
          { transferAccountId: linkedBankId },
        ],
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        amount: true,
        financialAccountId: true,
        transferAccountId: true,
        transferLeg: true,
        occurredAt: true,
        createdAt: true,
      },
    })) ?? [];

  let running = roundMoney(Number(bank.initialBalance ?? 0));
  const patches = new Map<string, { accountBalanceAfter?: number; transferAccountBalanceAfter?: number }>();

  for (const row of rows) {
    const r = row as LedgerRow;
    const delta =
      ledgerNetChangeForAccount(r, debitCardId) + ledgerNetChangeForAccount(r, linkedBankId);
    running = roundMoney(running + delta);

    if (r.financialAccountId === debitCardId) {
      const prev = patches.get(r.id) ?? {};
      patches.set(r.id, { ...prev, accountBalanceAfter: running });
    }
    if (r.transferAccountId === debitCardId) {
      const prev = patches.get(r.id) ?? {};
      patches.set(r.id, { ...prev, transferAccountBalanceAfter: running });
    }
  }

  await flushPatches(patches);
}

async function rebuildDebitSnapshotsForCardsLinkedToBank(userId: string, bankId: string): Promise<void> {
  const linked = await prisma.financialAccount.findMany({
    where: {
      userId,
      linkedAccountId: bankId,
      type: AccountType.CREDIT_CARD,
    },
    select: { id: true, cardAccountType: true },
  });
  for (const row of linked) {
    if (row.cardAccountType?.toLowerCase() !== "debit") continue;
    await rebuildDebitCardLinkedSnapshots(userId, row.id, bankId);
  }
}

async function rebuildCreditSnapshotsForCard(userId: string, cardId: string): Promise<void> {
  const rows =
    (await prisma.transaction.findMany({
      where: {
        userId,
        financialAccountId: cardId,
        status: TransactionStatus.POSTED,
        type: {
          in: [
            TransactionType.EXPENSE,
            TransactionType.INTEREST,
            TransactionType.PAYMENT,
            TransactionType.ADJUSTMENT,
            TransactionType.INCOME,
          ],
        },
      },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        amount: true,
        financialAccountId: true,
        transferAccountId: true,
        transferLeg: true,
        occurredAt: true,
        createdAt: true,
      },
    })) ?? [];

  let running = 0;
  const patches = new Map<string, { accountBalanceAfter?: number; transferAccountBalanceAfter?: number }>();

  for (const row of rows) {
    const r = row as LedgerRow;
    const delta = ledgerNetChangeForAccount(r, cardId);
    running = roundMoney(running + delta);
    if (r.financialAccountId === cardId) {
      const prev = patches.get(r.id) ?? {};
      patches.set(r.id, { ...prev, accountBalanceAfter: running });
    }
  }

  await flushPatches(patches);
}

async function flushPatches(
  patches: Map<string, { accountBalanceAfter?: number; transferAccountBalanceAfter?: number }>,
): Promise<void> {
  if (patches.size === 0) return;
  const chunkSize = 25;
  const entries = [...patches.entries()];
  for (let i = 0; i < entries.length; i += chunkSize) {
    const slice = entries.slice(i, i + chunkSize);
    // Use interactive transactions: Prisma driver adapters (MariaDB) can mis-handle
    // `$transaction([...])` batch form; sequential updates inside one callback is reliable.
    await prisma.$transaction(
      async (tx) => {
        for (const [id, data] of slice) {
          const assignments: Prisma.Sql[] = [];
          if (data.accountBalanceAfter !== undefined) {
            assignments.push(
              Prisma.sql`\`accountBalanceAfter\` = ${data.accountBalanceAfter}`,
            );
          }
          if (data.transferAccountBalanceAfter !== undefined) {
            assignments.push(
              Prisma.sql`\`transferAccountBalanceAfter\` = ${data.transferAccountBalanceAfter}`,
            );
          }
          if (assignments.length === 0) {
            continue;
          }
          // Raw SQL avoids Prisma-client schema drift failures (Unknown argument ...),
          // while keeping values parameterized.
          await tx.$executeRaw(
            Prisma.sql`
              UPDATE \`Transaction\`
              SET ${Prisma.join(assignments, ", ")}
              WHERE \`id\` = ${id}
            `,
          );
        }
      },
      { timeout: 60_000 },
    );
  }
}

export function collectFinancialAccountIdsForSnapshotRefresh(params: {
  financialAccountId: string | null | undefined;
  transferAccountId?: string | null | undefined;
}): string[] {
  const out: string[] = [];
  const a = params.financialAccountId?.trim();
  if (a) out.push(a);
  const b = params.transferAccountId?.trim();
  if (b) out.push(b);
  return out;
}
