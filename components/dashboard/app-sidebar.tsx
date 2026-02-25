"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "lucide-react";

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
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: Wallet,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: CalendarRange,
  }
] as const;

export function AppSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { profile } = useHeaderProfile();

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:px-0 transition-all">
            <div className="bg-primary text-primary-foreground flex h-8 w-8 min-w-8 min-h-8 items-center justify-center rounded-lg text-xs font-semibold">
              JT
            </div>
            <div className="flex flex-col leading-tight group-data-[collapsible=icon]:max-w-0 max-w-full overflow-hidden transition-all">
              <span className="text-sm font-semibold">Judtang</span>
              <span className="text-[11px] text-muted-foreground">
                Dashboard
              </span>
            </div>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
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
                        tooltip={item.title}
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.title}</span>
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
          <div className="text-xs text-muted-foreground">
            version 0.0.0-beta.1
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="ml-auto flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="outline-none">
                <div className="bg-primary/10 text-primary hover:bg-primary/20 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors">
                  {getInitials(profile?.name, profile?.email)}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.name ?? "Account"}
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
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
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

