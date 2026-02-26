"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  User,
  Monitor,
  Wallet,
  Wrench,
  CalendarRange,
  Bell,
  Settings,
  LogOut,
  Maximize2,
  Minimize2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/dashboard/theme-toggle";
import { useFullscreen } from "@/components/dashboard/fullscreen-context";
import { useI18n } from "@/hooks/use-i18n";

type HeaderProfile = {
  name: string | null;
  email: string | null;
  image: string | null;
};

function getInitials(name: string | null | undefined, email: string | null | undefined) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0];
    const second = parts[1]?.[0];
    return (first ?? "").concat(second ?? "").toUpperCase() || "?";
  }
  if (email && email.length > 0) {
    const beforeAt = email.split("@")[0] ?? "";
    if (beforeAt.length >= 2) {
      return beforeAt.slice(0, 2).toUpperCase();
    }
    if (beforeAt.length === 1) {
      return beforeAt.toUpperCase();
    }
  }
  return "?";
}

function useHeaderProfile() {
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/users/me");
        if (!res.ok) {
          return;
        }
        const data = (await res.json()) as {
          name?: string | null;
          email?: string | null;
          image?: string | null;
        };
        if (!cancelled) {
          setProfile({
            name: data.name ?? null,
            email: data.email ?? null,
            image: data.image ?? null,
          });
        }
      } catch {
        // ignore header profile errors
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { profile, loading };
}

const navItems = [
  {
    key: "calendar",
    href: "/dashboard/calendar",
    icon: CalendarRange,
  },
  {
    key: "transactions",
    href: "/dashboard/transactions",
    icon: Wallet,
  },
  
] as const;

export function AppSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useHeaderProfile();
  const { t } = useI18n();
  const { fullscreen, toggleFullscreen } = useFullscreen();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success(t("auth.logout.success"));
    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:px-0 transition-all">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 min-w-8 min-h-8 items-center justify-center rounded-lg text-xs font-semibold">
              JT
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:max-w-0 max-w-full overflow-hidden transition-all">
              <span className="text-sm font-semibold">
                {t("common.appName")}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {t("dashboard.pageTitle.dashboard")}
              </span>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("dashboard.sidebar.navigation", {
                // fallback handled in translate()
              })}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (pathname?.startsWith(item.href));

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={t(`dashboard.sidebar.${item.key}`)}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{t(`dashboard.sidebar.${item.key}`)}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <div className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            beta 0.0.0-967-080.1
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-4">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:block h-8 w-8 rounded-full"
              aria-label={fullscreen ? t("dashboard.fullscreen.exit") : t("dashboard.fullscreen.enter")}
              onClick={toggleFullscreen}
            >
              {fullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
            <div className="w-px h-8 bg-border mx-1" aria-hidden="true" />

            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none flex gap-3 items-center cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-full p-2 px-3 transition-all">
                <div>
                  {profile?.name ?? t("dashboard.sidebar.account")}
                </div>
                <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors">
                  {getInitials(profile?.name, profile?.email)}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.name ?? t("dashboard.sidebar.account")}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {profile?.email ?? "—"}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/me" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("dashboard.sidebar.profile")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>{t("dashboard.sidebar.settings")}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => void handleLogout()}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("auth.logout.button")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}

