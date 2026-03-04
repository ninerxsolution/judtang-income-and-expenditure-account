"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Landmark,
  CalendarRange,
  Wallet,
} from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "dashboard", title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "accounts", title: "Accounts", href: "/dashboard/accounts", icon: Landmark },
  { key: "calendar", title: "Calendar", href: "/dashboard/calendar", icon: CalendarRange },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const { t } = useI18n();

  if (!isMobile) {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label={t("dashboard.sidebar.navigation")}
    >
      <div className="flex h-14 items-center justify-around px-6 gap-5">
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
                "flex flex-col items-center justify-center flex-1 py-2 transition-colors rounded-full",
                isActive
                  ? "text-primary bg-amber-300"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={t(`dashboard.sidebar.${item.key}`)}
            >
              <Icon className="h-6 w-6 shrink-0" aria-hidden />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
