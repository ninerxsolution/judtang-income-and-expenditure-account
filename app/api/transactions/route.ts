import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import {
  createTransaction,
  TransactionType,
  listTransactionsByUser,
} from "@/lib/transactions";
import {
  ensureUserHasDefaultFinancialAccount,
  isAccountIncomplete,
} from "@/lib/financial-accounts";
import { recordPayment } from "@/lib/credit-card";
import { prisma } from "@/lib/prisma";

type SessionWithId = { user: { id?: string }; sessionId?: string };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const VALID_TYPES = [
  TransactionType.INCOME,
  TransactionType.EXPENSE,
  TransactionType.TRANSFER,
  TransactionType.PAYMENT,
  TransactionType.INTEREST,
  TransactionType.ADJUSTMENT,
] as const;

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    type?: string;
    amount?: number;
    financialAccountId?: string;
    categoryId?: string | null;
    category?: string | null;
    note?: string | null;
    occurredAt?: string;
    status?: string;
    postedDate?: string;
    fromAccountId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawType = typeof body.type === "string" ? body.type.toUpperCase() : "";
  const type = VALID_TYPES.includes(rawType as (typeof VALID_TYPES)[number])
    ? rawType
    : undefined;

  const amountNumber =
    typeof body.amount === "number"
      ? body.amount
      : Number.parseFloat(String(body.amount ?? ""));

  if (!type) {
    return NextResponse.json(
      { error: "type must be INCOME, EXPENSE, TRANSFER, PAYMENT, INTEREST, or ADJUSTMENT" },
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

  let financialAccountId = body.financialAccountId;
  if (!financialAccountId) {
    const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);
    financialAccountId = defaultAccount.id;
  }

  const accountForTx = await prisma.financialAccount.findFirst({
    where: { id: financialAccountId, userId },
    select: {
      type: true,
      bankName: true,
      accountNumber: true,
      creditLimit: true,
      interestRate: true,
      cardType: true,
    },
  });
  if (!accountForTx) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }
  if (isAccountIncomplete(accountForTx)) {
    return NextResponse.json(
      {
        error:
          "Account is incomplete. Please add bank and account number before using.",
      },
      { status: 400 }
    );
  }

  if (type === TransactionType.PAYMENT && financialAccountId) {
    if (accountForTx.type === "CREDIT_CARD") {
      try {
        const transaction = await recordPayment({
          userId,
          accountId: financialAccountId,
          amount: amountNumber,
          occurredAt,
          fromAccountId: body.fromAccountId,
          note: body.note ?? undefined,
        });
        return NextResponse.json({
          id: transaction.id,
          type: transaction.type,
          amount: transaction.amount,
          financialAccountId: transaction.financialAccountId,
          categoryId: transaction.categoryId,
          category: transaction.category,
          note: transaction.note,
          occurredAt: transaction.occurredAt.toISOString(),
          createdAt: transaction.createdAt.toISOString(),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to record payment";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }
  }

  const status =
    body.status === "PENDING" ? ("PENDING" as const) : ("POSTED" as const);
  let postedDate: Date | undefined;
  if (body.postedDate) {
    const d = new Date(body.postedDate);
    if (!Number.isNaN(d.getTime())) {
      postedDate = d;
    }
  }

  try {
    const transaction = await createTransaction({
      userId,
      type: type as TransactionType,
      amount: amountNumber,
      financialAccountId,
      categoryId: body.categoryId ?? undefined,
      category: body.category ?? undefined,
      note: body.note ?? undefined,
      occurredAt,
      status,
      postedDate,
    });

    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      financialAccountId: transaction.financialAccountId,
      categoryId: transaction.categoryId,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      postedDate: transaction.postedDate?.toISOString() ?? null,
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
  const dateParam = searchParams.get("date") ?? undefined;
  const typeParam = searchParams.get("type") ?? undefined;
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(
    limitParam ? Number.parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) || 0 : 0;

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (dateParam) {
    const d = new Date(dateParam);
    if (!Number.isNaN(d.getTime())) {
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      fromDate = start;
      toDate = end;
    }
  } else {
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
  }

  let typeFilter: (typeof VALID_TYPES)[number] | undefined;
  if (typeParam) {
    const upper = typeParam.toUpperCase();
    if (VALID_TYPES.includes(upper as (typeof VALID_TYPES)[number])) {
      typeFilter = upper as (typeof VALID_TYPES)[number];
    }
  }

  try {
    const transactions = await listTransactionsByUser(userId, {
      from: fromDate,
      to: toDate,
      type: typeFilter,
      financialAccountId: financialAccountIdParam,
      limit,
      offset,
    });

    const data = transactions.map((t) => {
      const tx = t as typeof t & {
        financialAccount?: { id: string; name: string } | null;
        categoryRef?: { id: string; name: string } | null;
      };
      return {
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount:
          typeof tx.amount === "object" && tx.amount != null && "toNumber" in tx.amount
            ? (tx.amount as { toNumber: () => number }).toNumber()
            : Number(tx.amount),
        financialAccountId: tx.financialAccountId,
        financialAccount: tx.financialAccount,
        categoryId: tx.categoryId,
        categoryRef: tx.categoryRef,
        category: tx.category,
        note: tx.note,
        occurredAt: tx.occurredAt.toISOString(),
        postedDate: tx.postedDate?.toISOString() ?? null,
        createdAt: tx.createdAt.toISOString(),
      };
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 },
    );
  }
}

