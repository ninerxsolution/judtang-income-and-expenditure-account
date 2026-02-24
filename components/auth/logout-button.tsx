"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      className="inline-flex items-center gap-2 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700"
    >
      <LogOut className="h-4 w-4" />
      Log out
    </button>
  );
}
