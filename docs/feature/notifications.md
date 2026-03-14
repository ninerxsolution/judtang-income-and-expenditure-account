# In-App Notifications

**Product:** Judtang Financial Engine  
**Feature:** Notification Panel  
**Status:** Implemented

---

## 1. Overview

หน้าต่าง notification สำหรับแจ้งข่าว แจ้งอัปเดต หรือแจ้งเตือนภายในแอป

A notification panel for:
- **Event notifications (persisted)** — Slip upload done, CSV import done, credit card payment recorded
- **Virtual alerts (computed)** — Recurring due, credit card due, budget over/near limit, incomplete account

---

## 2. Data Model

### Persisted notifications (stored in DB)

- Table: `Notification` (id, userId, type, payload, link, readAt, createdAt)
- Types: `EVENT_SLIP_DONE`, `EVENT_IMPORT_DONE`, `EVENT_CARD_PAYMENT`
- Read state: `readAt` (null = unread)

### Virtual alerts (computed on demand)

- Not stored in DB; computed from domain data at request time
- Types: `ALERT_RECURRING_DUE`, `ALERT_CARD_DUE`, `ALERT_BUDGET`, `ALERT_INCOMPLETE_ACCOUNT`
- Read state: stored in `localStorage` key `notification.dismissedVirtualIds` (array of alert IDs)

---

## 3. APIs

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/notifications` | Merged persisted + virtual items; query: `limit`, `unreadOnly` |
| POST | `/api/notifications` | Create event notification (body: type, payload, link) |
| PATCH | `/api/notifications/read` | Mark as read: `{ ids: string[] }` or `{ all: true }`; Mark as unread: `{ ids: string[], unread: true }` |

---

## 4. UI

- **Trigger:** Bell icon in sidebar header; badge shows unread count
- **Desktop:** Popover (dropdown) aligned to trigger
- **Mobile:** Sheet (fullscreen bottom drawer) for better UX
- **Tabs:** All / Unread
- **Actions:** Mark all as read; per-item menu (⋯) with Mark as read / Mark as unread
- **Fetch:** On mount (for badge); refetch when panel opens

---

## 5. References

- `components/dashboard/notifications-popover.tsx` — Main UI
- `lib/notifications.ts` — Persisted + virtual logic, mark read/unread
- `app/api/notifications/route.ts` — GET, POST
- `app/api/notifications/read/route.ts` — PATCH
- Added: 07/03/2026 — Initial planned feature note
- Updated: 14/03/2026 — Implemented: persisted + virtual, read/unread, LocalStorage for virtual, Sheet on mobile, per-item menu
