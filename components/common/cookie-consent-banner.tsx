"use client";

import { useState } from "react";
import Link from "next/link";
import { useI18n } from "@/hooks/use-i18n";
import { useConsent } from "@/components/providers/consent-provider";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CookieConsentBanner() {
  const { t } = useI18n();
  const { hasDecided, mounted, acceptAll, savePreferences } = useConsent();

  const [modalOpen, setModalOpen] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  // Avoid SSR mismatch and skip rendering once user has already decided.
  if (!mounted || hasDecided) return null;

  const handleSavePreferences = () => {
    savePreferences(analyticsEnabled);
    setModalOpen(false);
  };

  return (
    <>
      {/* Banner */}
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed bottom-0 inset-x-0 z-50 border-t border-[#D4C9B0] bg-[#F5F0E8]/95 shadow-lg backdrop-blur-sm dark:border-stone-700 dark:bg-stone-900/95"
      >
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-[#6B5E4E] dark:text-stone-300">
              {t("cookieConsent.bannerDescription")}{" "}
              <Link
                href="/privacy"
                className="underline underline-offset-2 hover:text-[#3D3020] dark:hover:text-stone-100"
              >
                {t("cookieConsent.privacyPolicy")}
              </Link>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(true)}
                className="border-[#D4C9B0] text-[#6B5E4E] hover:bg-[#EDE8DC] dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                {t("cookieConsent.managePreferences")}
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                className="bg-[#3D3020] text-[#F5F0E8] hover:bg-[#2A2015] dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              >
                {t("cookieConsent.acceptAll")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cookieConsent.modal.title")}</DialogTitle>
            <DialogDescription>
              {t("cookieConsent.modal.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Necessary — always on */}
            <div className="flex items-start gap-3 rounded-lg border border-[#D4C9B0] p-3 dark:border-stone-700">
              <Checkbox
                id="consent-necessary"
                checked
                disabled
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="consent-necessary"
                  className="cursor-not-allowed font-medium"
                >
                  {t("cookieConsent.modal.necessary")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("cookieConsent.modal.necessaryDescription")}
                </p>
              </div>
            </div>

            {/* Analytics — optional */}
            <div className="flex items-start gap-3 rounded-lg border border-[#D4C9B0] p-3 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800/50">
              <Checkbox
                id="consent-analytics"
                checked={analyticsEnabled}
                onCheckedChange={(checked) =>
                  setAnalyticsEnabled(checked === true)
                }
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label
                  htmlFor="consent-analytics"
                  className="cursor-pointer font-medium"
                >
                  {t("cookieConsent.modal.analytics")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("cookieConsent.modal.analyticsDescription")}
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              {t("cookieConsent.modal.cancel")}
            </Button>
            <Button onClick={handleSavePreferences}>
              {t("cookieConsent.modal.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
