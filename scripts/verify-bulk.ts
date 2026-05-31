/**
 * Throwaway verification for POST /api/transactions/bulk's real DB path.
 *
 * Creates a temporary user + accounts + category, runs the exact orchestration
 * the route uses (batch-fetch -> prepareBulkTransactionRows -> createMany in a
 * transaction -> snapshot rebuild) with ~140 rows, asserts it completes well
 * under the old 5s interactive-transaction timeout, then deletes everything.
 *
 * Run: npx tsx scripts/verify-bulk.ts
 */
import "../prisma/load-env";
import { prisma } from "../lib/prisma";
import { TransactionStatus, TransactionType as PrismaTransactionType } from "@prisma/client";
import {
  collectReferencedAccountIds,
  collectReferencedCategoryIds,
  prepareBulkTransactionRows,
  type BulkAccountInfo,
  type BulkTransactionInput,
} from "../lib/bulk-transactions";
import { rebuildBalanceSnapshotsForFinancialAccountIds } from "../lib/transaction-balance-snapshot";

const CREATE_CHUNK_SIZE = 100;
const MARK = `__bulk_verify_${Date.now()}`;

async function main() {
  let userId = "";
  try {
    // --- Setup throwaway data ---
    const user = await prisma.user.create({
      data: { email: `${MARK}@example.com`, name: "Bulk Verify" },
      select: { id: true },
    });
    userId = user.id;

    const accA = await prisma.financialAccount.create({
      data: { userId, name: "Verify A", type: "BANK", initialBalance: 1000, isDefault: true, currency: "THB" },
      select: { id: true },
    });
    const accB = await prisma.financialAccount.create({
      data: { userId, name: "Verify B", type: "BANK", initialBalance: 500, currency: "THB" },
      select: { id: true },
    });
    const cat = await prisma.category.create({
      data: { userId, name: "Verify Cat" },
      select: { id: true },
    });

    // --- Build ~140 rows across 28 days (mix EXPENSE / INCOME / TRANSFER) ---
    const inputs: BulkTransactionInput[] = [];
    for (let day = 1; day <= 28; day++) {
      for (let k = 0; k < 5; k++) {
        const occurredAt = new Date(Date.UTC(2099, 0, day, 5, k, 0)).toISOString();
        if (k === 4) {
          inputs.push({
            type: "TRANSFER",
            amount: 100 + k,
            financialAccountId: accA.id,
            transferAccountId: accB.id,
            occurredAt,
            note: MARK,
          });
        } else {
          inputs.push({
            type: k % 2 === 0 ? "EXPENSE" : "INCOME",
            amount: 10 + k,
            financialAccountId: accA.id,
            categoryId: cat.id,
            occurredAt,
            note: MARK,
          });
        }
      }
    }
    console.log(`[verify] built ${inputs.length} rows`);

    // --- Replicate the route orchestration exactly ---
    const referencedAccountIds = collectReferencedAccountIds(inputs, accA.id);
    const referencedCategoryIds = collectReferencedCategoryIds(inputs);

    const [accounts, categories] = await Promise.all([
      prisma.financialAccount.findMany({
        where: { id: { in: referencedAccountIds }, userId },
        select: { id: true, currency: true },
      }),
      prisma.category.findMany({
        where: { id: { in: referencedCategoryIds }, userId },
        select: { id: true, name: true },
      }),
    ]);
    const accountsById = new Map<string, BulkAccountInfo>(
      accounts.map((a) => [a.id, { id: a.id, currency: a.currency }]),
    );
    const categoryNamesById = new Map<string, string>(categories.map((c) => [c.id, c.name]));

    const { errors, rows, accountIds } = prepareBulkTransactionRows(inputs, {
      defaultAccountId: accA.id,
      accountsById,
      categoryNamesById,
    });
    if (errors.length > 0) {
      throw new Error(`prepare returned ${errors.length} errors: ${JSON.stringify(errors.slice(0, 3))}`);
    }

    const createData = rows.map((r) => ({
      userId,
      type: r.type as PrismaTransactionType,
      status: TransactionStatus.POSTED,
      amount: r.amount,
      currency: r.currency,
      exchangeRate: r.exchangeRate,
      baseAmount: r.baseAmount,
      financialAccountId: r.financialAccountId,
      transferAccountId: r.transferAccountId ?? null,
      categoryId: r.categoryId,
      category: r.category,
      note: r.note,
      occurredAt: r.occurredAt,
      postedDate: r.postedDate,
    }));

    const t0 = Date.now();
    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < createData.length; i += CREATE_CHUNK_SIZE) {
          await tx.transaction.createMany({ data: createData.slice(i, i + CREATE_CHUNK_SIZE) });
        }
      },
      { timeout: 30_000 },
    );
    const tCreate = Date.now() - t0;

    const t1 = Date.now();
    await rebuildBalanceSnapshotsForFinancialAccountIds(userId, accountIds);
    const tSnap = Date.now() - t1;

    // --- Assertions ---
    const created = await prisma.transaction.count({ where: { userId, note: MARK } });
    const withSnap = await prisma.transaction.count({
      where: { userId, note: MARK, accountBalanceAfter: { not: null } },
    });

    console.log(`[verify] createMany: ${tCreate}ms  snapshotRebuild: ${tSnap}ms`);
    console.log(`[verify] expected ${rows.length}, created ${created}, withSnapshot ${withSnap}`);

    const ok =
      created === rows.length &&
      withSnap > 0 &&
      tCreate < 5000; // old default interactive-txn timeout — must be comfortably under
    console.log(ok ? "[verify] RESULT: PASS ✅" : "[verify] RESULT: FAIL ❌");
    if (!ok) process.exitCode = 1;
  } catch (e) {
    console.log("[verify] ERROR:", e instanceof Error ? e.message.split("\n")[0] : e);
    process.exitCode = 1;
  } finally {
    // --- Full teardown (never leave test data behind) ---
    if (userId) {
      await prisma.transaction.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.financialAccount.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.category.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
      console.log("[verify] teardown complete");
    }
    await prisma.$disconnect();
  }
}

void main();
