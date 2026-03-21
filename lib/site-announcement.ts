import type { SiteAnnouncement as SiteAnnouncementRow } from "@prisma/client";
import type { Announcement } from "@/lib/announcement";

export type AdminSiteAnnouncementDto = {
  enabled: boolean;
  keySlug: string;
  titleTh: string;
  titleEn: string;
  contentTh: string;
  contentEn: string;
  image: string;
  imageAltTh: string;
  imageAltEn: string;
  startAt: string | null;
  endAt: string | null;
  showOnce: boolean;
  dismissible: boolean;
  actionUrl: string;
  actionLabelTh: string;
  actionLabelEn: string;
  updatedAt: string;
};

function formatDateAsYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function rowToAdminDto(row: SiteAnnouncementRow): AdminSiteAnnouncementDto {
  return {
    enabled: row.enabled,
    keySlug: row.keySlug,
    titleTh: row.titleTh,
    titleEn: row.titleEn,
    contentTh: row.contentTh ?? "",
    contentEn: row.contentEn ?? "",
    image: row.image,
    imageAltTh: row.imageAltTh ?? "",
    imageAltEn: row.imageAltEn ?? "",
    startAt: row.startAt ? formatDateAsYmdUtc(row.startAt) : null,
    endAt: row.endAt ? formatDateAsYmdUtc(row.endAt) : null,
    showOnce: row.showOnce,
    dismissible: row.dismissible,
    actionUrl: row.actionUrl ?? "",
    actionLabelTh: row.actionLabelTh ?? "",
    actionLabelEn: row.actionLabelEn ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const DEFAULT_ADMIN_SITE_ANNOUNCEMENT_DTO: AdminSiteAnnouncementDto = {
  enabled: false,
  keySlug: "default",
  titleTh: "",
  titleEn: "",
  contentTh: "",
  contentEn: "",
  image: "/announcements/promo.png",
  imageAltTh: "",
  imageAltEn: "",
  startAt: null,
  endAt: null,
  showOnce: false,
  dismissible: true,
  actionUrl: "",
  actionLabelTh: "",
  actionLabelEn: "",
  updatedAt: new Date(0).toISOString(),
};

/**
 * Maps DB row to public API payload. Mirrors previous behaviour of GET /api/announcement
 * (enabled + date range).
 */
export function rowToPublicAnnouncement(row: SiteAnnouncementRow): Announcement | null {
  if (!row.enabled) return null;

  const today = new Date().toISOString().slice(0, 10);
  if (row.startAt) {
    const s = formatDateAsYmdUtc(row.startAt);
    if (today < s) return null;
  }
  if (row.endAt) {
    const e = formatDateAsYmdUtc(row.endAt);
    if (today > e) return null;
  }

  const title = { th: row.titleTh, en: row.titleEn };
  const hasContent = Boolean(row.contentTh?.trim() || row.contentEn?.trim());
  const content = hasContent
    ? { th: row.contentTh ?? "", en: row.contentEn ?? "" }
    : undefined;

  const hasAlt = Boolean(row.imageAltTh?.trim() || row.imageAltEn?.trim());
  const image_alt = hasAlt
    ? { th: row.imageAltTh ?? "", en: row.imageAltEn ?? "" }
    : undefined;

  const actionUrlTrim = row.actionUrl?.trim() ?? "";
  const hasActionLabels = Boolean(row.actionLabelTh?.trim() || row.actionLabelEn?.trim());
  const action_label =
    actionUrlTrim && hasActionLabels
      ? { th: row.actionLabelTh ?? "", en: row.actionLabelEn ?? "" }
      : undefined;

  return {
    id: row.keySlug,
    title,
    content,
    image: row.image,
    image_alt,
    start_at: row.startAt ? formatDateAsYmdUtc(row.startAt) : "",
    end_at: row.endAt ? formatDateAsYmdUtc(row.endAt) : "",
    show_once: row.showOnce,
    dismissible: row.dismissible,
    action_url: actionUrlTrim || undefined,
    action_label,
  };
}

export function parseOptionalYmdToUtcDate(value: string | null | undefined): Date | null {
  const t = value?.trim();
  if (!t) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

type ParsedPut = {
  enabled: boolean;
  keySlug: string;
  titleTh: string;
  titleEn: string;
  contentTh: string;
  contentEn: string;
  image: string;
  imageAltTh: string;
  imageAltEn: string;
  startAt: Date | null;
  endAt: Date | null;
  showOnce: boolean;
  dismissible: boolean;
  actionUrl: string | null;
  actionLabelTh: string;
  actionLabelEn: string;
};

/** Form field keys for inline validation (matches admin announcement form). */
export type AnnouncementFormField =
  | "form"
  | "keySlug"
  | "titleTh"
  | "titleEn"
  | "image"
  | "startAt"
  | "endAt"
  | "dateRange"
  | "actionUrl"
  | "actionLabelTh"
  | "actionLabelEn";

/** Stable codes for i18n: `admin.announcementPage.validation.<code>`. */
export type AnnouncementValidationCode =
  | "invalidJson"
  | "keySlugInvalid"
  | "titleThRequired"
  | "titleEnRequired"
  | "imageRequired"
  | "startAtInvalid"
  | "endAtInvalid"
  | "dateRangeInvalid"
  | "actionLabelThRequired"
  | "actionLabelEnRequired";

export type AnnouncementFieldErrors = Partial<
  Record<AnnouncementFormField, AnnouncementValidationCode>
>;

export function parseAdminSiteAnnouncementPutBody(
  body: unknown
):
  | { ok: true; data: ParsedPut }
  | { ok: false; message: string; fieldErrors: AnnouncementFieldErrors } {
  if (body === null || typeof body !== "object") {
    return {
      ok: false,
      message: "Invalid JSON body",
      fieldErrors: { form: "invalidJson" },
    };
  }
  const o = body as Record<string, unknown>;

  const enabled = typeof o.enabled === "boolean" ? o.enabled : false;
  const keySlug = typeof o.keySlug === "string" ? o.keySlug.trim() : "";
  const titleTh = typeof o.titleTh === "string" ? o.titleTh.trim() : "";
  const titleEn = typeof o.titleEn === "string" ? o.titleEn.trim() : "";
  const contentTh = typeof o.contentTh === "string" ? o.contentTh : "";
  const contentEn = typeof o.contentEn === "string" ? o.contentEn : "";
  const image = typeof o.image === "string" ? o.image.trim() : "";
  const imageAltTh = typeof o.imageAltTh === "string" ? o.imageAltTh : "";
  const imageAltEn = typeof o.imageAltEn === "string" ? o.imageAltEn : "";
  const showOnce = typeof o.showOnce === "boolean" ? o.showOnce : false;
  const dismissible = typeof o.dismissible === "boolean" ? o.dismissible : true;

  const startRaw = o.startAt === null || o.startAt === undefined ? null : o.startAt;
  const endRaw = o.endAt === null || o.endAt === undefined ? null : o.endAt;
  const startAt =
    typeof startRaw === "string" ? parseOptionalYmdToUtcDate(startRaw) : null;
  const endAt = typeof endRaw === "string" ? parseOptionalYmdToUtcDate(endRaw) : null;

  const actionUrlRaw = typeof o.actionUrl === "string" ? o.actionUrl.trim() : "";
  const actionLabelTh = typeof o.actionLabelTh === "string" ? o.actionLabelTh.trim() : "";
  const actionLabelEn = typeof o.actionLabelEn === "string" ? o.actionLabelEn.trim() : "";

  const fieldErrors: AnnouncementFieldErrors = {};

  if (typeof startRaw === "string" && startRaw.trim() !== "" && startAt === null) {
    fieldErrors.startAt = "startAtInvalid";
  }
  if (typeof endRaw === "string" && endRaw.trim() !== "" && endAt === null) {
    fieldErrors.endAt = "endAtInvalid";
  }

  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(keySlug)) {
    fieldErrors.keySlug = "keySlugInvalid";
  }

  if (enabled) {
    if (titleTh.length === 0) fieldErrors.titleTh = "titleThRequired";
    if (titleEn.length === 0) fieldErrors.titleEn = "titleEnRequired";
    if (image.length === 0) fieldErrors.image = "imageRequired";
  }

  if (startAt && endAt && startAt.getTime() > endAt.getTime()) {
    fieldErrors.dateRange = "dateRangeInvalid";
  }

  if (actionUrlRaw.length > 0) {
    if (actionLabelTh.length === 0) fieldErrors.actionLabelTh = "actionLabelThRequired";
    if (actionLabelEn.length === 0) fieldErrors.actionLabelEn = "actionLabelEnRequired";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Validation failed",
      fieldErrors,
    };
  }

  return {
    ok: true,
    data: {
      enabled,
      keySlug,
      titleTh,
      titleEn,
      contentTh,
      contentEn,
      image,
      imageAltTh,
      imageAltEn,
      startAt,
      endAt,
      showOnce,
      dismissible,
      actionUrl: actionUrlRaw.length > 0 ? actionUrlRaw : null,
      actionLabelTh,
      actionLabelEn,
    },
  };
}
