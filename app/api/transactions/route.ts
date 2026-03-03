import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getDateRangeInTimezone } from "@/lib/date-range";
import {
  createTransaction,
  TransactionType,
  listTransactionsByUser,
} from "@/lib/transactions";
import { unstable_cache, CACHE_REVALIDATE_SECONDS, cacheKey, revalidateTag } from "@/lib/cache";
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
    transferAccountId?: string | null;
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
      cardAccountType: true,
      cardNetwork: true,
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

  if (type === TransactionType.TRANSFER) {
    const transferAccountId = body.transferAccountId != null ? String(body.transferAccountId).trim() : "";
    if (!transferAccountId) {
      return NextResponse.json(
        { error: "transferAccountId is required for TRANSFER" },
        { status: 400 },
      );
    }
    if (transferAccountId === financialAccountId) {
      return NextResponse.json(
        { error: "transferAccountId must be different from financialAccountId" },
        { status: 400 },
      );
    }
    const toAccount = await prisma.financialAccount.findFirst({
      where: { id: transferAccountId, userId },
      select: { type: true, bankName: true, accountNumber: true },
    });
    if (!toAccount) {
      return NextResponse.json({ error: "Transfer destination account not found" }, { status: 404 });
    }
    if (toAccount.type === "CREDIT_CARD") {
      return NextResponse.json(
        { error: "Cannot transfer to or from a credit card account" },
        { status: 400 },
      );
    }
    if (accountForTx.type === "CREDIT_CARD") {
      return NextResponse.json(
        { error: "Cannot transfer to or from a credit card account" },
        { status: 400 },
      );
    }
    if (isAccountIncomplete(toAccount)) {
      return NextResponse.json(
        {
          error:
            "Transfer destination account is incomplete. Please add bank and account number before using.",
        },
        { status: 400 },
      );
    }
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
        revalidateTag("transactions", "max");
        revalidateTag("financial-accounts", "max");
        revalidateTag("dashboard-init", "max");
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
      transferAccountId:
        type === TransactionType.TRANSFER && body.transferAccountId
          ? body.transferAccountId
          : undefined,
      categoryId: body.categoryId ?? undefined,
      category: body.category ?? undefined,
      note: body.note ?? undefined,
      occurredAt,
      status,
      postedDate,
    });

    let transferAccount: { id: string; name: string } | null = null;
    if (transaction.transferAccountId) {
      const toAcc = await prisma.financialAccount.findUnique({
        where: { id: transaction.transferAccountId },
        select: { id: true, name: true },
      });
      if (toAcc) transferAccount = toAcc;
    }
    revalidateTag("transactions", "max");
    revalidateTag("financial-accounts", "max");
    revalidateTag("dashboard-init", "max");
    return NextResponse.json({
      id: transaction.id,
      type: transaction.type,
      status: transaction.status,
      amount: transaction.amount,
      financialAccountId: transaction.financialAccountId,
      transferAccountId: transaction.transferAccountId ?? null,
      transferAccount,
      categoryId: transaction.categoryId,
      category: transaction.category,
      note: transaction.note,
      occurredAt: transaction.occurredAt.toISOString(),
      postedDate: transaction.postedDate?.toISOString() ?? null,
      createdAt: transaction.createdAt.toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to create transaction";
    return NextResponse.json(
      { error: msg },
      { status: 500 },
    );
  }
}

type SerializableTransaction = {
  id: string;
  type: string;
  status: string;
  amount: number;
  financialAccountId: string | null;
  financialAccount: { id: string; name: string } | null;
  transferAccountId: string | null;
  transferAccount: { id: string; name: string } | null;
  categoryId: string | null;
  categoryRef: { id: string; name: string } | null;
  category: string | null;
  note: string | null;
  occurredAt: string;
  postedDate: string | null;
  createdAt: string;
};

async function fetchTransactionsList(
  userId: string,
  fromParam: string | undefined,
  toParam: string | undefined,
  dateParam: string | undefined,
  timezone: string,
  typeParam: string | undefined,
  financialAccountId: string | undefined,
  categoryId: string | undefined,
  searchParam: string | undefined,
  limit: number,
  offset: number,
): Promise<SerializableTransaction[]> {
  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (dateParam) {
    const range = getDateRangeInTimezone(dateParam, timezone);
    if (range) {
      fromDate = range.from;
      toDate = range.to;
    }
  } else {
    if (fromParam) {
      const range = getDateRangeInTimezone(fromParam, timezone);
      if (range) fromDate = range.from;
    }
    if (toParam) {
      const range = getDateRangeInTimezone(toParam, timezone);
      if (range) toDate = range.to;
    }
  }

  let typeFilter: (typeof VALID_TYPES)[number] | undefined;
  if (typeParam) {
    const upper = typeParam.toUpperCase();
    if (VALID_TYPES.includes(upper as (typeof VALID_TYPES)[number])) {
      typeFilter = upper as (typeof VALID_TYPES)[number];
    }
  }

  const transactions = await listTransactionsByUser(userId, {
    from: fromDate,
    to: toDate,
    type: typeFilter,
    financialAccountId,
    categoryId,
    search: searchParam,
    limit,
    offset,
  });

  type TxItem = (typeof transactions)[number];
  return transactions.map((t: TxItem) => {
    const tx = t as TxItem & {
      financialAccount?: { id: string; name: string } | null;
      transferAccount?: { id: string; name: string } | null;
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
      financialAccount: tx.financialAccount ?? null,
      transferAccountId: tx.transferAccountId ?? null,
      transferAccount: tx.transferAccount ?? null,
      categoryId: tx.categoryId,
      categoryRef: tx.categoryRef ?? null,
      category: tx.category,
      note: tx.note,
      occurredAt: tx.occurredAt.toISOString(),
      postedDate: tx.postedDate?.toISOString() ?? null,
      createdAt: tx.createdAt.toISOString(),
    };
  });
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
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const typeParam = searchParams.get("type") ?? undefined;
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;
  const categoryIdParam = searchParams.get("categoryId") ?? undefined;
  const searchParam = searchParams.get("search") ?? undefined;
  const limitParam = searchParams.get("limit");
  const offsetParam = searchParams.get("offset");

  const limit = Math.min(
    limitParam ? Number.parseInt(limitParam, 10) || DEFAULT_LIMIT : DEFAULT_LIMIT,
    MAX_LIMIT,
  );
  const offset = offsetParam ? Number.parseInt(offsetParam, 10) || 0 : 0;

  try {
    const getCached = unstable_cache(
      (
        uid: string,
        from: string | undefined,
        to: string | undefined,
        date: string | undefined,
        tz: string,
        type: string | undefined,
        accId: string | undefined,
        catId: string | undefined,
        search: string | undefined,
        lim: number,
        off: number,
      ) => fetchTransactionsList(uid, from, to, date, tz, type, accId, catId, search, lim, off),
      cacheKey(
        "transactions-list",
        userId,
        fromParam ?? "",
        toParam ?? "",
        dateParam ?? "",
        timezoneParam,
        typeParam ?? "",
        financialAccountIdParam ?? "",
        categoryIdParam ?? "",
        searchParam ?? "",
        String(limit),
        String(offset),
      ),
      { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] },
    );
    const data = await getCached(
      userId,
      fromParam,
      toParam,
      dateParam,
      timezoneParam,
      typeParam,
      financialAccountIdParam,
      categoryIdParam,
      searchParam,
      limit,
      offset,
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to load transactions" },
      { status: 500 },
    );
  }
}

