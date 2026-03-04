"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getCategoryDisplayName } from "@/lib/categories-display";

type Category = { id: string; name: string };

type CategoryComboboxProps = {
  id?: string;
  value: string;
  onChange: (categoryId: string) => void;
  categories: Category[];
  localeKey?: "th" | "en";
  placeholder?: string;
  noResultsText?: string;
  noneLabel?: string;
  className?: string;
  onInputFocus?: React.FocusEventHandler<HTMLInputElement>;
};

function filterCategories(
  categories: Category[],
  query: string,
  localeKey: "th" | "en"
): Category[] {
  const q = query.trim().toLowerCase();
  if (!q) return categories;
  return categories.filter((c) => {
    const displayName = getCategoryDisplayName(c.name, localeKey);
    return (
      displayName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  });
}

export function CategoryCombobox({
  id,
  value,
  onChange,
  categories,
  localeKey = "th",
  placeholder,
  noResultsText = "No category found",
  noneLabel = "—",
  className,
  onInputFocus,
}: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredCategories = filterCategories(categories, searchQuery, localeKey);
  const showNone = !searchQuery.trim();
  const selectedCategory = categories.find((c) => c.id === value);

  const displayValue = open
    ? searchQuery
    : (selectedCategory && getCategoryDisplayName(selectedCategory.name, localeKey)) ?? "";

  function closeDropdown() {
    setSearchQuery("");
    setOpen(false);
  }

  function handleSelect(categoryId: string) {
    onChange(categoryId);
    closeDropdown();
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={displayValue}
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={(e) => {
          setOpen(true);
          onInputFocus?.(e);
        }}
        placeholder={placeholder}
        className={cn("pr-9", className)}
        autoComplete="off"
      />
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 opacity-50 hover:opacity-100"
        onClick={() => setOpen((o) => !o)}
        aria-label="Toggle dropdown"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-auto rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
          role="listbox"
        >
          {filteredCategories.length === 0 && !showNone ? (
            <p className="px-2 py-4 text-center text-sm text-[#A09080]">
              {noResultsText}
            </p>
          ) : (
            <>
              {showNone && (
                <button
                  type="button"
                  role="option"
                  aria-selected={!value}
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                    !value && "bg-[#EBF4E3] dark:bg-stone-800"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect("");
                  }}
                >
                  {noneLabel}
                </button>
              )}
              {filteredCategories.map((cat) => {
                const isSelected = value === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                      isSelected && "bg-[#EBF4E3] dark:bg-stone-800"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(cat.id);
                    }}
                  >
                    {getCategoryDisplayName(cat.name, localeKey)}
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}
