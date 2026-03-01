import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType, TransactionStatus } from "@prisma/client";

type SessionWithId = { user: { id?: string }; sessionId?: string };

type ImportRow = {
  date: string;
  amount: number;
  description?: string;
};

/**
 * Parse CSV text into rows. Expects columns: date, amount, description (optional).
 */
function parseStatementCsv(text: string): ImportRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerParts = lines[0].split(",").map((c) => c.trim().toLowerCase());
  const dateIdx = headerParts.findIndex((c) => c === "date" || c === "transaction date");
  const amountIdx = headerParts.findIndex((c) => c === "amount" || c === "debit");
  const descIdx = headerParts.findIndex((c) => c === "description" || c === "desc" || c === "memo");

  const useDateIdx = dateIdx >= 0 ? dateIdx : 0;
  const useAmountIdx = amountIdx >= 0 ? amountIdx : 1;

  const rows: ImportRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
    const dateStr = parts[useDateIdx] ?? "";
    const amountStr = parts[useAmountIdx] ?? "0";
    const amount = Number.parseFloat(amountStr.replace(/[^0-9.-]/g, ""));
    if (!dateStr || !Number.isFinite(amount) || amount <= 0) continue;
    rows.push({
      date: dateStr,
      amount,
      description: descIdx >= 0 ? parts[descIdx] : undefined,
    });
  }
  return rows;
}

/**
 * Match imported rows to existing transactions by amount and date window (±3 days).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const account = await prisma.financialAccount.findFirst({
    where: { id, userId },
    select: { type: true },
  });

  if (!account || account.type !== "CREDIT_CARD") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { csv?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) {
    return NextResponse.json({ error: "csv is required" }, { status: 400 });
  }

  const rows = parseStatementCsv(csv);
  if (rows.length === 0) {
    return NextResponse.json({
      matched: [],
      missing: rows,
      duplicates: [],
      unmatched: [],
      message: "No rows parsed from CSV",
    });
  }

  const existingTransactions = await prisma.transaction.findMany({
    where: {
      financialAccountId: id,
      userId,
      status: TransactionStatus.POSTED,
      type: { in: [TransactionType.EXPENSE, TransactionType.INTEREST] },
    },
    select: { id: true, amount: true, occurredAt: true, note: true },
  });

  const matched: { row: ImportRow; transactionId: string }[] = [];
  const missing: ImportRow[] = [];
  const duplicates: ImportRow[] = [];
  const unmatched: ImportRow[] = [];
  const usedTxIds = new Set<string>();

  for (const row of rows) {
    const rowDate = new Date(row.date);
    if (Number.isNaN(rowDate.getTime())) {
      unmatched.push(row);
      continue;
    }

    const dateStart = new Date(rowDate);
    dateStart.setDate(dateStart.getDate() - 3);
    const dateEnd = new Date(rowDate);
    dateEnd.setDate(dateEnd.getDate() + 3);

    const candidates = existingTransactions.filter(
      (tx) =>
        !usedTxIds.has(tx.id) &&
        Number(tx.amount) === row.amount &&
        tx.occurredAt >= dateStart &&
        tx.occurredAt <= dateEnd
    );

    if (candidates.length === 0) {
      missing.push(row);
    } else if (candidates.length === 1) {
      matched.push({ row, transactionId: candidates[0].id });
      usedTxIds.add(candidates[0].id);
    } else {
      duplicates.push(row);
    }
  }

  const unmatchedExisting = existingTransactions.filter((tx) => !usedTxIds.has(tx.id));

  return NextResponse.json({
    matched,
    missing,
    duplicates,
    unmatched: unmatchedExisting.map((tx) => ({
      id: tx.id,
      amount: Number(tx.amount),
      occurredAt: tx.occurredAt.toISOString().slice(0, 10),
      note: tx.note,
    })),
    summary: {
      totalRows: rows.length,
      matchedCount: matched.length,
      missingCount: missing.length,
      duplicatesCount: duplicates.length,
      unmatchedInLedgerCount: unmatchedExisting.length,
    },
  });
}
