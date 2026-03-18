"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";

type Settings = {
  maintenanceMode: boolean;
  announcement: string | null;
  adminReportEmail: string | null;
};

export default function AdminSettingsPage() {
  const { t } = useI18n();
  const [settings, setSettings] = useState<Settings>({
    maintenanceMode: false,
    announcement: null,
    adminReportEmail: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load settings from environment or API
    // For now, we'll use environment variables
    setSettings({
      maintenanceMode: process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true",
      announcement: process.env.NEXT_PUBLIC_ANNOUNCEMENT ?? null,
      adminReportEmail: process.env.ADMIN_REPORT_EMAIL ?? null,
    });
    setLoading(false);
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      // TODO: Implement API to save settings
      // For now, this is a placeholder
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(t("common.actions.save") + " " + t("common.actions.copied").replace("Copied", "saved"));
    } catch {
      toast.error(t("common.errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold">{t("admin.settings.title")}</h1>
        <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
          {t("admin.settings.subtitle")}
        </p>
      </header>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Maintenance Mode */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.settings.maintenanceMode")}</CardTitle>
                <CardDescription>
                  {t("admin.settings.maintenanceModeDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="maintenance-mode"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, maintenanceMode: e.target.checked }))
                }
                disabled
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="maintenance-mode" className="cursor-pointer">
                {t("admin.settings.maintenanceMode")}
              </Label>
            </div>
              </CardContent>
            </Card>

            {/* System Announcement */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.settings.announcement")}</CardTitle>
                <CardDescription>
                  {t("admin.settings.announcementDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    placeholder={t("admin.settings.announcementPlaceholder")}
                    value={settings.announcement ?? ""}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, announcement: e.target.value || null }))
                    }
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            {/* Email Settings */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.settings.emailSettings")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>{t("admin.settings.adminReportEmail")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("admin.settings.adminReportEmailDesc")}
                    </p>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      value={settings.adminReportEmail ?? ""}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, adminReportEmail: e.target.value || null }))
                      }
                      disabled
                      className="mt-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle>{t("admin.settings.dataManagement")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label>{t("admin.settings.exportAllData")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("admin.settings.exportAllDataDesc")}
                    </p>
                    <Button variant="outline" className="mt-2 w-full" disabled>
                      {t("admin.settings.exportAllData")}
                    </Button>
                  </div>
                  <div>
                    <Label>{t("admin.settings.backupDatabase")}</Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("admin.settings.backupDatabaseDesc")}
                    </p>
                    <Button variant="outline" className="mt-2 w-full" disabled>
                      {t("admin.settings.backupDatabase")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("common.actions.save") + "…" : t("common.actions.save")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
