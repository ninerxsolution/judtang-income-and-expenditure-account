import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  createTransaction,
  TransactionType,
  listTransactionsByUser,
} from "@/lib/transactions";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    typeof body.amount === "number"
      ? body.amount
      : Number.parseFloat(String(body.amount ?? ""));

  if (!type) {
    return NextResponse.json(
      { error: "type must be INCOME or EXPENSE" },
      { status: 400 },
    );
  }

  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return NextResponse.json(
      { error: "amount must be a positive number" },
      { status: 400 },
    );
  }

  let occurredAt = new Date();
  if (body.occurredAt) {
    const parsed = new Date(body.occurredAt);
    if (!Number.isNaN(parsed.getTime())) {
      occurredAt = parsed;
    }
  }

  try {
    const transaction = await createTransaction({
      userId,
      type,
      amount: amountNumber,
      category: body.category ?? undefined,
      note: body.note ?? undefined,
      occurredAt,
    });

    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(
    limitParam ? Number.parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) || 0 : 0;

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (fromParam) {
    const d = new Date(fromParam);
    if (!Number.isNaN(d.getTime())) {
      fromDate = d;
    }
  }
  if (toParam) {
    const d = new Date(toParam);
    if (!Number.isNaN(d.getTime())) {
      toDate = d;
    }
  }

  try {
    const transactions = await listTransactionsByUser(userId, {
      from: fromDate,
      to: toDate,
      limit,
      offset,
    });

    const data = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      category: t.category,
      note: t.note,
      occurredAt: t.occurredAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 },
    );
  }
}

