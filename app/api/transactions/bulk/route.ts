import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType as PrismaTransactionType } from "@prisma/client";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { revalidateTag } from "@/lib/cache";
import { rebuildBalanceSnapshotsForFinancialAccountIds } from "@/lib/transaction-balance-snapshot";
import {
  MAX_BULK_ROWS,
  collectReferencedAccountIds,
  collectReferencedCategoryIds,
  prepareBulkTransactionRows,
  type BulkAccountInfo,
  type BulkTransactionInput,
} from "@/lib/bulk-transactions";

type SessionWithId = { user: { id?: string }; sessionId?: string };

/**
 * Safety net above the per-row work we actually do inside the transaction.
 * Creation itself is a single `createMany` (one round-trip), so this only needs
 * to cover statement parsing + the write, but we keep generous headroom so a
 * slow shared DB never reproduces the old default-5s timeout 500.
 */
const BULK_TX_TIMEOUT_MS = 30_000;

/** Insert in chunks so a very large batch never exceeds the MySQL max packet size. */
const CREATE_CHUNK_SIZE = 100;

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { transactions?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.transactions)) {
    return NextResponse.json(
      { error: "transactions must be an array" },
      { status: 400 },
    );
  }

  const items = body.transactions as BulkTransactionInput[];

  if (items.length === 0) {
    return NextResponse.json(
      { error: "transactions array is empty" },
      { status: 400 },
    );
  }

  if (items.length > MAX_BULK_ROWS) {
    return NextResponse.json(
      { error: `Too many transactions (max ${MAX_BULK_ROWS})` },
      { status: 400 },
    );
  }

  const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);

  // --- Batch-fetch everything we need ONCE (not per row, not inside the txn) ---
  const referencedAccountIds = collectReferencedAccountIds(items, defaultAccount.id);
  const referencedCategoryIds = collectReferencedCategoryIds(items);

  const [accounts, categories] = await Promise.all([
    prisma.financialAccount.findMany({
      where: { id: { in: referencedAccountIds }, userId },
      select: { id: true, currency: true },
    }),
    referencedCategoryIds.length > 0
      ? prisma.category.findMany({
          where: { id: { in: referencedCategoryIds }, userId },
          select: { id: true, name: true },
        })
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const accountsById = new Map<string, BulkAccountInfo>(
    accounts.map((a) => [a.id, { id: a.id, currency: a.currency }]),
  );
  const categoryNamesById = new Map<string, string>(
    categories.map((c) => [c.id, c.name]),
  );

  // --- Validate + transform (pure, no DB) ---
  const { errors, rows, accountIds } = prepareBulkTransactionRows(items, {
    defaultAccountId: defaultAccount.id,
    accountsById,
    categoryNamesById,
  });

  if (errors.length > 0) {
    return NextResponse.json(
      { error: "Validation failed", errors },
      { status: 400 },
    );
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "No valid transactions to create" },
      { status: 400 },
    );
  }

  try {
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

    // One createMany per chunk inside a single short transaction: O(chunks)
    // round-trips instead of O(rows) — no interactive-transaction timeout risk.
    await prisma.$transaction(
      async (tx) => {
        for (let i = 0; i < createData.length; i += CREATE_CHUNK_SIZE) {
          const slice = createData.slice(i, i + CREATE_CHUNK_SIZE);
          await tx.transaction.createMany({ data: slice });
        }
      },
      { timeout: BULK_TX_TIMEOUT_MS },
    );

    // Snapshots are rebuilt outside the create transaction (each rebuild manages
    // its own short transactions); debit cards with a linked bank are handled there.
    await rebuildBalanceSnapshotsForFinancialAccountIds(userId, accountIds);

    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_IMPORT,
      entityType: "transaction",
      details: {
        source: "bulk-entry",
        createdCount: rows.length,
        totalRows: items.length,
      },
    });

    revalidateTag("transactions", "max");
    revalidateTag("financial-accounts", "max");
    revalidateTag("dashboard-init", "max");

    return NextResponse.json({ createdCount: rows.length });
  } catch (err) {
    // Log the real error so a future failure is diagnosable instead of an opaque 500.
    console.error(
      `[transactions/bulk] failed to create ${rows.length} transactions for user ${userId}:`,
      err,
    );
    return NextResponse.json(
      { error: "Failed to create transactions" },
      { status: 500 },
    );
  }
}
