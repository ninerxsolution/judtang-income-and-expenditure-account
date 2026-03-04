"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Wallet,
  List,
  CalendarRange,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";
import { useTransactionForm } from "@/components/dashboard/transaction-form-context";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "accounts", href: "/dashboard/accounts", icon: Wallet },
  { key: "calendar", href: "/dashboard/calendar", icon: CalendarRange },
  { key: "transactions", href: "/dashboard/transactions", icon: List },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const { openQuickAdd } = useTransactionForm();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const navBg = isDark ? "rgb(28, 25, 23)" : "rgb(253, 250, 244)";
  const navBorder = isDark ? "rgb(68, 64, 60)" : "rgb(221, 213, 187)";
  const activeColor = isDark ? "rgb(212, 212, 212)" : "rgb(92, 107, 82)";
  const inactiveColor = isDark ? "rgb(163, 163, 163)" : "rgb(160, 144, 128)";
  const [quickOpen, setQuickOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (closeTimeoutRef.current) return;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      setQuickOpen(false);
      setIsClosing(false);
      closeTimeoutRef.current = null;
    }, 200);
  }, []);

  if (!isMobile) {
    return null;
  }

  function handleQuickAdd(type: "INCOME" | "EXPENSE") {
    openQuickAdd(type);
    handleClose();
  }

  const showOverlay = quickOpen || isClosing;

  return (
    <>
      {showOverlay && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t("common.close")}
            className={cn(
              "absolute inset-0 -z-10 bg-black/50 duration-200",
              isClosing
                ? "animate-out fade-out-0"
                : "animate-in fade-in-0"
            )}
            onClick={handleClose}
          />
          <div
            className={cn(
              "fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 duration-200",
              isClosing
                ? "animate-out slide-out-to-bottom fade-out-0"
                : "animate-in slide-in-from-bottom-4 fade-in-0"
            )}
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-sm px-3 py-1.5 rounded-2xl font-semibold shadow-sm",
                  "border border-[#D4C9B0] bg-[#FDFAF4] text-[#3D3020]",
                  "dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                )}
              >
                {t("dashboard.summary.recordIncome")}
              </span>
              <button
                type="button"
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white",
                  "border border-emerald-600/80 bg-emerald-600/80 shadow-md",
                  "transition-colors hover:bg-emerald-700",
                  "dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
                )}
                onClick={() => handleQuickAdd("INCOME")}
                aria-label={t("dashboard.summary.recordIncome")}
              >
                <ArrowDownCircle className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-sm px-3 py-1.5 rounded-2xl font-semibold shadow-sm",
                  "border border-[#D4C9B0] bg-[#FDFAF4] text-[#3D3020]",
                  "dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
                )}
              >
                {t("dashboard.summary.recordExpense")}
              </span>
              <button
                type="button"
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white",
                  "border border-red-600/80 bg-red-600/80 shadow-md",
                  "transition-colors hover:bg-red-700",
                  "dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/50"
                )}
                onClick={() => handleQuickAdd("EXPENSE")}
                aria-label={t("dashboard.summary.recordExpense")}
              >
                <ArrowUpCircle className="h-[18px] w-[18px]" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      )}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch"
        style={{
          backgroundColor: navBg,
          borderTop: `1px solid ${navBorder}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label={t("dashboard.sidebar.navigation")}
      >
        
        {navItems.map((item) => {
          const Icon = item.icon;
          const isHome = item.href === "/dashboard";
          const isActive = isHome
            ? pathname === "/dashboard"
            : pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative",
                "transition-colors"
              )}
              style={{
                color: isActive ? activeColor : inactiveColor,
              }}
              aria-current={isActive ? "page" : undefined}
              aria-label={t(`dashboard.sidebar.${item.key}`)}
            >
              {isActive && (
                <span
                  className="absolute top-0 w-8 h-0.5 rounded-full"
                  style={{ backgroundColor: activeColor }}
                  aria-hidden
                />
              )}
              <span
                style={{
                  transform: isActive ? "translateY(-1px) scale(1.18)" : "none",
                }}
              >
                <Icon className="h-[17px] w-[17px] shrink-0" aria-hidden />
              </span>
              <span
                className="text-[12px]"
                style={{
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {t(`dashboard.sidebar.${item.key}`)}
              </span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setQuickOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors"
          style={{ color: inactiveColor }}
          aria-label={t("dashboard.summary.quickAddTitle")}
        >
          <Plus className="h-[17px] w-[17px] shrink-0" aria-hidden />
          <span className="text-[12px]" style={{ fontWeight: 400 }}>
            {t("dashboard.summary.quickAddTitle")}
          </span>
        </button>
      </nav>
    </>
  );
}
