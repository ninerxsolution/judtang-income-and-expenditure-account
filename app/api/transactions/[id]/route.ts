import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  TransactionType,
} from "@/lib/transactions";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const transaction = await getTransactionById(userId, id);
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const amount =
      typeof transaction.amount === "object" && "toNumber" in transaction.amount
        ? (transaction.amount as { toNumber: () => number }).toNumber()
        : Number(transaction.amount);

    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      amount,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load transaction" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: {
    type?: string;
    amount?: number;
    category?: string | null;
    note?: string | null;
    occurredAt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawType = typeof body.type === "string" ? body.type.toUpperCase() : "";
  const type =
    rawType === TransactionType.INCOME || rawType === TransactionType.EXPENSE
      ? rawType
      : undefined;

  const amountNumber =
    body.amount != null
      ? typeof body.amount === "number"
        ? body.amount
        : Number.parseFloat(String(body.amount))
      : undefined;

  if (amountNumber !== undefined && (!Number.isFinite(amountNumber) || amountNumber <= 0)) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 },
    );
  }

  let occurredAt: Date | undefined;
  if (body.occurredAt) {
    const parsed = new Date(body.occurredAt);
    if (!Number.isNaN(parsed.getTime())) {
      occurredAt = parsed;
    }
  }

  try {
    const transaction = await updateTransaction(userId, id, {
      type: type as TransactionType | undefined,
      amount: amountNumber,
      category: body.category,
      note: body.note,
      occurredAt,
    });

    const amount =
      typeof transaction.amount === "object" && "toNumber" in transaction.amount
        ? (transaction.amount as { toNumber: () => number }).toNumber()
        : Number(transaction.amount);

    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      amount,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "Transaction not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to update transaction" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const deleted = await deleteTransaction(userId, id);
    if (!deleted) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
