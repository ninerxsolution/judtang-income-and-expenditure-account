/**
 * MRU order for financial account pickers (same pattern as judtang_recent_categories).
 * Most recently used account id appears first in the list.
 */

export const RECENT_FINANCIAL_ACCOUNTS_KEY = "judtang_recent_financial_accounts";
export const MAX_RECENT_FINANCIAL_ACCOUNTS = 20;

export function getRecentFinancialAccountIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_FINANCIAL_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveRecentFinancialAccountId(id: string): void {
  if (typeof window === "undefined" || !id.trim()) return;
  try {
    const recent = getRecentFinancialAccountIds();
    const filtered = recent.filter((x) => x !== id);
    const updated = [id, ...filtered].slice(0, MAX_RECENT_FINANCIAL_ACCOUNTS);
    window.localStorage.setItem(RECENT_FINANCIAL_ACCOUNTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function sortAccountsByRecent<T extends { id: string }>(
  accounts: T[],
  recentIds: string[],
): T[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const ordered: T[] = [];
  for (const id of recentIds) {
    const acc = byId.get(id);
    if (acc) {
      ordered.push(acc);
      byId.delete(id);
    }
  }
  const rest = Array.from(byId.values());
  return [...ordered, ...rest];
}

/** First account in `recentIds` order that still exists in `accounts`, or null. */
export function pickPreferredAccountId<T extends { id: string }>(
  accounts: T[],
  recentIds: string[],
): T | null {
  if (accounts.length === 0) return null;
  const byId = new Map(accounts.map((a) => [a.id, a]));
  for (const id of recentIds) {
    const acc = byId.get(id);
    if (acc) return acc;
  }
  return null;
}
