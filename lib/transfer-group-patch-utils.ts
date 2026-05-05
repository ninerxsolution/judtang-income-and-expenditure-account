/**
 * Cross-currency transfer rows share `transferGroupId`; PATCH often sends explicit
 * `categoryId: null` / `category: null` even when unchanged. Only count as a mutation
 * when the resolved value differs from the stored row.
 */
export function isExplicitCategoryIdChange(
  paramsCategoryId: string | null | undefined,
  existingCategoryId: string | null,
): boolean {
  if (paramsCategoryId === undefined) return false;
  const next =
    paramsCategoryId != null && String(paramsCategoryId).trim() !== ""
      ? String(paramsCategoryId).trim()
      : null;
  return next !== (existingCategoryId ?? null);
}

export function isExplicitCategoryLabelChange(
  paramsCategory: string | null | undefined,
  existingCategory: string | null,
): boolean {
  if (paramsCategory === undefined) return false;
  const next =
    paramsCategory != null && String(paramsCategory).trim() !== ""
      ? String(paramsCategory).trim()
      : null;
  return next !== (existingCategory ?? null);
}
