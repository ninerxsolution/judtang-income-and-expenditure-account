"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  FileText,
  Users,
  Activity,
  LineChart,
  Megaphone,
  Shield,
  PanelLeftIcon,
} from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { useAdminMode } from "@/components/dashboard/admin-mode-context";
import { useI18n } from "@/hooks/use-i18n";
import { useIsSmallScreen } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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

function isAdminNavActive(pathname: string | null, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/admin/settings") return false;
  return pathname?.startsWith(`${href}/`) ?? false;
}

const adminNavItems = [
  { key: "reports", href: "/admin/reports", icon: FileText },
  { key: "users", href: "/admin/users", icon: Users },
  { key: "transactionUsage", href: "/admin/transaction-usage", icon: LineChart },
  { key: "activityLog", href: "/admin/activity-log", icon: Activity },
  { key: "settings", href: "/admin/settings", icon: Settings },
  { key: "announcement", href: "/admin/settings/announcement", icon: Megaphone },
] as const;

export function AdminSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string })?.role === "ADMIN";
  const { toggleAdminMode } = useAdminMode();
  const { t } = useI18n();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? theme) === "dark";
  const isSmallScreen = useIsSmallScreen();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success(t("auth.logout.success"));
    await signOut({ callbackUrl: "/sign-in" });
  }

  if (!isAdmin) {
    router.push("/dashboard");
    return null;
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/admin/reports" className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:px-0 transition-all">
            <div className="relative">
              <Image
                src="/judtang-logo-temp.png"
                alt={t("common.appName")}
                width={32}
                height={32}
                className="h-8 w-8 min-w-8 min-h-8 shrink-0 rounded-lg object-cover"
              />
              <Shield className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:max-w-0 max-w-full overflow-hidden transition-all">
              <span className="text-sm font-semibold">
                {t("common.appName")}
              </span>
              <span className="text-[11px] text-primary">
                {t("admin.mode.adminMode")}
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
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isAdminNavActive(pathname, item.href);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={t(`admin.sidebar.${item.key}`)}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{t(`admin.sidebar.${item.key}`)}</span>
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
            Admin Mode
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4 md:static">
          {isSmallScreen ? (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 -ml-1"
                  aria-label={t("dashboard.sidebar.navigation")}
                  aria-haspopup="dialog"
                >
                  <PanelLeftIcon className="h-4 w-4" />
                  <span className="sr-only">{t("dashboard.sidebar.navigation")}</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(90vw,24rem)] gap-4 p-4 rounded-2xl bg-transparent dark:bg-transparent border-none shadow-none" showCloseButton={false}>
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {/* Navigation */}
                  </DialogTitle>
                </DialogHeader>
                <nav className="flex flex-col gap-3">
                  {adminNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = isAdminNavActive(pathname, item.href);
                    return (
                      <DialogClose asChild key={item.href}>
                        <Button
                          asChild
                          variant="ghost"
                          className={cn(
                            "w-full flex h-auto py-4 gap-2 justify-start rounded-xl transition-colors",
                            isActive
                              ? "bg-amber-200 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
                              : "bg-white/90 dark:bg-stone-800/90 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/90"
                          )}
                        >
                          <Link href={item.href}>
                            <Icon className="h-8 w-8 shrink-0" />
                            <span className="text-sm font-medium">
                              {t(`admin.sidebar.${item.key}`)}
                            </span>
                          </Link>
                        </Button>
                      </DialogClose>
                    );
                  })}
                </nav>
              </DialogContent>
            </Dialog>
          ) : (
            <SidebarTrigger className="-ml-1" />
          )}
          <div className="ml-auto flex items-center gap-1 sm:gap-4">
            <ThemeToggle className="hidden sm:flex" />
            <div className="w-px h-8 bg-border mx-1" aria-hidden="true" />

            {isSmallScreen ? (
              <Dialog>
                <DialogTrigger
                  className="outline-none flex gap-3 items-center cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-full p-2 px-3 transition-all"
                  aria-haspopup="dialog"
                  aria-label={t("dashboard.sidebar.account")}
                >
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors">
                    {getInitials(session?.user?.name, session?.user?.email)}
                  </div>
                </DialogTrigger>
                <DialogContent className="max-w-[min(90vw,20rem)] gap-0 p-0 rounded-2xl" showCloseButton={true}>
                  <DialogHeader className="p-4 pb-2">
                    <DialogTitle className="text-left">
                      {session?.user?.name ?? t("dashboard.sidebar.account")}
                    </DialogTitle>
                    <p className="text-xs leading-none text-muted-foreground text-left mt-1">
                      {session?.user?.email ?? "—"}
                    </p>
                  </DialogHeader>
                  <nav className="flex flex-col py-1">
                    {isAdmin && (
                      <>
                        <div className="my-1 h-px bg-border" />
                        <button
                          type="button"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer bg-amber-100 text-amber-900 hover:bg-amber-200 outline-none focus:bg-amber-200 focus:text-amber-900 w-full text-left"
                          onClick={() => {
                            toggleAdminMode();
                            router.push("/dashboard");
                          }}
                        >
                          <User className="h-4 w-4 shrink-0" />
                          <span>{t("admin.mode.toggleClient")}</span>
                        </button>
                      </>
                    )}
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground outline-none focus:bg-accent focus:text-accent-foreground w-full text-left"
                      onClick={() => {
                        setTheme(isDark ? "light" : "dark");
                      }}
                    >
                      {isDark ? (
                        <Sun className="h-4 w-4 shrink-0" />
                      ) : (
                        <Moon className="h-4 w-4 shrink-0" />
                      )}
                      <span>{t("dashboard.sidebar.theme")}</span>
                    </button>
                    <div className="my-1 h-px bg-border" />
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-destructive/10 hover:text-destructive outline-none focus:bg-destructive/10 focus:text-destructive w-full text-left text-destructive"
                      onClick={() => void handleLogout()}
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>{t("auth.logout.button")}</span>
                    </button>
                  </nav>
                </DialogContent>
              </Dialog>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger className="outline-none flex gap-3 items-center cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-full p-2 px-3 transition-all">
                  <div>
                    {session?.user?.name ?? t("dashboard.sidebar.account")}
                  </div>
                  <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors">
                    {getInitials(session?.user?.name, session?.user?.email)}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {session?.user?.name ?? t("dashboard.sidebar.account")}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session?.user?.email ?? "—"}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="block sm:hidden" />
                  <DropdownMenuItem
                    className="cursor-pointer flex sm:hidden"
                    onSelect={(e) => {
                      e.preventDefault();
                      setTheme(isDark ? "light" : "dark");
                    }}
                  >
                    {isDark ? (
                      <Sun className="mr-2 h-4 w-4" />
                    ) : (
                      <Moon className="mr-2 h-4 w-4" />
                    )}
                    <span>{t("dashboard.sidebar.theme")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer bg-amber-100 text-amber-900 hover:bg-amber-200"
                    onClick={() => {
                      toggleAdminMode();
                      router.push("/dashboard");
                    }}>
                    <User className="mr-2 h-4 w-4" />
                    <span>{t("admin.mode.toggleClient")}</span>
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
            )}
          </div>
        </header>
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-16 md:pb-0">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}
