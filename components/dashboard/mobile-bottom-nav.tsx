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
import { SlipUploadDialog } from "@/components/dashboard/slip-upload-dialog";

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
  const [slipDialogOpen, setSlipDialogOpen] = useState(false);
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

  function handleSlipUpload() {
    setSlipDialogOpen(true);
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
              "fixed bottom-24 right-0 left-0 z-50 flex flex-col items-center gap-3 duration-200",
              isClosing
                ? "animate-out slide-out-to-bottom fade-out-0"
                : "animate-in slide-in-from-bottom-4 fade-in-0"
            )}
          >
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-2xl font-semibold shadow-sm text-white",
                "border border-emerald-600/80 bg-emerald-600/80",
                "transition-colors hover:bg-emerald-700",
                "dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/50"
              )}
              onClick={() => handleQuickAdd("INCOME")}
              aria-label={t("dashboard.summary.recordIncome")}
            >
              <span className="text-sm">{t("dashboard.summary.recordIncome")}</span>
              <ArrowDownCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-2xl font-semibold shadow-sm text-white",
                "border border-red-600/80 bg-red-600/80",
                "transition-colors hover:bg-red-700",
                "dark:border-red-800 dark:bg-red-950/50 dark:text-red-200 dark:hover:bg-red-900/50"
              )}
              onClick={() => handleQuickAdd("EXPENSE")}
              aria-label={t("dashboard.summary.recordExpense")}
            >
              <span className="text-sm">{t("dashboard.summary.recordExpense")}</span>
              <ArrowUpCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-2xl font-semibold shadow-sm text-white",
                "border border-blue-600/80 bg-blue-600/80",
                "transition-colors hover:bg-blue-700",
                "dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200 dark:hover:bg-blue-900/50"
              )}
              onClick={() => handleSlipUpload()}
              aria-label="Slip upload"
            >
              <span className="text-sm">Slip upload</span>
              <ArrowUpCircle className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
      <SlipUploadDialog
        open={slipDialogOpen}
        onOpenChange={setSlipDialogOpen}
        onSuccess={() => setSlipDialogOpen(false)}
      />
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch h-18 min-[350px]:h-auto"
        style={{
          backgroundColor: navBg,
          borderTop: `1px solid ${navBorder}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label={t("dashboard.sidebar.navigation")}
      >
        
        {navItems.slice(0, 2).map((item) => {
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
                className="text-[12px] hidden min-[350px]:block"
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
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 relative transition-colors font-medium"
          style={{ color: inactiveColor }}
          aria-label={t("dashboard.summary.quickAddTitle")}
        >
          <Plus className="h-[17px] w-[17px] shrink-0 min-w-10 min-h-10 bg-amber-300 rounded-full p-3 -mt-8 max-[350px]:mt-0" aria-hidden />
          <span className="text-[12px] hidden min-[350px]:block" style={{ fontWeight: 500 }}>
            {t("dashboard.summary.quickAddTitle")}
          </span>
        </button>
        {navItems.slice(2, 4).map((item) => {
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
                className="text-[12px] hidden min-[350px]:block"
                style={{
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {t(`dashboard.sidebar.${item.key}`)}
              </span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
