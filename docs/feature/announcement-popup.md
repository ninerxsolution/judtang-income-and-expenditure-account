# Announcement Popup

**Type:** Config-driven modal on the home page  
**Route:** Shown on `/` (public landing) when enabled  
**Config:** `data/announcement.json`, `.env` (`NEXT_PUBLIC_ANNOUNCEMENT_ENABLED`)

---

## 1. Overview

An optional announcement popup appears on the home page (`/`) to promote campaigns, releases, or notices. It is driven by a JSON config file and can be turned on or off via an environment variable. Content supports Thai and English.

---

## 2. Behaviour

- **When:** Only on the home page (`/`). The dialog is mounted in the root layout and shows only when `pathname === "/"`.
- **Enable/disable:** Set `NEXT_PUBLIC_ANNOUNCEMENT_ENABLED=true` in `.env` to enable. Omit or set to another value to disable.
- **Date range:** The API returns the announcement only if the current date (YYYY-MM-DD) is within `start_at` and `end_at`. Outside that range, the popup does not show.
- **Dismiss:**
  - **Dismissible:** User can close via the X button. Optional checkbox "ไม่ต้องแสดงอีกในวันนี้" / "Don't show again today" — when checked and closed, the announcement is hidden for the rest of that calendar day (stored in localStorage as date string).
  - **show_once: true:** No checkbox; closing dismisses permanently (localStorage `"1"`).
  - **show_once: false:** Checkbox is shown; if checked on close, dismiss for today only.

---

## 3. Config: data/announcement.json

| Field         | Type                    | Description |
|---------------|-------------------------|-------------|
| `id`          | string                  | Unique id (used for localStorage key). |
| `title`       | `{ th, en }` or string  | Title (e.g. for fallback / image_alt). |
| `content`     | `{ th, en }` or string  | Optional text in the bottom overlay. |
| `image`       | string                  | Image URL (e.g. `/announcements/promo.png` or full URL). |
| `image_alt`   | `{ th, en }` or string  | Optional alt text for the image. |
| `start_at`    | string                  | Start date `YYYY-MM-DD`. |
| `end_at`      | string                  | End date `YYYY-MM-DD`. |
| `show_once`   | boolean                 | If true, dismiss is permanent (no "don't show today" checkbox). |
| `dismissible` | boolean                 | If true, user can close; if false, no close button. |
| `action_url`  | string                  | Optional CTA link. |
| `action_label`| `{ th, en }` or string  | Optional CTA button label. |

Text fields (`title`, `content`, `image_alt`, `action_label`) accept either a plain string (single language) or an object `{ th: string, en: string }`. The UI resolves the value using the current app language via `resolveLocalized()` in `lib/announcement.ts`.

---

## 4. API

- **GET /api/announcement**  
  Reads `data/announcement.json`, validates date range, and returns the JSON object or `null` (e.g. file missing, invalid JSON, or outside date range). No auth required (home page is public).

---

## 5. Implementation

- **Types:** `lib/announcement.ts` — `Announcement`, `LocalizedString`, `resolveLocalized()`.
- **API:** `app/api/announcement/route.ts` — reads file, date check, returns payload.
- **UI:** `components/dashboard/announcement-dialog.tsx` — client component; fetches API on mount when on `/`, shows dialog with image, optional content overlay, optional CTA, optional "don't show again today" checkbox; persists dismiss state in localStorage.
- **Mount:** `app/layout.tsx` — `AnnouncementDialog` is rendered in the root layout; it only opens when pathname is `/` and env is enabled.

---

## 6. Assets

- Images: place files under `public/announcements/` and reference as `/announcements/<filename>` in `image`, or use an absolute URL.
