"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Shield } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/hooks/use-i18n";
import { getGracePeriodDays } from "@/lib/grace-period";

export function DeactivateAccountSection() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graceDays = getGracePeriodDays();

  async function handleDeactivate() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/users/me/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? t("settings.privacy.deactivateError"));
        setPending(false);
        return;
      }
      const deleteAfter = json.deleteAfter as string | undefined;
      setOpen(false);
      const callbackUrl = deleteAfter
        ? `/sign-in?deactivated=${encodeURIComponent(new Date(deleteAfter).toLocaleDateString(undefined, { dateStyle: "medium" }))}`
        : "/sign-in";
      await signOut({ callbackUrl });
    } catch {
      setError(t("settings.privacy.deactivateError"));
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-[#3D3020] dark:text-stone-100">
              {t("settings.privacy.title")}
            </h2>
            <p className="mt-1 text-xs text-[#6B5E4E] dark:text-stone-400">
              {t("settings.privacy.description")}
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
        onClick={() => setOpen(true)}
      >
        {t("settings.privacy.deactivateAccount")}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none">
          <AlertDialogHeader className="shrink-0">
            <AlertDialogTitle>
              {t("settings.privacy.deactivateConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  {t("settings.privacy.deactivateConfirmMessage", { count: graceDays })}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="deactivate-reason" className="text-xs">
                    {t("settings.privacy.deactivateReasonLabel")}
                  </Label>
                  <Textarea
                    id="deactivate-reason"
                    placeholder={t("settings.privacy.deactivateReasonPlaceholder")}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="shrink-0">
            <AlertDialogCancel disabled={pending}>
              {t("common.actions.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDeactivate();
              }}
              disabled={pending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {pending ? t("settings.privacy.deactivating") : t("settings.privacy.deactivateButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
