"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  List,
  CalendarRange,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "accounts", href: "/dashboard/accounts", icon: Wallet },
  { key: "calendar", href: "/dashboard/calendar", icon: CalendarRange },
  { key: "transactions", href: "/dashboard/transactions", icon: List },
] as const;

const activeColor = "rgb(92, 107, 82)";
const inactiveColor = "rgb(160, 144, 128)";
const navBg = "rgb(253, 250, 244)";
const navBorder = "rgb(221, 213, 187)";

export function MobileBottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { t } = useI18n();

  if (!isMobile) {
    return null;
  }

  return (
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
    </nav>
  );
}
