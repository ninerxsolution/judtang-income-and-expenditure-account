"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getCategoryDisplayName } from "@/lib/categories-display";
import {
  getRecentCategoryIds,
  saveRecentCategoryId,
  sortCategoriesByRecent,
} from "@/lib/recent-categories";
import { useI18n } from "@/hooks/use-i18n";

const INITIAL_CATEGORY_COUNT = 3;

export type CategoryCapsuleItem = {
  id: string;
  name: string;
  nameEn?: string | null;
};

export type CategoryCapsulePickerProps = {
  categories: readonly CategoryCapsuleItem[];
  value: string;
  onValueChange: (categoryId: string) => void;
  localeKey: "th" | "en";
  loading?: boolean;
  /** When the host dialog opens, MRU is re-read; when it closes, the expand state resets */
  dialogOpen: boolean;
  id?: string;
  ariaLabel: string;
  label?: ReactNode;
  /** Tap selected chip again to clear (transaction form); false = only switch category */
  allowToggleClear?: boolean;
  /**
   * Bump from parent so multiple pickers in one dialog re-sort after MRU changes
   * (e.g. slip upload drafts).
   */
  resortRevision?: number;
  /** Parent increments resortRevision when MRU updates */
  onRecentCategoryUsed?: () => void;
};

export function CategoryCapsulePicker({
  categories,
  value,
  onValueChange,
  localeKey,
  loading = false,
  dialogOpen,
  id = "category-capsule-picker",
  ariaLabel,
  label,
  allowToggleClear = true,
  resortRevision = 0,
  onRecentCategoryUsed,
}: CategoryCapsulePickerProps) {
  const { t } = useI18n();
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const [categoryMruTick, setCategoryMruTick] = useState(0);

  useEffect(() => {
    if (dialogOpen && typeof window !== "undefined") {
      setCategoryMruTick((tick) => tick + 1);
    }
    if (!dialogOpen) {
      setCategoriesExpanded(false);
    }
  }, [dialogOpen]);

  const categoryRecentIds = useMemo(
    () => getRecentCategoryIds(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-snapshot MRU after open, chip select, or sibling picker
    [categories, categoryMruTick, resortRevision],
  );

  const sortedCategories = useMemo(
    () => sortCategoriesByRecent([...categories], categoryRecentIds),
    [categories, categoryRecentIds],
  );

  const visibleCategories = categoriesExpanded
    ? sortedCategories
    : sortedCategories.slice(0, INITIAL_CATEGORY_COUNT);
  const hasMoreCategories = sortedCategories.length > INITIAL_CATEGORY_COUNT;

  if (loading) {
    return (
      <div>
        {label != null ? (
          <>
            <Skeleton className="mb-1 h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-md" />
          </>
        ) : (
          <Skeleton className="h-10 w-full rounded-md" />
        )}
      </div>
    );
  }

  const group = (
    <div
      id={id}
      className="flex flex-wrap gap-2"
      role="group"
      aria-label={ariaLabel}
    >
      {visibleCategories.map((cat) => {
        const isSelected = value === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              if (isSelected && allowToggleClear) {
                onValueChange("");
                return;
              }
              if (!isSelected) {
                saveRecentCategoryId(cat.id);
                setCategoryMruTick((tick) => tick + 1);
                onRecentCategoryUsed?.();
                onValueChange(cat.id);
              }
            }}
            className={cn(
              "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-all",
              "border-[#D4C9B0] dark:border-stone-700",
              isSelected
                ? "bg-[#5C6B52] text-white border-[#5C6B52] dark:bg-stone-600 dark:border-stone-600"
                : "bg-[#FDFAF4] text-[#3D3020] hover:bg-[#F5F0E8] dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
            )}
          >
            {getCategoryDisplayName(cat.name, localeKey, cat.nameEn)}
          </button>
        );
      })}
      {hasMoreCategories ? (
        <button
          type="button"
          onClick={() => setCategoriesExpanded((e) => !e)}
          className={cn(
            "inline-flex items-center rounded-full border px-3 py-1.5 text-sm transition-all",
            "border-[#D4C9B0] dark:border-stone-700",
            "bg-[#FDFAF4] text-[#3D3020] hover:bg-[#F5F0E8] dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800",
          )}
          aria-expanded={categoriesExpanded}
          aria-label={
            categoriesExpanded
              ? t("transactions.new.categoryShowLess")
              : t("transactions.new.categoryShowMore")
          }
        >
          {categoriesExpanded
            ? t("transactions.new.categoryShowLess")
            : t("transactions.new.categoryShowMore")}
        </button>
      ) : null}
    </div>
  );

  if (label != null) {
    return (
      <div>
        {typeof label === "string" ? (
          <span className="mb-1 block text-sm font-medium">{label}</span>
        ) : (
          <div className="mb-1">{label}</div>
        )}
        {group}
      </div>
    );
  }

  return group;
}
