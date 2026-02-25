"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Monitor,
  Wallet,
  Wrench,
  CalendarRange,
  Bell,
} from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
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

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "User",
    href: "/dashboard/user",
    icon: User,
  },
  {
    title: "Sessions",
    href: "/dashboard/sessions",
    icon: Monitor,
  },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: Wallet,
  },
  {
    title: "Tools",
    href: "/dashboard/tools",
    icon: Wrench,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: CalendarRange,
  },
  {
    title: "Activity Log",
    href: "/dashboard/activity-log",
    icon: Bell,
  },
] as const;

export function AppSidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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
                    (pathname?.startsWith(item.href) &&
                      item.href !== "/dashboard");

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
          <LogoutButton />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <div>
          {/* profile user with setting menu dropdown */}
          </div>
        </header>
        <div className="flex-1">
          {children}
        </div>
      </SidebarInset>
    </>
  );
}

