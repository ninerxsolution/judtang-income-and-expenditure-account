"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/use-i18n";

export function LogoutButton() {
  const { t } = useI18n();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success(t("auth.logout.success"));
    await signOut({ callbackUrl: "/sign-in" });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleLogout()}
      className="gap-2"
    >
      <LogOut className="h-4 w-4" />
      {t("auth.logout.button")}
    </Button>
  );
}
