"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Building2, Banknote, PiggyBank } from "lucide-react";
import { THAI_BANKS, BANK_OTHER, getBankIconColor, getBankLogoUrl } from "@/lib/thai-banks";
import { CardNetworkIcon } from "@/components/dashboard/card-type-select";
import { cn } from "@/lib/utils";
import { RowSelect, type RowSelectOption } from "@/components/dashboard/row-select";
import {
  getRecentFinancialAccountIds,
  saveRecentFinancialAccountId,
  sortAccountsByRecent,
} from "@/lib/recent-financial-accounts";

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
  /** When true (default), order options by most recently used (localStorage), like categories. */
  sortByRecent?: boolean;
};

export function AccountIcon({
  account,
  size = "md",
}: {
  account: Pick<AccountOption, "id" | "name" | "type" | "bankName" | "cardNetwork">;
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
  sortByRecent = true,
}: AccountComboboxProps) {
  const [mounted, setMounted] = useState(false);
  const [mruTick, setMruTick] = useState(0);
  useEffect(() => {
    // Defer MRU sort until after mount so server/client markup match (localStorage is client-only).
    queueMicrotask(() => setMounted(true));
  }, []);

  const recentIds = useMemo(
    () => {
      if (!sortByRecent || !mounted) return [];
      return getRecentFinancialAccountIds();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mruTick remaps list after MRU write
    [sortByRecent, mounted, mruTick, accounts],
  );

  const orderedAccounts = useMemo(() => {
    const filtered = accounts.filter((acc) => {
      if (filterByType && !filterByType(acc.type)) return false;
      return true;
    });
    if (!sortByRecent || !mounted) {
      return filtered;
    }
    return sortAccountsByRecent(filtered, recentIds);
  }, [accounts, filterByType, sortByRecent, mounted, recentIds]);

  const options: RowSelectOption<AccountOption>[] = orderedAccounts.map((acc) => ({
    value: acc.id,
    label: `${acc.name}${acc.isDefault && defaultLabel ? ` (${defaultLabel})` : ""}`,
    ...acc,
  }));

  function handleAccountChange(accountId: string) {
    if (sortByRecent && accountId.trim()) {
      saveRecentFinancialAccountId(accountId);
      setMruTick((t) => t + 1);
    }
    onChange(accountId);
  }

  return (
    <RowSelect<AccountOption>
      id={id}
      value={value}
      onChange={handleAccountChange}
      options={options}
      excludeValues={excludeIds}
      allowEmpty={allowEmpty}
      emptyLabel={emptyLabel}
      renderOptionIcon={(opt) => <AccountIcon account={opt} size="sm" />}
      className={className}
    />
  );
}
