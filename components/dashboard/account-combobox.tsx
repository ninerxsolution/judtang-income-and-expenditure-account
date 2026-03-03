"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { ChevronDown, Building2, Banknote, PiggyBank } from "lucide-react";
import { THAI_BANKS, BANK_OTHER, getBankIconColor, getBankLogoUrl } from "@/lib/thai-banks";
import { CardNetworkIcon } from "@/components/dashboard/card-type-select";
import { cn } from "@/lib/utils";

export type AccountOption = {
  id: string;
  name: string;
  type: string;
  bankName?: string | null;
  cardNetwork?: string | null;
  isDefault?: boolean;
};

type AccountComboboxProps = {
  id?: string;
  value: string;
  onChange: (accountId: string) => void;
  accounts: AccountOption[];
  excludeIds?: string[];
  filterByType?: (type: string) => boolean;
  allowEmpty?: boolean;
  emptyLabel?: string;
  defaultLabel?: string;
  className?: string;
};

function AccountIcon({
  account,
  size = "md",
}: {
  account: AccountOption;
  size?: "sm" | "md";
}) {
  const boxClass = size === "sm" ? "h-7 w-7" : "h-8 w-8";

  if (account.type === "CREDIT_CARD") {
    const networkId = account.cardNetwork || "other";
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#E8E0C8] dark:bg-stone-700 p-1",
          boxClass
        )}
      >
        <CardNetworkIcon id={networkId} size={size === "sm" ? 16 : 20} />
      </div>
    );
  }

  if (account.type === "CASH") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[#E8E0C8] dark:bg-stone-700",
          boxClass
        )}
      >
        <Banknote className="h-4 w-4 text-[#6B5E4E] dark:text-stone-400" />
      </div>
    );
  }

  if (account.type === "OTHER") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[#E8E0C8] dark:bg-stone-700",
          boxClass
        )}
      >
        <PiggyBank className="h-4 w-4 text-[#6B5E4E] dark:text-stone-400" />
      </div>
    );
  }

  if (account.type === "BANK" || account.type === "WALLET") {
    const bankId = account.bankName ?? "";
    const logoUrl = bankId && bankId !== BANK_OTHER ? getBankLogoUrl(bankId) : null;
    const knownBank = bankId && bankId !== BANK_OTHER && THAI_BANKS.some((b) => b.id === bankId);
    const bank = knownBank ? THAI_BANKS.find((b) => b.id === bankId) : null;
    const abbr = bank
      ? (bank.abbr.length > 2 ? bank.abbr.slice(0, 2) : bank.abbr)
      : bankId
        ? bankId.slice(0, 2).toUpperCase()
        : "??";
    const fullIndex = THAI_BANKS.findIndex((b) => b.id === bankId);
    const iconColor = getBankIconColor(fullIndex >= 0 ? fullIndex : 0);

    if (logoUrl) {
      return (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg",
            size === "sm" ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg",
            "bg-white p-1 dark:bg-stone-800"
          )}
        >
          <Image
            src={logoUrl}
            alt=""
            width={size === "sm" ? 24 : 32}
            height={size === "sm" ? 24 : 32}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }

    if (knownBank) {
      return (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden rounded-lg text-xs font-semibold text-white",
            size === "sm" ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg",
            iconColor
          )}
        >
          {abbr}
        </div>
      );
    }

    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg bg-[#D4C9B0] dark:bg-stone-700",
          size === "sm" ? "h-7 w-7 rounded-md" : "h-8 w-8 rounded-lg"
        )}
      >
        <Building2 className="h-4 w-4 text-[#6B5E4E] dark:text-stone-400" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-[#E8E0C8] dark:bg-stone-700",
        boxClass
      )}
    >
      <Building2 className="h-4 w-4 text-[#6B5E4E] dark:text-stone-400" />
    </div>
  );
}

const DROPDOWN_STYLES =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[#D4C9B0] px-3 py-2 text-left text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 hover:bg-[#F5F0E8] dark:hover:bg-stone-800";
const OPTION_STYLES =
  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800";
const OPTION_SELECTED = "bg-[#EBF4E3] dark:bg-stone-800";
const POPOVER_STYLES =
  "absolute left-0 right-0 top-full z-[100] mt-1 max-h-60 overflow-auto rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900";

export function AccountCombobox({
  id,
  value,
  onChange,
  accounts,
  excludeIds = [],
  filterByType,
  allowEmpty = false,
  emptyLabel = "—",
  defaultLabel,
  className,
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredAccounts = accounts.filter((acc) => {
    if (excludeIds.includes(acc.id)) return false;
    if (filterByType && !filterByType(acc.type)) return false;
    return true;
  });

  const selected = value ? accounts.find((a) => a.id === value) ?? null : null;
  const displayLabel = selected
    ? `${selected.name}${selected.isDefault && defaultLabel ? ` (${defaultLabel})` : ""}`
    : emptyLabel;

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
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(DROPDOWN_STYLES, className)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          {value && selected ? (
            <AccountIcon account={selected} size="sm" />
          ) : null}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div className={POPOVER_STYLES} role="listbox">
          {allowEmpty && (
            <button
              type="button"
              role="option"
              className={cn(OPTION_STYLES, !value && OPTION_SELECTED)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
                setOpen(false);
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8E0C8] dark:bg-stone-700">
                <span className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                  —
                </span>
              </div>
              {emptyLabel}
            </button>
          )}
          {filteredAccounts.map((acc) => {
            const isSelected = value === acc.id;
            const label = `${acc.name}${acc.isDefault && defaultLabel ? ` (${defaultLabel})` : ""}`;
            return (
              <button
                key={acc.id}
                type="button"
                role="option"
                className={cn(OPTION_STYLES, isSelected && OPTION_SELECTED)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(acc.id);
                  setOpen(false);
                }}
              >
                <AccountIcon account={acc} />
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
