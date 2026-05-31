/**
 * Pure validation + transformation for bulk monthly entry
 * (POST /api/transactions/bulk).
 *
 * This module does NO database access. The route batch-fetches the user's
 * accounts and categories once, builds the lookup maps, and calls
 * `prepareBulkTransactionRows`. Keeping this logic pure means it can be unit
 * tested without a DB (see lib/__tests__/bulk-transactions.test.ts) — which is
 * exactly the layer that the mocked API route tests do NOT exercise.
 *
 * History: the original route ran a `findFirst` for the account (and the
 * category) of every row *inside* one interactive `prisma.$transaction`. With
 * ~70+ rows that is 150+ sequential round-trips, which blows past Prisma's
 * default 5s interactive-transaction timeout and throws P2028 ("Transaction
 * already closed") — surfaced to the user as an opaque 500. Pre-resolving
 * everything here lets the route do a single `createMany` inside the
 * transaction. See .cursor/rules/bulk-monthly-entry-transaction-timeout.mdc.
 */
import { parseOccurredAt } from "@/lib/date-range";
import {
  computeBaseAmountThb,
  defaultExchangeRateThbPerUnit,
  isBaseCurrency,
  normalizeCurrencyCode,
} from "@/lib/currency";

export const BULK_ENTRY_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type BulkEntryType = (typeof BULK_ENTRY_TYPES)[number];

/** Default cap on rows accepted in a single bulk request. */
export const MAX_BULK_ROWS = 500;

export type BulkTransactionInput = {
  type: string;
  amount: number;
  financialAccountId?: string | null;
  transferAccountId?: string | null;
  categoryId?: string | null;
  note?: string | null;
  occurredAt: string;
};

/** Stable machine-readable reason codes so the client can map errors back to fields/rows. */
export type BulkErrorCode =
  | "type"
  | "amount"
  | "occurredAt"
  | "financialAccountId"
  | "transferAccountId"
  | "crossCurrency";

export type BulkValidationError = {
  index: number;
  code: BulkErrorCode;
  message: string;
};

/** A fully-resolved row, ready to hand to `prisma.transaction.createMany`. */
export type PreparedBulkRow = {
  type: BulkEntryType;
  amount: number;
  currency: string;
  exchangeRate: number;
  baseAmount: number;
  financialAccountId: string;
  transferAccountId: string | null;
  categoryId: string | null;
  category: string | null;
  note: string | null;
  occurredAt: Date;
  postedDate: Date;
};

export type BulkAccountInfo = { id: string; currency: string };

export type PrepareBulkContext = {
  /** Account used when a row omits financialAccountId. */
  defaultAccountId: string;
  /** All of the user's selectable accounts, keyed by id (currency needed for FX + transfer checks). */
  accountsById: Map<string, BulkAccountInfo>;
  /** The user's category display names, keyed by category id (for the denormalized `category` column). */
  categoryNamesById: Map<string, string>;
};

export type PrepareBulkResult = {
  errors: BulkValidationError[];
  rows: PreparedBulkRow[];
  /** Distinct ledger account ids touched (for snapshot rebuild). */
  accountIds: string[];
};

function isBulkEntryType(value: string): value is BulkEntryType {
  return (BULK_ENTRY_TYPES as readonly string[]).includes(value);
}

/**
 * Validate and transform raw bulk inputs into rows ready for `createMany`.
 *
 * Behavior mirrors the single-create path: amount must be > 0, occurredAt is
 * normalized via parseOccurredAt, TRANSFER requires a distinct same-currency
 * destination, and an unknown/foreign categoryId is dropped (not stored) so it
 * can never cause a foreign-key 500. Each invalid row produces one error and is
 * skipped; the route rejects the whole batch if `errors` is non-empty.
 */
export function prepareBulkTransactionRows(
  items: readonly BulkTransactionInput[],
  ctx: PrepareBulkContext,
): PrepareBulkResult {
  const errors: BulkValidationError[] = [];
  const rows: PreparedBulkRow[] = [];
  const accountIds = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i] ?? ({} as BulkTransactionInput);
    const typeUpper = String(item.type ?? "").trim().toUpperCase();

    if (!isBulkEntryType(typeUpper)) {
      errors.push({
        index: i,
        code: "type",
        message: "type must be INCOME, EXPENSE, or TRANSFER",
      });
      continue;
    }

    const amount = Number(item.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push({
        index: i,
        code: "amount",
        message: "amount must be a positive number",
      });
      continue;
    }

    if (!item.occurredAt || typeof item.occurredAt !== "string") {
      errors.push({
        index: i,
        code: "occurredAt",
        message: "occurredAt is required",
      });
      continue;
    }
    const occurredAt = parseOccurredAt(item.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      errors.push({
        index: i,
        code: "occurredAt",
        message: "occurredAt must be a valid date",
      });
      continue;
    }

    const fromId = (item.financialAccountId ?? "").trim() || ctx.defaultAccountId;
    const fromAcc = ctx.accountsById.get(fromId);
    if (!fromAcc) {
      errors.push({
        index: i,
        code: "financialAccountId",
        message: "Financial account not found",
      });
      continue;
    }

    let transferAccountId: string | null = null;
    if (typeUpper === "TRANSFER") {
      const toId = (item.transferAccountId ?? "").trim();
      if (!toId) {
        errors.push({
          index: i,
          code: "transferAccountId",
          message: "transferAccountId is required for TRANSFER",
        });
        continue;
      }
      if (toId === fromId) {
        errors.push({
          index: i,
          code: "transferAccountId",
          message: "transferAccountId must be different from financialAccountId",
        });
        continue;
      }
      const toAcc = ctx.accountsById.get(toId);
      if (!toAcc) {
        errors.push({
          index: i,
          code: "transferAccountId",
          message: "Destination account not found",
        });
        continue;
      }
      if (
        normalizeCurrencyCode(fromAcc.currency) !==
        normalizeCurrencyCode(toAcc.currency)
      ) {
        errors.push({
          index: i,
          code: "crossCurrency",
          message:
            "Cross-currency transfers are not supported in bulk monthly entry",
        });
        continue;
      }
      transferAccountId = toId;
    }

    const currency = normalizeCurrencyCode(fromAcc.currency);
    const exchangeRate = isBaseCurrency(currency)
      ? 1
      : defaultExchangeRateThbPerUnit(currency);
    const baseAmount = computeBaseAmountThb(amount, currency, exchangeRate);

    // Drop unknown/foreign category ids so they can never cause an FK violation.
    const rawCategoryId = (item.categoryId ?? "").trim();
    const categoryName = rawCategoryId
      ? (ctx.categoryNamesById.get(rawCategoryId) ?? null)
      : null;
    const categoryId = categoryName ? rawCategoryId : null;
    const note = (item.note ?? "").trim() || null;

    rows.push({
      type: typeUpper,
      amount,
      currency,
      exchangeRate,
      baseAmount,
      financialAccountId: fromId,
      transferAccountId,
      categoryId,
      category: categoryName,
      note,
      occurredAt,
      postedDate: occurredAt,
    });

    accountIds.add(fromId);
    if (transferAccountId) accountIds.add(transferAccountId);
  }

  return { errors, rows, accountIds: [...accountIds] };
}

/** Collect every account id referenced by the raw inputs (for a single batch fetch). */
export function collectReferencedAccountIds(
  items: readonly BulkTransactionInput[],
  defaultAccountId: string,
): string[] {
  const ids = new Set<string>();
  if (defaultAccountId) ids.add(defaultAccountId);
  for (const item of items) {
    const from = (item?.financialAccountId ?? "").trim();
    if (from) ids.add(from);
    const to = (item?.transferAccountId ?? "").trim();
    if (to) ids.add(to);
  }
  return [...ids];
}

/** Collect every category id referenced by the raw inputs (for a single batch fetch). */
export function collectReferencedCategoryIds(
  items: readonly BulkTransactionInput[],
): string[] {
  const ids = new Set<string>();
  for (const item of items) {
    const c = (item?.categoryId ?? "").trim();
    if (c) ids.add(c);
  }
  return [...ids];
}
