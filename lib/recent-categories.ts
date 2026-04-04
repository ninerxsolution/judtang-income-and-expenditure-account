/**
 * MRU order for category pickers (localStorage key `judtang_recent_categories`).
 * Most recently used category id appears first in the list.
 */

export const RECENT_CATEGORIES_KEY = "judtang_recent_categories";
export const MAX_RECENT_CATEGORIES = 20;

export function getRecentCategoryIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveRecentCategoryId(id: string): void {
  if (typeof window === "undefined" || !id.trim()) return;
  try {
    const recent = getRecentCategoryIds();
    const filtered = recent.filter((x) => x !== id);
    const updated = [id, ...filtered].slice(0, MAX_RECENT_CATEGORIES);
    window.localStorage.setItem(RECENT_CATEGORIES_KEY, JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function sortCategoriesByRecent<T extends { id: string }>(
  categories: T[],
  recentIds: string[],
): T[] {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const ordered: T[] = [];
  for (const id of recentIds) {
    const cat = byId.get(id);
    if (cat) {
      ordered.push(cat);
      byId.delete(id);
    }
  }
  const rest = Array.from(byId.values());
  return [...ordered, ...rest];
}
