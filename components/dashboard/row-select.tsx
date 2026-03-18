"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDropdownOpenUpward } from "@/hooks/use-dropdown-open-upward";

const DROPDOWN_STYLES =
  "flex w-full items-center justify-between gap-2 rounded-md border border-[#D4C9B0] px-3 py-2 text-left text-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 hover:bg-[#F5F0E8] dark:hover:bg-stone-800";
const OPTION_STYLES =
  "flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-[#F5F0E8] dark:hover:bg-stone-800";
const OPTION_SELECTED = "bg-[#EBF4E3] dark:bg-stone-800";
const POPOVER_BASE =
  "absolute left-0 right-0 z-[100] max-h-60 overflow-auto rounded-md border border-[#D4C9B0] bg-[#FDFAF4] p-1 shadow-lg dark:border-stone-700 dark:bg-stone-900";
const ICON_BOX =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E8E0C8] dark:bg-stone-700";

export type RowSelectOption<T = Record<string, unknown>> = {
  value: string;
  label: string;
} & T;

type RowSelectProps<T = unknown> = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: RowSelectOption<T>[];
  excludeValues?: string[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  renderOptionIcon?: (option: RowSelectOption<T>) => React.ReactNode;
  className?: string;
};

export function RowSelect<T = unknown>({
  id,
  value,
  onChange,
  options,
  excludeValues = [],
  allowEmpty = false,
  emptyLabel = "—",
  renderOptionIcon,
  className,
}: RowSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openUpward = useDropdownOpenUpward(containerRef, open);

  const filteredOptions = options.filter((opt) => !excludeValues.includes(opt.value));
  const found = options.find((o) => o.value === value);
  const selected = value && found ? found : null;
  const displayLabel = selected ? selected.label : emptyLabel;

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
          {value && selected && renderOptionIcon ? (
            <div className="flex shrink-0 items-center justify-center">
              {renderOptionIcon(selected)}
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
              {renderOptionIcon ? (
                <div className={cn(ICON_BOX)}>
                  <span className="text-xs font-medium text-[#A09080] dark:text-stone-400">
                    —
                  </span>
                </div>
              ) : null}
              {emptyLabel}
            </button>
          )}
          {filteredOptions.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(OPTION_STYLES, isSelected && OPTION_SELECTED)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {renderOptionIcon ? (
                  <div className="flex shrink-0 items-center justify-center">
                    {renderOptionIcon(opt)}
                  </div>
                ) : null}
                {opt.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
