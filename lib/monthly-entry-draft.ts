/**
 * Draft persistence for the Monthly Entry page (localStorage).
 *
 * Unsaved rows are stored per (year, month) so a page refresh — or accidentally
 * navigating away mid data-entry — does not lose ~100 hand-typed rows. Cleared
 * on a successful save. Same versioned-key convention as the slip-upload drafts.
 */

export type MonthlyEntryDraftType = "INCOME" | "EXPENSE" | "TRANSFER";

/** One unsaved row. Mirrors the page's RowEntry (imported by the page so they stay in sync). */
export type MonthlyEntryDraftRow = {
  id: string;
  type: MonthlyEntryDraftType;
  amount: string;
  categoryId: string;
  financialAccountId: string;
  transferAccountId: string;
  note: string;
};

/** day-of-month (1-based) -> rows */
export type MonthlyEntryDraft = Record<number, MonthlyEntryDraftRow[]>;

const DRAFT_PREFIX = "judtang_monthly_entry_draft";
const DRAFT_VERSION = "v1";

function draftKey(year: number, month: number): string {
  return `${DRAFT_PREFIX}_${DRAFT_VERSION}_${year}_${month}`;
}

const VALID_TYPES: ReadonlySet<string> = new Set([
  "INCOME",
  "EXPENSE",
  "TRANSFER",
]);

function sanitizeRow(raw: unknown): MonthlyEntryDraftRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const type = typeof r.type === "string" && VALID_TYPES.has(r.type) ? r.type : "EXPENSE";
  if (!id) return null;
  return {
    id,
    type: type as MonthlyEntryDraftType,
    amount: typeof r.amount === "string" ? r.amount : "",
    categoryId: typeof r.categoryId === "string" ? r.categoryId : "",
    financialAccountId:
      typeof r.financialAccountId === "string" ? r.financialAccountId : "",
    transferAccountId:
      typeof r.transferAccountId === "string" ? r.transferAccountId : "",
    note: typeof r.note === "string" ? r.note : "",
  };
}

/** True when the draft holds no rows at all (nothing worth persisting). */
export function isMonthlyEntryDraftEmpty(draft: MonthlyEntryDraft): boolean {
  for (const rows of Object.values(draft)) {
    if (rows && rows.length > 0) return false;
  }
  return true;
}

export function loadMonthlyEntryDraft(
  year: number,
  month: number,
): MonthlyEntryDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(draftKey(year, month));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: MonthlyEntryDraft = {};
    for (const [dayStr, rowsRaw] of Object.entries(parsed as Record<string, unknown>)) {
      const day = Number(dayStr);
      if (!Number.isInteger(day) || day < 1 || day > 31) continue;
      if (!Array.isArray(rowsRaw)) continue;
      const rows = rowsRaw
        .map(sanitizeRow)
        .filter((r): r is MonthlyEntryDraftRow => r !== null);
      if (rows.length > 0) out[day] = rows;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveMonthlyEntryDraft(
  year: number,
  month: number,
  draft: MonthlyEntryDraft,
): void {
  if (typeof window === "undefined") return;
  try {
    if (isMonthlyEntryDraftEmpty(draft)) {
      window.localStorage.removeItem(draftKey(year, month));
      return;
    }
    window.localStorage.setItem(draftKey(year, month), JSON.stringify(draft));
  } catch {
    // Ignore quota / serialization errors — draft persistence is best-effort.
  }
}

export function clearMonthlyEntryDraft(year: number, month: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(year, month));
  } catch {
    // Ignore
  }
}
