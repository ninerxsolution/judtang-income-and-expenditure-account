import type { Transaction } from "@prisma/client";

const TRANSACTION_CSV_COLUMNS = [
  "id",
  "type",
  "amount",
  "category",
  "note",
  "occurredAt",
  "createdAt",
] as const;

export type TransactionCsvColumn = (typeof TRANSACTION_CSV_COLUMNS)[number];

export type ParsedTransactionCsvRow = {
  rowNumber: number;
  values: Record<TransactionCsvColumn, string>;
};

function stripBom(input: string): string {
  if (input.charCodeAt(0) === 0xfeff) {
    return input.slice(1);
  }
  return input;
}

function normalizeNewlines(input: string): string {
  return input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function formatDateForCsv(date: Date): string {
  return date.toISOString();
}

function formatAmountForCsv(amount: Transaction["amount"]): string {
  if (amount == null) return "";
  const num = Number(amount);
  if (!Number.isFinite(num)) return "";
  return num.toFixed(2);
}

function escapeCsvField(raw: string): string {
  let value = raw;
  if (value.includes('"')) {
    value = value.replace(/"/g, '""');
  }
  if (/[",\n\r]/.test(value)) {
    return `"${value}"`;
  }
  return value;
}

export function serializeTransactionsToCsv(transactions: Transaction[]): string {
  const header = TRANSACTION_CSV_COLUMNS.join(",");

  const lines = transactions.map((t) => {
    const columns: string[] = [
      escapeCsvField(t.id),
      escapeCsvField(t.type ?? ""),
      escapeCsvField(formatAmountForCsv(t.amount)),
      escapeCsvField(t.category ?? ""),
      escapeCsvField(t.note ?? ""),
      escapeCsvField(formatDateForCsv(t.occurredAt)),
      escapeCsvField(formatDateForCsv(t.createdAt)),
    ];

    return columns.join(",");
  });

  const bom = "\uFEFF";
  return bom + [header, ...lines].join("\r\n");
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  const input = normalizeNewlines(stripBom(text));

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (char === '"') {
      if (inQuotes && input[i + 1] === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if (char === "\n" && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
        rows.push(currentRow);
      }
      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
      rows.push(currentRow);
    }
  }

  return rows;
}

export function parseTransactionsCsv(text: string): ParsedTransactionCsvRow[] {
  const rows = parseCsv(text);

  if (rows.length === 0) {
    throw new Error("CSV is empty");
  }

  const headerRaw = rows[0];
  const header = headerRaw.map((h) => h.trim());

  const columnIndex = new Map<string, number>();
  header.forEach((name, index) => {
    if (name) {
      columnIndex.set(name, index);
    }
  });

  const missingColumns = TRANSACTION_CSV_COLUMNS.filter(
    (name) => !columnIndex.has(name),
  );

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV is missing required columns: ${missingColumns.join(", ")}`,
    );
  }

  const result: ParsedTransactionCsvRow[] = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const rawRow = rows[rowIndex];

    if (rawRow.every((cell) => cell.trim() === "")) {
      continue;
    }

    const values = {} as Record<TransactionCsvColumn, string>;

    for (const col of TRANSACTION_CSV_COLUMNS) {
      const idx = columnIndex.get(col);
      const value =
        idx != null && idx < rawRow.length ? String(rawRow[idx] ?? "") : "";
      values[col] = value;
    }

    result.push({
      rowNumber: rowIndex + 1,
      values,
    });
  }

  return result;
}

