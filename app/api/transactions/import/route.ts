import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TransactionType } from "@/lib/transactions";
import type { TransactionType as PrismaTransactionType } from "@prisma/client";
import {
  parseTransactionsCsv,
  type ParsedTransactionCsvRow,
} from "@/lib/transactions-csv";
import { createActivityLog, ActivityLogAction } from "@/lib/activity-log";
import { ensureUserHasDefaultFinancialAccount } from "@/lib/financial-accounts";

async function findOrCreateCategoryByName(
  tx: Pick<typeof prisma, "category">,
  userId: string,
  name: string
): Promise<string | null> {
  if (!name.trim()) return null;
  const trimmed = name.trim();
  let cat = await tx.category.findUnique({
    where: { userId_name: { userId, name: trimmed } },
  });
  if (!cat) {
    cat = await tx.category.create({
      data: { userId, name: trimmed },
    });
  }
  return cat.id;
}

type SessionWithId = { user: { id?: string }; sessionId?: string };

type ImportError = {
  row: number;
  message: string;
};

type ValidTransactionRow = {
  rowNumber: number;
  id: string | null;
  type: (typeof TransactionType)[keyof typeof TransactionType];
  amount: number;
  financialAccountId: string | null;
  transferAccountId: string | null;
  categoryId: string | null;
  category: string | null;
  note: string | null;
  occurredAt: Date;
};

const MAX_IMPORT_ROWS = 10_000;
const MAX_IMPORT_TEXT_BYTES = 2 * 1024 * 1024; // ~2MB

async function readCsvFromRequest(request: Request): Promise<string | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return null;
    }
    if (file.size > MAX_IMPORT_TEXT_BYTES) {
      throw new Error("File is too large");
    }
    return file.text();
  }

  const text = await request.text();
  if (!text.trim()) {
    return null;
  }
  if (text.length > MAX_IMPORT_TEXT_BYTES) {
    throw new Error("File is too large");
  }
  return text;
}

function validateParsedRows(rows: ParsedTransactionCsvRow[]): {
  valid: ValidTransactionRow[];
  errors: ImportError[];
} {
  const errors: ImportError[] = [];
  const valid: ValidTransactionRow[] = [];

  for (const row of rows) {
    const { rowNumber, values } = row;
    const idRaw = values.id?.trim() ?? "";
    const typeRaw = (values.type ?? "").trim().toUpperCase();
    const amountRaw = (values.amount ?? "").trim();
    const categoryRaw = (values.category ?? "").trim();
    const noteRaw = (values.note ?? "").trim();
    const occurredAtRaw = (values.occurredAt ?? "").trim();
    const financialAccountIdRaw = (values.financialAccountId ?? "").trim();
    const transferAccountIdRaw = (values.transferAccountId ?? "").trim();
    const categoryIdRaw = (values.categoryId ?? "").trim();

    if (!typeRaw) {
      errors.push({ row: rowNumber, message: "type is required" });
      continue;
    }
    if (
      typeRaw !== TransactionType.INCOME &&
      typeRaw !== TransactionType.EXPENSE &&
      typeRaw !== TransactionType.TRANSFER
    ) {
      errors.push({
        row: rowNumber,
        message: "type must be INCOME, EXPENSE, or TRANSFER",
      });
      continue;
    }

    if (!amountRaw) {
      errors.push({ row: rowNumber, message: "amount is required" });
      continue;
    }
    const amountNumber = Number.parseFloat(amountRaw.replace(/,/g, ""));
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      errors.push({
        row: rowNumber,
        message: "amount must be a positive number",
      });
      continue;
    }

    if (!occurredAtRaw) {
      errors.push({ row: rowNumber, message: "occurredAt is required" });
      continue;
    }
    const occurredAt = new Date(occurredAtRaw);
    if (Number.isNaN(occurredAt.getTime())) {
      errors.push({
        row: rowNumber,
        message: "occurredAt must be a valid date",
      });
      continue;
    }

    const category = categoryRaw.length > 0 ? categoryRaw : null;
    const note = noteRaw.length > 0 ? noteRaw : null;
    const financialAccountId =
      financialAccountIdRaw.length > 0 ? financialAccountIdRaw : null;
    const transferAccountId =
      transferAccountIdRaw.length > 0 ? transferAccountIdRaw : null;
    const categoryId = categoryIdRaw.length > 0 ? categoryIdRaw : null;

    if (typeRaw === TransactionType.TRANSFER) {
      if (!transferAccountId) {
        errors.push({
          row: rowNumber,
          message: "transferAccountId is required for TRANSFER",
        });
        continue;
      }
      if (financialAccountId && transferAccountId === financialAccountId) {
        errors.push({
          row: rowNumber,
          message: "transferAccountId must be different from financialAccountId",
        });
        continue;
      }
    }

    valid.push({
      rowNumber,
      id: idRaw || null,
      type: typeRaw,
      amount: amountNumber,
      financialAccountId,
      transferAccountId: typeRaw === TransactionType.TRANSFER ? transferAccountId : null,
      categoryId,
      category,
      note,
      occurredAt,
    });
  }

  const seenIds = new Set<string>();
  for (const row of valid) {
    if (!row.id) continue;
    if (seenIds.has(row.id)) {
      errors.push({
        row: row.rowNumber,
        message: "Duplicate id in file",
      });
    } else {
      seenIds.add(row.id);
    }
  }

  if (errors.length > 0) {
    return { valid: [], errors };
  }

  return { valid, errors: [] };
}

export async function POST(request: Request) {
  const session = (await getServerSession(authOptions)) as SessionWithId | null;
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let csvText: string | null;
  try {
    csvText = await readCsvFromRequest(request);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message === "File is too large"
            ? "CSV file is too large"
            : "Failed to read CSV file",
      },
      { status: 400 },
    );
  }

  if (!csvText) {
    return NextResponse.json(
      { error: "No CSV content provided" },
      { status: 400 },
    );
  }

  let parsedRows: ParsedTransactionCsvRow[];
  try {
    parsedRows = parseTransactionsCsv(csvText);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.message
            ? error.message
            : "Invalid CSV format",
      },
      { status: 400 },
    );
  }

  if (parsedRows.length === 0) {
    return NextResponse.json(
      { error: "No data rows found in CSV" },
      { status: 400 },
    );
  }

  if (parsedRows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json(
      {
        error: `CSV has too many rows (max ${MAX_IMPORT_ROWS})`,
      },
      { status: 400 },
    );
  }

  const { valid, errors } = validateParsedRows(parsedRows);
  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "CSV validation failed",
        errorCount: errors.length,
        errors,
      },
      { status: 400 },
    );
  }

  type ValidRow = ValidTransactionRow;
  const toCreate = valid.filter((row: ValidRow) => !row.id);
  const toUpdate = valid.filter((row: ValidRow) => row.id);

  const updateIds = Array.from(
    new Set(toUpdate.map((row: ValidRow) => row.id as string)),
  );

  if (updateIds.length > 0) {
    const existing = await prisma.transaction.findMany({
      where: {
        id: { in: updateIds },
        userId,
      },
      select: { id: true },
    });
    type ExistingItem = (typeof existing)[number];
    const existingIds = new Set(existing.map((t: ExistingItem) => t.id));

    const missingIds = updateIds.filter((id) => !existingIds.has(id));
    if (missingIds.length > 0) {
      const missingRows = toUpdate.filter((row: ValidRow) =>
        missingIds.includes(row.id as string),
      );
      const idList = Array.from(new Set(missingIds)).join(", ");
      return NextResponse.json(
        {
          error:
            "Some rows reference transactions that do not exist or do not belong to you",
          errorCount: missingRows.length,
          errors: missingRows.map((row: ValidRow) => ({
            row: row.rowNumber,
            message: `Transaction id ${row.id} does not exist for this user`,
          })),
          missingIds: idList,
        },
        { status: 400 },
      );
    }
  }

  const defaultAccount = await ensureUserHasDefaultFinancialAccount(userId);

  try {
    const result = await prisma.$transaction(async (tx) => {
      let createdCount = 0;
      let updatedCount = 0;

      for (const row of toCreate) {
        const financialAccountId =
          row.financialAccountId ?? defaultAccount.id;
        let categoryId = row.categoryId;
        if (!categoryId && row.category) {
          categoryId = await findOrCreateCategoryByName(
            tx,
            userId,
            row.category
          );
        }
        await tx.transaction.create({
          data: {
            userId,
            type: row.type as PrismaTransactionType,
            amount: row.amount,
            financialAccountId,
            transferAccountId:
              row.type === TransactionType.TRANSFER && row.transferAccountId
                ? row.transferAccountId
                : undefined,
            categoryId,
            category: row.category,
            note: row.note,
            occurredAt: row.occurredAt,
          },
        });
        createdCount += 1;
      }

      for (const row of toUpdate) {
        let categoryId = row.categoryId;
        if (!categoryId && row.category) {
          categoryId = await findOrCreateCategoryByName(
            tx,
            userId,
            row.category
          );
        }
        const updateData: {
          type: PrismaTransactionType;
          amount: number;
          financialAccountId: string;
          transferAccountId?: string | null;
          categoryId?: string | null;
          category: string | null;
          note: string | null;
          occurredAt: Date;
        } = {
          type: row.type as PrismaTransactionType,
          amount: row.amount,
          financialAccountId: row.financialAccountId ?? defaultAccount.id,
          category: row.category,
          note: row.note,
          occurredAt: row.occurredAt,
        };
        if (categoryId !== undefined) {
          updateData.categoryId = categoryId;
        }
        if (row.type === TransactionType.TRANSFER) {
          updateData.transferAccountId = row.transferAccountId;
        } else {
          updateData.transferAccountId = null;
        }
        await tx.transaction.update({
          where: {
            id: row.id as string,
            userId,
          },
          data: updateData,
        });
        updatedCount += 1;
      }

      return { createdCount, updatedCount };
    });

    void createActivityLog({
      userId,
      action: ActivityLogAction.TRANSACTION_IMPORT,
      entityType: "transaction",
      details: {
        createdCount: result.createdCount,
        updatedCount: result.updatedCount,
        totalRows: valid.length,
      },
    });

    return NextResponse.json({
      createdCount: result.createdCount,
      updatedCount: result.updatedCount,
      totalRows: valid.length,
      errorCount: 0,
      errors: [] as ImportError[],
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to import transactions" },
      { status: 500 },
    );
  }
}

