/**
 * Dashboard route group layout (protected by proxy).
 * Wraps all dashboard pages.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, User, Monitor, Bell, Wallet } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { SessionTouch } from "@/components/dashboard/session-touch";

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
      <header className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <nav className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/user"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <User className="h-4 w-4" />
              User
            </Link>
            <Link
              href="/dashboard/sessions"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Monitor className="h-4 w-4" />
              Sessions
            </Link>
            <Link
              href="/dashboard/transactions"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Wallet className="h-4 w-4" />
              Transactions
            </Link>
            <Link
              href="/dashboard/activity-log"
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Bell className="h-4 w-4" />
              Activity Log
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
