# Announcement Popup

**Type:** Config-driven modal on the home page  
**Route:** Shown on `/` (public landing) when enabled in the database  
**Config:** `SiteAnnouncement` table (singleton row `id = "default"`), edited at `/admin/settings/announcement` (ADMIN only)

---

## 1. Overview

An optional announcement popup appears on the home page (`/`) to promote campaigns, releases, or notices. Content is stored in the database and supports Thai and English. Admins enable or disable the popup and edit all fields from the admin UI; no `NEXT_PUBLIC_*` env flag or JSON file is required.

---

## 2. Behaviour

- **When:** Only on the home page (`/`). The dialog is mounted in the root layout and shows only when `pathname === "/"`.
- **Enable/disable:** The `enabled` field on `SiteAnnouncement`. When false, **GET /api/announcement** returns `null` regardless of other fields.
- **Date range:** The API returns the announcement only if the current UTC calendar day (YYYY-MM-DD, same as before) is within `startAt` and `endAt` when those fields are set. Empty start/end means no bound on that side.
- **Dismiss:**
  - **Dismissible:** User can close via the X button. Optional checkbox "ไม่ต้องแสดงอีกในวันนี้" / "Don't show again today" — when checked and closed, the announcement is hidden for the rest of that calendar day (stored in localStorage as date string).
  - **show_once: true:** No checkbox; closing dismisses permanently (localStorage `"1"`).
  - **show_once: false:** Checkbox is shown; if checked on close, dismiss for today only.

The browser key for dismiss state is `announcement.dismissed.<keySlug>` (`keySlug` replaces the old JSON `id` field).

---

## 3. Database: SiteAnnouncement

| Field           | Notes |
|-----------------|--------|
| `enabled`       | Master switch for showing the popup. |
| `keySlug`       | Used with localStorage (change when running a new campaign). |
| `titleTh` / `titleEn` | Required when `enabled` is true (validated on save). |
| `contentTh` / `contentEn` | Optional overlay text. |
| `image`         | Path under `public` or full URL (required when enabled). |
| `imageAltTh` / `imageAltEn` | Optional. |
| `startAt` / `endAt` | Optional `DATE` (UTC day boundary behaviour unchanged). |
| `showOnce` / `dismissible` | Same semantics as the former JSON fields. |
| `actionUrl` / `actionLabelTh` / `actionLabelEn` | Optional CTA; if URL is set, both labels are required. |

---

## 4. API

- **GET /api/announcement** (public)  
  Reads the singleton row, applies `enabled` + date range, returns an `Announcement` JSON object or `null`. No auth.

- **GET /api/admin/announcement** (ADMIN)  
  Returns the full admin DTO for the form (or defaults if the row does not exist yet).

- **PUT /api/admin/announcement** (ADMIN)  
  Upserts the singleton row. Validates body server-side.

---

## 5. Implementation

- **Types:** `lib/announcement.ts` — `Announcement`, `LocalizedString`, `resolveLocalized()`.
- **DB mapping:** `lib/site-announcement.ts` — `rowToPublicAnnouncement`, admin DTO, PUT parsing.
- **Public API:** `app/api/announcement/route.ts`.
- **Admin API:** `app/api/admin/announcement/route.ts`.
- **UI:** `components/dashboard/announcement-dialog.tsx` — fetches public API when `pathname === "/"`; same dismiss and overlay behaviour as before.
- **Admin UI:** `app/(admin)/admin/settings/announcement/page.tsx`.
- **Mount:** `app/layout.tsx` — `AnnouncementDialog` in root layout.

---

## 6. Assets

- Images: place files under `public/announcements/` and reference as `/announcements/<filename>` in `image`, or use an absolute URL.

---

## 7. Migration from JSON

The previous `data/announcement.json` and `NEXT_PUBLIC_ANNOUNCEMENT_ENABLED` have been removed. Run `npm run db:push` (or your migration workflow) after pulling. Seed creates a default disabled row with sample content if missing (`prisma/seed.ts`).
