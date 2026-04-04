"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getCategoryDisplayName } from "@/lib/categories-display";
import { RowSelect } from "@/components/dashboard/row-select";
import {
  getRecentCategoryIds,
  saveRecentCategoryId,
  sortCategoriesByRecent,
} from "@/lib/recent-categories";

export type CategoryRowSelectItem = {
  id: string;
  name: string;
  nameEn?: string | null;
};

type CategoryRowSelectProps = {
  id?: string;
  value: string;
  onChange: (categoryId: string) => void;
  categories: CategoryRowSelectItem[];
  language: "th" | "en";
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
  /** When true (default), order options by most recently used (localStorage). */
  sortByRecent?: boolean;
  /** When true (default), persist MRU when the user picks a non-empty category. */
  recordRecent?: boolean;
};

export function CategoryRowSelect({
  id,
  value,
  onChange,
  categories,
  language,
  allowEmpty = false,
  emptyLabel = "—",
  className,
  sortByRecent = true,
  recordRecent = true,
}: CategoryRowSelectProps) {
  const [mounted, setMounted] = useState(false);
  const [mruTick, setMruTick] = useState(0);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const recentIds = useMemo(
    () => {
      if (!mounted || !sortByRecent) {
        return [];
      }
      return getRecentCategoryIds();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mruTick/categories invalidate MRU snapshot
    [mounted, sortByRecent, mruTick, categories],
  );

  const sortedCategories = useMemo(() => {
    if (!sortByRecent || !mounted) {
      return categories;
    }
    return sortCategoriesByRecent(categories, recentIds);
  }, [categories, sortByRecent, mounted, recentIds]);

  const options = useMemo(
    () =>
      sortedCategories.map((c) => ({
        value: c.id,
        label: getCategoryDisplayName(c.name, language, c.nameEn),
      })),
    [sortedCategories, language],
  );

  const handleChange = useCallback(
    (next: string) => {
      if (recordRecent && next.trim()) {
        saveRecentCategoryId(next);
        setMruTick((t) => t + 1);
      }
      onChange(next);
    },
    [onChange, recordRecent],
  );

  return (
    <RowSelect
      id={id}
      value={value}
      onChange={handleChange}
      options={options}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      className={className}
    />
  );
}
