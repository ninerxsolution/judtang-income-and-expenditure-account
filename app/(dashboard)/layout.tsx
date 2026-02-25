/**
 * Dashboard route group layout (protected by proxy).
 * Wraps all dashboard pages.
 */
import type { Metadata } from "next";
import Link from "next/link";
import {
  LayoutDashboard,
  User,
  Monitor,
  Bell,
  Wallet,
  CalendarRange,
  Wrench,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { SessionTouch } from "@/components/dashboard/session-touch";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <SessionTouch />
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard" className="gap-2">
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/user" className="gap-2">
                <User className="h-4 w-4" />
                User
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/sessions" className="gap-2">
                <Monitor className="h-4 w-4" />
                Sessions
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/transactions" className="gap-2">
                <Wallet className="h-4 w-4" />
                Transactions
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/tools" className="gap-2">
                <Wrench className="h-4 w-4" />
                Tools
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/calendar" className="gap-2">
                <CalendarRange className="h-4 w-4" />
                Calendar
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/activity-log" className="gap-2">
                <Bell className="h-4 w-4" />
                Activity Log
              </Link>
            </Button>
          </nav>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
