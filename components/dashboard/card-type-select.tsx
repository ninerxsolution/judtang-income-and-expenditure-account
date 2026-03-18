"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, CreditCard, Landmark, Smartphone, Wallet } from "lucide-react";
import { useDropdownOpenUpward } from "@/hooks/use-dropdown-open-upward";
import { PaymentIcon } from "react-svg-credit-card-payment-icons";
import {
  CARD_ACCOUNT_TYPES,
  CARD_NETWORKS,
} from "@/lib/card-types";
import { cn } from "@/lib/utils";

const CARD_NETWORK_TO_PAYMENT_ICON: Record<string, string | null> = {
  visa: "Visa",
  master: "Mastercard",
  jcb: "Jcb",
  amex: "AmericanExpress",
  unionpay: "Unionpay",
  truemoney: null,
  other: null,
};

function CardAccountTypeIcon({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  if (id === "debit") return <Landmark className={cn("h-5 w-5 shrink-0 text-[#A09080] dark:text-stone-400", className)} />;
  if (id === "prepaid") return <Wallet className={cn("h-5 w-5 shrink-0 text-[#A09080] dark:text-stone-400", className)} />;
  if (id === "other") return <CreditCard className={cn("h-5 w-5 shrink-0 text-[#A09080] dark:text-stone-400", className)} />;
  return <CreditCard className={cn("h-5 w-5 shrink-0 text-[#A09080] dark:text-stone-400", className)} />;
}

export function CardNetworkIcon({
  id,
  className,
  size = 20,
}: {
  id: string;
  className?: string;
  size?: number;
}) {
  const paymentType = CARD_NETWORK_TO_PAYMENT_ICON[id];
  const w = Math.round(size * 1.6);
  const h = size;
  if (paymentType) {
    return (
      <PaymentIcon
        type={paymentType as "Visa" | "Mastercard" | "Jcb" | "AmericanExpress" | "Unionpay"}
        format="flatRounded"
        width={w}
        height={h}
        className={cn("shrink-0 object-contain", className)}
      />
    );
  }
  if (id === "truemoney") {
    return <Smartphone className={cn("h-5 w-5 shrink-0 text-[#A09080] dark:text-stone-400", className)} />;
  }
  return <CreditCard className={cn("h-5 w-5 shrink-0 text-[#A09080] dark:text-stone-400", className)} />;
}

const DROPDOWN_STYLES =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[#D4C9B0] px-3 py-2 text-left text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 hover:bg-[#F5F0E8] dark:hover:bg-stone-800";
const OPTION_STYLES =
  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800";
const OPTION_SELECTED = "bg-[#EBF4E3] dark:bg-stone-800";
const POPOVER_BASE =
  "absolute left-0 right-0 z-[100] max-h-60 overflow-auto rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900";
const ICON_BOX = "flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-[#E8E0C8] dark:bg-stone-700";

type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  localeKey: "th" | "en";
  className?: string;
  required?: boolean;
  options: readonly { id: string; nameTh: string; nameEn: string }[];
  renderIcon: (id: string) => React.ReactNode;
  allowEmpty?: boolean;
  emptyLabel?: string;
};

function CardDropdown({
  id,
  value,
  onChange,
  localeKey,
  className,
  required,
  options,
  renderIcon,
  allowEmpty = false,
  emptyLabel = "—",
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openUpward = useDropdownOpenUpward(containerRef, open);

  const selected = value ? options.find((o) => o.id === value) : null;
  const displayLabel = selected
    ? localeKey === "th"
      ? selected.nameTh
      : selected.nameEn
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
    <div ref={containerRef} className="relative" data-required={required}>
      <button
        type="button"
        id={id}
        onClick={() => setOpen((o) => !o)}
        className={cn(DROPDOWN_STYLES, className)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-3">
          {value ? (
            <div className={cn(ICON_BOX)}>
              {renderIcon(value)}
            </div>
          ) : null}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </button>
      {open && (
        <div
          className={cn(
            POPOVER_BASE,
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          )}
          role="listbox"
        >
          {allowEmpty && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className={cn(OPTION_STYLES, !value && OPTION_SELECTED)}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
                setOpen(false);
              }}
            >
              <div className={cn(ICON_BOX)}>
                <span className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                  —
                </span>
              </div>
              {emptyLabel}
            </button>
          )}
          {options.map((opt) => {
            const label = localeKey === "th" ? opt.nameTh : opt.nameEn;
            const isSelected = value === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(OPTION_STYLES, isSelected && OPTION_SELECTED)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.id);
                  setOpen(false);
                }}
              >
                <div className={cn(ICON_BOX)}>{renderIcon(opt.id)}</div>
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export type CardAccountTypeSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  localeKey: "th" | "en";
  className?: string;
  required?: boolean;
};

export function CardAccountTypeSelect({
  id,
  value,
  onChange,
  localeKey,
  className,
  required,
}: CardAccountTypeSelectProps) {
  return (
    <CardDropdown
      id={id}
      value={value}
      onChange={onChange}
      localeKey={localeKey}
      className={className}
      required={required}
      options={CARD_ACCOUNT_TYPES}
      renderIcon={(id) => <CardAccountTypeIcon id={id} />}
      allowEmpty={false}
    />
  );
}

export type CardNetworkSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  localeKey: "th" | "en";
  className?: string;
  required?: boolean;
};

export function CardNetworkSelect({
  id,
  value,
  onChange,
  localeKey,
  className,
  required = false,
}: CardNetworkSelectProps) {
  return (
    <CardDropdown
      id={id}
      value={value}
      onChange={onChange}
      localeKey={localeKey}
      className={className}
      required={required}
      options={CARD_NETWORKS}
      renderIcon={(id) => <CardNetworkIcon id={id} />}
      allowEmpty={true}
      emptyLabel="—"
    />
  );
}
