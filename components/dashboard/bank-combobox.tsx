"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { THAI_BANKS, BANK_OTHER } from "@/lib/thai-banks";
import { cn } from "@/lib/utils";

type BankComboboxProps = {
  id?: string;
  value: string;
  onChange: (bankId: string) => void;
  onOtherSelect?: () => void;
  placeholder?: string;
  noResultsText?: string;
  noneLabel?: string;
  localeKey: "th" | "en";
  className?: string;
};

function getBankLabel(bankId: string, localeKey: "th" | "en"): string {
  if (!bankId || bankId === BANK_OTHER) return "";
  const bank = THAI_BANKS.find((b) => b.id === bankId);
  return bank ? (localeKey === "th" ? bank.nameTh : bank.nameEn) : bankId;
}

function filterBanks(query: string, localeKey: "th" | "en") {
  const q = query.trim().toLowerCase();
  if (!q) return THAI_BANKS;
  return THAI_BANKS.filter(
    (b) =>
      (localeKey === "th" ? b.nameTh : b.nameEn).toLowerCase().includes(q) ||
      (localeKey === "th" ? b.nameEn : b.nameTh).toLowerCase().includes(q)
  );
}

export function BankCombobox({
  id,
  value,
  onChange,
  onOtherSelect,
  placeholder,
  noResultsText = "No bank found",
  noneLabel = "—",
  localeKey,
  className,
}: BankComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredBanks = filterBanks(searchQuery, localeKey);
  const showOther =
    !searchQuery.trim() ||
    (localeKey === "th" ? "อื่นๆ" : "Other")
      .toLowerCase()
      .includes(searchQuery.trim().toLowerCase());
  const showNone = !searchQuery.trim();

  const displayValue = open ? searchQuery : getBankLabel(value, localeKey);
  const otherLabel = localeKey === "th" ? "อื่นๆ" : "Other";

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  function handleSelect(bankId: string) {
    onChange(bankId);
    if (bankId === BANK_OTHER) {
      onOtherSelect?.();
    }
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
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
        onFocus={() => setOpen(true)}
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
          {filteredBanks.length === 0 && !showOther && !showNone ? (
            <p className="px-2 py-4 text-center text-sm text-[#A09080]">
              {noResultsText}
            </p>
          ) : (
            <>
              {showNone && (
                <button
                  type="button"
                  role="option"
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
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
              {filteredBanks.map((bank) => {
                const label = localeKey === "th" ? bank.nameTh : bank.nameEn;
                const isSelected = value === bank.id;
                return (
                  <button
                    key={bank.id}
                    type="button"
                    role="option"
                    className={cn(
                      "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                      isSelected && "bg-[#EBF4E3] dark:bg-stone-800"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(bank.id);
                    }}
                  >
                    {label}
                  </button>
                );
              })}
              {showOther && (
                <button
                  type="button"
                  role="option"
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    value === BANK_OTHER && "bg-[#EBF4E3] dark:bg-stone-800"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(BANK_OTHER);
                  }}
                >
                  {otherLabel}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
