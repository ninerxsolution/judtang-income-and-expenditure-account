import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/transactions";
import type { TransactionType as PrismaTransactionType } from "@prisma/client";
import { serializeTransactionsToCsv } from "@/lib/transactions-csv";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const typeParam = searchParams.get("type") ?? undefined;
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;

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

  let typeFilter: string | undefined;
  if (typeParam) {
    const upper = typeParam.toUpperCase();
    if (
      upper !== TransactionType.INCOME &&
      upper !== TransactionType.EXPENSE &&
      upper !== TransactionType.TRANSFER
    ) {
      return NextResponse.json(
        { error: "type must be INCOME, EXPENSE, or TRANSFER" },
        { status: 400 },
      );
    }
    typeFilter = upper;
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        ...(fromDate || toDate
          ? {
              occurredAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
        ...(typeFilter ? { type: typeFilter as PrismaTransactionType } : {}),
        ...(financialAccountIdParam ? { financialAccountId: financialAccountIdParam } : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });

    const csv = serializeTransactionsToCsv(transactions);
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const filename = `transactions-${yyyy}${mm}${dd}.csv`;

    let accountName: string | undefined;
    if (financialAccountIdParam) {
      const account = await prisma.financialAccount.findUnique({
        where: { id: financialAccountIdParam },
        select: { name: true },
      });
      accountName = account?.name;
    }

    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_EXPORT,
      entityType: "transaction",
      details: {
        rowCount: transactions.length,
        hasFilter: Boolean(fromDate || toDate || typeFilter || financialAccountIdParam),
        from: fromDate?.toISOString() ?? null,
        to: toDate?.toISOString() ?? null,
        type: typeFilter ?? null,
        financialAccountId: financialAccountIdParam ?? null,
        accountName,
      },
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to export transactions" },
      { status: 500 },
    );
  }
}

