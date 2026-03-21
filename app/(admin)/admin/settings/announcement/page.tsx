"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/hooks/use-i18n";
import { toast } from "sonner";
import type { AdminSiteAnnouncementDto } from "@/lib/site-announcement";
import {
  DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO,
  parseAdminSiteAnnouncementPutBody,
  type AnnouncementFieldErrors,
  type AnnouncementFormField,
  type AnnouncementValidationCode,
} from "@/lib/site-announcement";
import { cn } from "@/lib/utils";

function dtoToFormState(d: AdminSiteAnnouncementDto): AdminSiteAnnouncementDto {
  return { ...d };
}

function inputErrorClass(hasError: boolean): string {
  return cn(
    hasError && "border-destructive border-2 focus-visible:border-destructive focus-visible:ring-destructive/30"
  );
}

export default function AdminAnnouncementSettingsPage() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AdminSiteAnnouncementDto>(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
  const [fieldErrors, setFieldErrors] = useState<AnnouncementFieldErrors>({});

  function clearFieldError(field: AnnouncementFormField): void {
    setFieldErrors((prev) => {
      if (prev[field] === undefined) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function validationText(code: AnnouncementValidationCode | undefined): string | undefined {
    if (!code) return undefined;
    switch (code) {
      case "invalidJson":
        return t("admin.announcementPage.validation.invalidJson");
      case "keySlugInvalid":
        return t("admin.announcementPage.validation.keySlugInvalid");
      case "titleThRequired":
        return t("admin.announcementPage.validation.titleThRequired");
      case "titleEnRequired":
        return t("admin.announcementPage.validation.titleEnRequired");
      case "imageRequired":
        return t("admin.announcementPage.validation.imageRequired");
      case "startAtInvalid":
        return t("admin.announcementPage.validation.startAtInvalid");
      case "endAtInvalid":
        return t("admin.announcementPage.validation.endAtInvalid");
      case "dateRangeInvalid":
        return t("admin.announcementPage.validation.dateRangeInvalid");
      case "actionLabelThRequired":
        return t("admin.announcementPage.validation.actionLabelThRequired");
      case "actionLabelEnRequired":
        return t("admin.announcementPage.validation.actionLabelEnRequired");
      default: {
        const _exhaustive: never = code;
        return _exhaustive;
      }
    }
  }

  const load = useCallback(async () => {
    setDataLoading(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        credentials: "include",
        cache: "no-store",
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        toast.error(t("admin.announcementPage.loadFailed"));
        setForm(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
        return;
      }
      if (res.status === 403) {
        toast.error(t("admin.announcementPage.loadForbidden"));
        setForm(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
        return;
      }
      if (!res.ok) {
        toast.error(t("admin.announcementPage.loadFailed"));
        setForm(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
        return;
      }
      const data = (await res.json()) as AdminSiteAnnouncementDto;
      setForm(dtoToFormState(data));
      setFieldErrors({});
    } catch {
      toast.error(t("admin.announcementPage.loadFailed"));
      setForm(DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO);
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (sessionStatus === "loading") return;
    if (sessionStatus === "unauthenticated") {
      router.replace("/sign-in?callbackUrl=/admin/settings/announcement");
      return;
    }
    void load();
  }, [sessionStatus, load, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      enabled: form.enabled,
      keySlug: form.keySlug,
      titleTh: form.titleTh,
      titleEn: form.titleEn,
      contentTh: form.contentTh,
      contentEn: form.contentEn,
      image: form.image,
      imageAltTh: form.imageAltTh,
      imageAltEn: form.imageAltEn,
      startAt: form.startAt?.trim() ? form.startAt : null,
      endAt: form.endAt?.trim() ? form.endAt : null,
      showOnce: form.showOnce,
      dismissible: form.dismissible,
      actionUrl: form.actionUrl,
      actionLabelTh: form.actionLabelTh,
      actionLabelEn: form.actionLabelEn,
    };

    const parsed = parseAdminSiteAnnouncementPutBody(payload);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      toast.error(t("admin.announcementPage.validation.fixFields"));
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        toast.error(t("admin.announcementPage.saveFailed"));
        return;
      }
      const json = (await res.json()) as
        | { error?: string; fieldErrors?: AnnouncementFieldErrors; code?: string }
        | AdminSiteAnnouncementDto;

      if (!res.ok) {
        const errBody = json as {
          error?: string;
          fieldErrors?: AnnouncementFieldErrors;
          code?: string;
        };
        if (errBody.fieldErrors && Object.keys(errBody.fieldErrors).length > 0) {
          setFieldErrors(errBody.fieldErrors);
        }
        if (res.status === 503 && errBody.error === "SITE_ANNOUNCEMENT_TABLE_MISSING") {
          toast.error(t("admin.announcementPage.saveFailedDbSchema"));
        } else if (errBody.fieldErrors && Object.keys(errBody.fieldErrors).length > 0) {
          toast.error(t("admin.announcementPage.validation.fixFields"));
        } else if (res.status === 403) {
          toast.error(t("admin.announcementPage.saveForbidden"));
        } else if (typeof errBody.error === "string" && errBody.error) {
          toast.error(errBody.error);
        } else {
          toast.error(t("admin.announcementPage.saveFailed"));
        }
        return;
      }
      setForm(dtoToFormState(json as AdminSiteAnnouncementDto));
      setFieldErrors({});
      toast.success(t("admin.announcementPage.saved"));
    } catch {
      toast.error(t("admin.announcementPage.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  const dateLabelClass = "text-sm font-medium text-foreground";
  const showSkeleton = sessionStatus === "loading" || dataLoading;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 w-fit gap-1" asChild>
            <Link href="/admin/settings">
              <ArrowLeft className="h-4 w-4" />
              {t("admin.announcementPage.backToSettings")}
            </Link>
          </Button>
          <h1 className="text-xl font-semibold">{t("admin.announcementPage.title")}</h1>
          <p className="mt-1 text-sm text-[#6B5E4E] dark:text-stone-400">
            {t("admin.announcementPage.subtitle")}
          </p>
        </div>
      </div>

      {showSkeleton ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.announcementPage.enabled")}</CardTitle>
            <CardDescription>{t("admin.announcementPage.enabledHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {fieldErrors.form ? (
            <p className="text-sm text-destructive" role="alert">
              {validationText(fieldErrors.form)}
            </p>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.enabled")}</CardTitle>
              <CardDescription>{t("admin.announcementPage.enabledHint")}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-2">
              <Checkbox
                id="ann-enabled"
                checked={form.enabled}
                onCheckedChange={(c) => {
                  setForm((prev) => ({ ...prev, enabled: c === true }));
                  setFieldErrors((prev) => {
                    const next = { ...prev };
                    delete next.titleTh;
                    delete next.titleEn;
                    delete next.image;
                    return next;
                  });
                }}
              />
              <Label htmlFor="ann-enabled" className="cursor-pointer font-normal">
                {t("admin.announcementPage.enabled")}
              </Label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.keySlug")}</CardTitle>
              <CardDescription>{t("admin.announcementPage.keySlugHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Input
                value={form.keySlug}
                onChange={(e) => {
                  setForm((p) => ({ ...p, keySlug: e.target.value }));
                  clearFieldError("keySlug");
                }}
                className={cn("max-w-md font-mono text-sm", inputErrorClass(Boolean(fieldErrors.keySlug)))}
                aria-invalid={Boolean(fieldErrors.keySlug)}
                autoComplete="off"
              />
              {fieldErrors.keySlug ? (
                <p className="text-sm text-destructive" role="alert">
                  {validationText(fieldErrors.keySlug)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.titleTh")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title-th">{t("admin.announcementPage.titleTh")}</Label>
                <Input
                  id="title-th"
                  value={form.titleTh}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, titleTh: e.target.value }));
                    clearFieldError("titleTh");
                  }}
                  className={inputErrorClass(Boolean(fieldErrors.titleTh))}
                  aria-invalid={Boolean(fieldErrors.titleTh)}
                />
                {fieldErrors.titleTh ? (
                  <p className="text-sm text-destructive" role="alert">
                    {validationText(fieldErrors.titleTh)}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="title-en">{t("admin.announcementPage.titleEn")}</Label>
                <Input
                  id="title-en"
                  value={form.titleEn}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, titleEn: e.target.value }));
                    clearFieldError("titleEn");
                  }}
                  className={inputErrorClass(Boolean(fieldErrors.titleEn))}
                  aria-invalid={Boolean(fieldErrors.titleEn)}
                />
                {fieldErrors.titleEn ? (
                  <p className="text-sm text-destructive" role="alert">
                    {validationText(fieldErrors.titleEn)}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.contentTh")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="content-th">{t("admin.announcementPage.contentTh")}</Label>
                <Textarea
                  id="content-th"
                  rows={4}
                  value={form.contentTh}
                  onChange={(e) => setForm((p) => ({ ...p, contentTh: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content-en">{t("admin.announcementPage.contentEn")}</Label>
                <Textarea
                  id="content-en"
                  rows={4}
                  value={form.contentEn}
                  onChange={(e) => setForm((p) => ({ ...p, contentEn: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.image")}</CardTitle>
              <CardDescription>{t("admin.announcementPage.imageHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1 max-w-2xl">
                <Input
                  value={form.image}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, image: e.target.value }));
                    clearFieldError("image");
                  }}
                  className={cn("font-mono text-sm", inputErrorClass(Boolean(fieldErrors.image)))}
                  aria-invalid={Boolean(fieldErrors.image)}
                />
                {fieldErrors.image ? (
                  <p className="text-sm text-destructive" role="alert">
                    {validationText(fieldErrors.image)}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="alt-th">{t("admin.announcementPage.imageAltTh")}</Label>
                  <Input
                    id="alt-th"
                    value={form.imageAltTh}
                    onChange={(e) => setForm((p) => ({ ...p, imageAltTh: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="alt-en">{t("admin.announcementPage.imageAltEn")}</Label>
                  <Input
                    id="alt-en"
                    value={form.imageAltEn}
                    onChange={(e) => setForm((p) => ({ ...p, imageAltEn: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.startAt")}</CardTitle>
              <CardDescription>{t("admin.announcementPage.dateHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fieldErrors.dateRange ? (
                <p className="text-sm text-destructive" role="alert">
                  {validationText(fieldErrors.dateRange)}
                </p>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="start-at" className={dateLabelClass}>
                    {t("admin.announcementPage.startAt")}
                  </Label>
                  <Input
                    id="start-at"
                    type="date"
                    value={form.startAt ?? ""}
                    onChange={(e) => {
                      setForm((p) => ({
                        ...p,
                        startAt: e.target.value ? e.target.value : null,
                      }));
                      clearFieldError("startAt");
                      clearFieldError("dateRange");
                    }}
                    className={inputErrorClass(Boolean(fieldErrors.startAt))}
                    aria-invalid={Boolean(fieldErrors.startAt)}
                  />
                  {fieldErrors.startAt ? (
                    <p className="text-sm text-destructive" role="alert">
                      {validationText(fieldErrors.startAt)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-at" className={dateLabelClass}>
                    {t("admin.announcementPage.endAt")}
                  </Label>
                  <Input
                    id="end-at"
                    type="date"
                    value={form.endAt ?? ""}
                    onChange={(e) => {
                      setForm((p) => ({
                        ...p,
                        endAt: e.target.value ? e.target.value : null,
                      }));
                      clearFieldError("endAt");
                      clearFieldError("dateRange");
                    }}
                    className={inputErrorClass(Boolean(fieldErrors.endAt))}
                    aria-invalid={Boolean(fieldErrors.endAt)}
                  />
                  {fieldErrors.endAt ? (
                    <p className="text-sm text-destructive" role="alert">
                      {validationText(fieldErrors.endAt)}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.showOnce")}</CardTitle>
              <CardDescription>{t("admin.announcementPage.showOnceHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ann-show-once"
                  checked={form.showOnce}
                  onCheckedChange={(c) =>
                    setForm((prev) => ({ ...prev, showOnce: c === true }))
                  }
                />
                <Label htmlFor="ann-show-once" className="cursor-pointer font-normal">
                  {t("admin.announcementPage.showOnce")}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="ann-dismissible"
                  checked={form.dismissible}
                  onCheckedChange={(c) =>
                    setForm((prev) => ({ ...prev, dismissible: c === true }))
                  }
                />
                <Label htmlFor="ann-dismissible" className="cursor-pointer font-normal">
                  {t("admin.announcementPage.dismissible")}
                </Label>
              </div>
              <p className="text-xs text-muted-foreground">{t("admin.announcementPage.dismissibleHint")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("admin.announcementPage.actionUrl")}</CardTitle>
              <CardDescription>{t("admin.announcementPage.actionHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={form.actionUrl}
                onChange={(e) => {
                  setForm((p) => ({ ...p, actionUrl: e.target.value }));
                  clearFieldError("actionLabelTh");
                  clearFieldError("actionLabelEn");
                }}
                className="max-w-2xl font-mono text-sm"
                placeholder="https://"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="act-th">{t("admin.announcementPage.actionLabelTh")}</Label>
                  <Input
                    id="act-th"
                    value={form.actionLabelTh}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, actionLabelTh: e.target.value }));
                      clearFieldError("actionLabelTh");
                    }}
                    className={inputErrorClass(Boolean(fieldErrors.actionLabelTh))}
                    aria-invalid={Boolean(fieldErrors.actionLabelTh)}
                  />
                  {fieldErrors.actionLabelTh ? (
                    <p className="text-sm text-destructive" role="alert">
                      {validationText(fieldErrors.actionLabelTh)}
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="act-en">{t("admin.announcementPage.actionLabelEn")}</Label>
                  <Input
                    id="act-en"
                    value={form.actionLabelEn}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, actionLabelEn: e.target.value }));
                      clearFieldError("actionLabelEn");
                    }}
                    className={inputErrorClass(Boolean(fieldErrors.actionLabelEn))}
                    aria-invalid={Boolean(fieldErrors.actionLabelEn)}
                  />
                  {fieldErrors.actionLabelEn ? (
                    <p className="text-sm text-destructive" role="alert">
                      {validationText(fieldErrors.actionLabelEn)}
                    </p>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t("admin.announcementPage.lastUpdated")}:{" "}
              {form.updatedAt && form.updatedAt !== new Date(0).toISOString()
                ? new Date(form.updatedAt).toLocaleString(locale === "th" ? "th-TH" : "en-GB", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? `${t("admin.announcementPage.save")}…` : t("admin.announcementPage.save")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
