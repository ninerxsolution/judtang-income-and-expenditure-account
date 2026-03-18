"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { THAI_BANKS, BANK_OTHER, getBankIconColor, getBankLogoUrl } from "@/lib/thai-banks";
import { cn } from "@/lib/utils";
import { useDropdownOpenUpward } from "@/hooks/use-dropdown-open-upward";

type BankComboboxProps = {
  id?: string;
  value: string;
  onChange: (bankId: string) => void;
  onOtherSelect?: () => void;
  placeholder?: string;
  noResultsText?: string;
  noneLabel?: string;
  otherLabel?: string;
  ariaLabel?: string;
  localeKey: "th" | "en";
  className?: string;
};

function getBankLabel(bankId: string, localeKey: "th" | "en"): string {
  if (!bankId || bankId === BANK_OTHER) return "";
  const bank = THAI_BANKS.find((b) => b.id === bankId);
  return bank ? (localeKey === "th" ? bank.nameTh : bank.nameEn) : bankId;
}

type ThaiBank = (typeof THAI_BANKS)[number];

function filterBanks(query: string, localeKey: "th" | "en"): ThaiBank[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...THAI_BANKS];
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
  otherLabel: otherLabelProp,
  ariaLabel,
  localeKey,
  className,
}: BankComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const openUpward = useDropdownOpenUpward(containerRef, open);

  const otherLabel = otherLabelProp ?? (localeKey === "th" ? "อื่นๆ" : "Other");
  const filteredBanks = filterBanks(searchQuery, localeKey);
  const showOther =
    !searchQuery.trim() ||
    otherLabel.toLowerCase().includes(searchQuery.trim().toLowerCase());
  const showNone = !searchQuery.trim();

  const displayValue = open ? searchQuery : getBankLabel(value, localeKey);

  function closeDropdown() {
    setSearchQuery("");
    setOpen(false);
  }

  function handleSelect(bankId: string) {
    onChange(bankId);
    if (bankId === BANK_OTHER) {
      onOtherSelect?.();
    }
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

  const selectedBank = value && value !== BANK_OTHER ? THAI_BANKS.find((b) => b.id === value) : null;
  const showInputIcon = value && !open && (selectedBank || value === BANK_OTHER);
  const selectedBankLogoUrl = selectedBank ? getBankLogoUrl(value) : null;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative flex items-center">
        {showInputIcon && (
          <div
            className={cn(
              "absolute left-3 z-10 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md",
              selectedBank
                ? (selectedBankLogoUrl
                    ? "bg-white dark:bg-stone-800 p-0.5"
                    : cn(
                        "text-xs font-semibold text-white",
                        getBankIconColor(THAI_BANKS.findIndex((b) => b.id === value))
                      ))
                : "bg-[#D4C9B0] dark:bg-stone-700"
            )}
          >
            {selectedBank ? (
              selectedBankLogoUrl ? (
                <Image
                  src={selectedBankLogoUrl}
                  alt=""
                  width={24}
                  height={24}
                  className="h-full w-full object-contain"
                />
              ) : (
                (() => {
                  const b: { id: string; abbr?: string } = selectedBank;
                  const a = b.abbr ?? b.id.slice(0, 2).toUpperCase();
                  return a.length > 2 ? a.slice(0, 2) : a;
                })()
              )
            ) : (
              <Building2 className="h-4 w-4 text-[#6B5E4E] dark:text-stone-400" />
            )}
          </div>
        )}
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
          className={cn(
            "pr-9",
            className,
            showInputIcon && "pl-12"
          )}
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        tabIndex={-1}
        className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1 opacity-50 hover:opacity-100"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel ?? "Toggle dropdown"}
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div
          className={cn(
            "absolute left-0 right-0 z-[100] max-h-60 overflow-auto rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900",
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          )}
          role="listbox"
        >
          {filteredBanks.length === 0 && !showOther && !showNone ? (
            <p className="px-2 py-4 text-center text-sm text-[#A09080] dark:text-stone-400">
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
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                    !value && "bg-[#EBF4E3] dark:bg-stone-800"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect("");
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8E0C8] dark:bg-stone-700">
                    <span className="text-xs font-medium text-[#A09080] dark:text-stone-400">—</span>
                  </div>
                  {noneLabel}
                </button>
              )}
              {filteredBanks.map((bank) => {
                const label = localeKey === "th" ? bank.nameTh : bank.nameEn;
                const isSelected = value === bank.id;
                const abbr = bank.abbr.length > 2 ? bank.abbr.slice(0, 2) : bank.abbr;
                const fullIndex = THAI_BANKS.findIndex((b) => b.id === bank.id);
                const iconColor = getBankIconColor(fullIndex >= 0 ? fullIndex : 0);
                const logoUrl = getBankLogoUrl(bank.id);
                return (
                  <button
                    key={bank.id}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                      isSelected && "bg-[#EBF4E3] dark:bg-stone-800"
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(bank.id);
                    }}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg",
                        logoUrl
                          ? "bg-white p-1 dark:bg-stone-800"
                          : cn("text-xs font-semibold text-white", iconColor)
                      )}
                    >
                      {logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt=""
                          width={32}
                          height={32}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        abbr
                      )}
                    </div>
                    {label}
                  </button>
                );
              })}
              {showOther && (
                <button
                  type="button"
                  role="option"
                  aria-selected={value === BANK_OTHER}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                    value === BANK_OTHER && "bg-[#EBF4E3] dark:bg-stone-800"
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(BANK_OTHER);
                  }}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D4C9B0] dark:bg-stone-700">
                    <Building2 className="h-4 w-4 text-[#6B5E4E] dark:text-stone-400" />
                  </div>
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
