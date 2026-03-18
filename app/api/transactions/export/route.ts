import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDateRangeInTimezone } from "@/lib/date-range";
import { TransactionType } from "@/lib/transactions";
import type { TransactionType as PrismaTransactionType } from "@prisma/client";
import { serializeTransactionsToCsv } from "@/lib/transactions-csv";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { buildStatementPdfData } from "@/lib/statement-pdf-data";
import { renderStatementPdf } from "@/lib/statement-pdf";

type SessionWithId = { user: { id?: string }; sessionId?: string };

export async function GET(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const formatParam = (searchParams.get("format") ?? "csv").toLowerCase();
  const fromParam = searchParams.get("from") ?? undefined;
  const toParam = searchParams.get("to") ?? undefined;
  const timezoneParam = searchParams.get("timezone") ?? "Asia/Bangkok";
  const typeParam = searchParams.get("type") ?? undefined;
  const financialAccountIdParam = searchParams.get("financialAccountId") ?? undefined;
  const localeParam = searchParams.get("locale") ?? "th";

  let fromDate: Date | undefined;
  let toDate: Date | undefined;

  if (fromParam) {
    const range = getDateRangeInTimezone(fromParam, timezoneParam);
    if (range) fromDate = range.from;
  }

  if (toParam) {
    const range = getDateRangeInTimezone(toParam, timezoneParam);
    if (range) toDate = range.to;
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

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");

  if (formatParam === "pdf") {
    try {
      const data = await buildStatementPdfData({
        userId,
        fromDate,
        toDate,
        typeFilter,
        financialAccountId: financialAccountIdParam,
        locale: localeParam === "en" ? "en" : "th",
      });

      const buffer = await renderStatementPdf(data);
      const filename = `statement-${yyyy}${mm}${dd}.pdf`;

      // NextResponse expects BodyInit; Buffer works at runtime but convert for type safety
      const body = new Uint8Array(buffer);

      let accountName: string | undefined;
      if (financialAccountIdParam) {
        accountName = data.account?.name;
      }

      void createActivityLog({
        userId,
        action: ActivityLogAction.TRANSACTION_EXPORT,
        entityType: "transaction",
        details: {
          format: "pdf",
          rowCount: data.transactions.length,
          hasFilter: Boolean(fromDate || toDate || typeFilter || financialAccountIdParam),
          from: fromDate?.toISOString() ?? null,
          to: toDate?.toISOString() ?? null,
          type: typeFilter ?? null,
          financialAccountId: financialAccountIdParam ?? null,
          accountName,
        },
      });

      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("PDF export failed:", err);
      return NextResponse.json(
        { error: "Failed to export PDF" },
        { status: 500 },
      );
    }
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
        ...(financialAccountIdParam
          ? {
              OR: [
                { financialAccountId: financialAccountIdParam },
                { transferAccountId: financialAccountIdParam },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    });

    const csv = serializeTransactionsToCsv(transactions);
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

