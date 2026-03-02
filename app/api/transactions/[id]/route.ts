import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  getTransactionById,
  updateTransaction,
  deleteTransaction,
  TransactionType,
} from "@/lib/transactions";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";
import { revalidateTag } from "@/lib/cache";

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

    const txWithInclude = transaction as typeof transaction & {
      transferAccount?: { id: string; name: string } | null;
    };
    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount,
      financialAccountId: transaction.financialAccountId,
      transferAccountId: transaction.transferAccountId ?? null,
      transferAccount: txWithInclude.transferAccount ?? null,
      categoryId: transaction.categoryId,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      postedDate: transaction.postedDate?.toISOString() ?? null,
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
    financialAccountId?: string;
    transferAccountId?: string | null;
    categoryId?: string | null;
    category?: string | null;
    note?: string | null;
    occurredAt?: string;
    status?: string;
    postedDate?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawType = typeof body.type === "string" ? body.type.toUpperCase() : "";
  const validTypes = [
    TransactionType.INCOME,
    TransactionType.EXPENSE,
    TransactionType.TRANSFER,
    TransactionType.PAYMENT,
    TransactionType.INTEREST,
    TransactionType.ADJUSTMENT,
  ];
  const type = validTypes.includes(rawType as (typeof validTypes)[number])
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

  const status =
    body.status === "PENDING"
      ? ("PENDING" as const)
      : body.status === "POSTED"
        ? ("POSTED" as const)
        : body.status === "VOID"
          ? ("VOID" as const)
          : undefined;

  let postedDate: Date | null | undefined;
  if (body.postedDate !== undefined) {
    postedDate = body.postedDate == null ? null : new Date(body.postedDate);
    if (postedDate instanceof Date && Number.isNaN(postedDate.getTime())) {
      postedDate = null;
    }
  } else {
    postedDate = undefined;
  }

  let financialAccountId = body.financialAccountId;
  if (financialAccountId === undefined) {
    const existing = await getTransactionById(userId, id);
    if (existing?.financialAccountId == null) {
      const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);
      financialAccountId = defaultAccount.id;
    }
  }

  const transferAccountId =
    body.transferAccountId !== undefined
      ? body.transferAccountId != null && String(body.transferAccountId).trim() !== ""
        ? String(body.transferAccountId).trim()
        : null
      : undefined;

  try {
    const transaction = await updateTransaction(userId, id, {
      type: type as TransactionType | undefined,
      amount: amountNumber,
      financialAccountId,
      transferAccountId,
      categoryId: body.categoryId,
      category: body.category,
      note: body.note,
      occurredAt,
      status,
      postedDate,
    });

    const amount =
      typeof transaction.amount === "object" && "toNumber" in transaction.amount
        ? (transaction.amount as { toNumber: () => number }).toNumber()
        : Number(transaction.amount);

    const txWithInclude = transaction as typeof transaction & {
      transferAccount?: { id: string; name: string } | null;
    };
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount,
      financialAccountId: transaction.financialAccountId,
      transferAccountId: transaction.transferAccountId ?? null,
      transferAccount: txWithInclude.transferAccount ?? null,
      categoryId: transaction.categoryId,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      postedDate: transaction.postedDate?.toISOString() ?? null,
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
    revalidateTag("transactions", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 },
    );
  }
}
