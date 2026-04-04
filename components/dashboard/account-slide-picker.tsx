"use client";

import { useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { AccountIcon, type AccountOption } from "@/components/dashboard/account-combobox";
import { cn } from "@/lib/utils";
import {
  getRecentFinancialAccountIds,
  saveRecentFinancialAccountId,
  sortAccountsByRecent,
} from "@/lib/recent-financial-accounts";

export function AccountSelectorTrigger({
  label,
  account,
  onClick,
  disabled,
  defaultLabel,
  selectPlaceholder,
}: {
  label: string;
  account?: AccountOption | null;
  onClick: () => void;
  disabled?: boolean;
  defaultLabel?: string;
  selectPlaceholder: string;
}) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="flex w-full items-center justify-between rounded-md border border-[#D4C9B0] px-3 py-2 text-sm transition-all hover:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 text-left"
      >
        {account ? (
          <div className="flex items-center gap-2.5 overflow-hidden">
            <AccountIcon account={account} size="sm" />
            <span className="font-medium text-[#3D3020] dark:text-stone-200 truncate">
              {account.name}
              {account.isDefault && defaultLabel ? ` (${defaultLabel})` : ""}
            </span>
          </div>
        ) : (
          <span className="text-[#6B5E4E] dark:text-stone-400">{selectPlaceholder}</span>
        )}
        <ChevronRight className="h-5 w-5 shrink-0 text-[#6B5E4E] dark:text-stone-400" />
      </button>
    </div>
  );
}

type AccountSlidePickerPanelProps = {
  accounts: AccountOption[];
  selectedId: string;
  onSelect: (accountId: string) => void;
  onBack: () => void;
  title: string;
  searchPlaceholder: string;
  noResultsText: string;
  defaultLabel?: string;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function AccountSlidePickerPanel({
  accounts,
  selectedId,
  onSelect,
  onBack,
  title,
  searchPlaceholder,
  noResultsText,
  defaultLabel,
  allowEmpty = false,
  emptyLabel,
}: AccountSlidePickerPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(q));
  }, [accounts, searchTerm]);

  const recentIds = getRecentFinancialAccountIds();
  const sortedAccounts = sortAccountsByRecent(filtered, recentIds);

  function handlePick(accountId: string) {
    if (accountId.trim()) {
      saveRecentFinancialAccountId(accountId);
    }
    setSearchTerm("");
    onSelect(accountId);
  }

  function handleBack() {
    setSearchTerm("");
    onBack();
  }

  const showEmptyRow = allowEmpty && emptyLabel;

  return (
    <div
      className={cn(
        "absolute z-10 flex min-h-0 flex-col overflow-hidden rounded-lg bg-[#FDFAF4] animate-in slide-in-from-right-8 duration-200 dark:bg-stone-950",
        /* Bleed past DialogContent p-6 so the sheet fills the dialog; matches rounded-lg / max-md:rounded-none on parent */
        "-inset-6 max-md:rounded-none",
      )}
    >
      <div className="flex shrink-0 items-center border-b border-[#D4C9B0] bg-[#FDFAF4] px-4 pb-3 pt-4 dark:border-stone-700 dark:bg-stone-950">
        <button
          type="button"
          onClick={handleBack}
          className="-ml-2 rounded-full p-2 text-[#6B5E4E] transition-colors hover:bg-[#F5F0E8] hover:text-[#3D3020] dark:text-stone-400 dark:hover:bg-stone-800"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="ml-2 text-lg font-bold leading-snug text-[#3D3020] dark:text-stone-100">{title}</h2>
      </div>

      <div className="shrink-0 border-b border-[#D4C9B0] bg-[#FDFAF4] p-4 dark:border-stone-700 dark:bg-stone-950">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-stone-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-[#D4C9B0] bg-white py-2.5 pl-10 pr-4 text-sm transition-all focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#FDFAF4] p-2 dark:bg-stone-950">
        {!showEmptyRow && sortedAccounts.length === 0 ? (
          <div className="py-10 text-center text-sm text-stone-500">{noResultsText}</div>
        ) : (
          <ul className="space-y-1">
            {showEmptyRow ? (
              <li>
                <button
                  type="button"
                  onClick={() => handlePick("")}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all",
                    selectedId === ""
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                      : "border-transparent hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                  )}
                >
                  <span
                    className={cn(
                      "font-medium",
                      selectedId === ""
                        ? "text-emerald-800 dark:text-emerald-300"
                        : "text-[#3D3020] dark:text-stone-200",
                    )}
                  >
                    {emptyLabel}
                  </span>
                  {selectedId === "" ? (
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  ) : null}
                </button>
              </li>
            ) : null}
            {sortedAccounts.map((account) => {
              const isSelected = selectedId === account.id;
              return (
                <li key={account.id}>
                  <button
                    type="button"
                    onClick={() => handlePick(account.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all",
                      isSelected
                        ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                        : "border-transparent hover:bg-[#F5F0E8] dark:hover:bg-stone-800",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <AccountIcon account={account} size="md" />
                      <span
                        className={cn(
                          "font-medium",
                          isSelected
                            ? "text-emerald-800 dark:text-emerald-300"
                            : "text-[#3D3020] dark:text-stone-200",
                        )}
                      >
                        {account.name}
                        {account.isDefault && defaultLabel ? ` (${defaultLabel})` : ""}
                      </span>
                    </div>
                    {isSelected ? (
                      <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : null}
                  </button>
                </li>
              );
            })}
            {sortedAccounts.length === 0 && searchTerm.trim() !== "" ? (
              <li className="py-8 text-center text-sm text-stone-500">{noResultsText}</li>
            ) : null}
          </ul>
        )}
      </div>
    </div>
  );
}
