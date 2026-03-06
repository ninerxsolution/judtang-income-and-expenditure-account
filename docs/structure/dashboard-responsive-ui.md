# Dashboard Responsive UI

**Updated:** 05/03/2026

**Source:** PRD §18 (Income & Expense), Dashboard layout

---

## 1. Overview

The dashboard layout adapts to different screen sizes with a responsive sidebar, mobile bottom navigation, and layout adjustments. On small screens (< 640px), the sidebar is replaced by a dialog-based navigation; on mobile (< 768px), a bottom nav bar provides quick access to main sections. The Transactions table uses a compact layout and tap-to-menu on tablet/mobile (< 1024px).

---

## 2. Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| **sm** | 640px | `useIsSmallScreen()` — sidebar becomes dialog trigger |
| **md** | 768px | `useIsMobile()` — mobile bottom nav shown; sidebar hidden |
| **lg** | 1024px | `useIsDesktopOrLarger()` — desktop table layout (Edit/Delete buttons); compact layout below |

---

## 3. Hooks

### useIsSmallScreen

- **File:** `hooks/use-mobile.ts`
- **Returns:** `boolean` — `true` when viewport width < 640px (Tailwind `sm`)
- **Use case:** Mobile-first UI below sm (e.g. dialog-based sidebar instead of rail)

### useIsMobile

- **File:** `hooks/use-mobile.ts`
- **Returns:** `boolean` — `true` when viewport width < 768px (Tailwind `md`)
- **Use case:** Show/hide mobile bottom nav; full mobile layout

### useIsDesktopOrLarger

- **File:** `hooks/use-mobile.ts`
- **Returns:** `boolean` — `true` when viewport width ≥ 1024px (Tailwind `lg`)
- **Use case:** Desktop table layout (Edit/Delete buttons in table); compact layout and tap-to-menu below

---

## 4. Sidebar Navigation

### Desktop (≥ 640px)

- Collapsible sidebar (shadcn/ui `Sidebar`) with icon rail
- Header: logo, app name
- Nav items: Accounts, Calendar, Transactions, Summary; Admin Reports (if admin)
- Footer: app version

### Small screen (< 640px)

- Sidebar hidden; header shows **PanelLeftIcon** button
- Clicking opens a **Dialog** with nav items in a 2×2 grid
- Each item links to the route and closes the dialog (`DialogClose`)
- Dialog styling: `max-w-[min(90vw,24rem)]`, rounded, transparent backdrop

---

## 5. Mobile Bottom Nav

- **Component:** `components/dashboard/mobile-bottom-nav.tsx`
- **Shown when:** `useIsMobile()` is true (< 768px)
- **Position:** Fixed bottom, full width
- **Items:** Dashboard, Accounts, Transactions, Summary, Settings (5 items)
- **Styling:** Cream background (light) / stone-900 (dark); icon + text label per item; `md:hidden`; safe-area-inset-bottom for notched devices
- **Active state:** Indicator bar at top of active item; colors adapt to theme via `useTheme()`
- **Dark theme:** Background, border, active/inactive colors are theme-aware (light: cream/olive; dark: stone-900/stone-400)

---

## 6. Dashboard Page Layout

- **File:** `app/(dashboard)/dashboard/page.tsx`
- **Responsive grid:** Single column on small screens; two columns on larger
- **Quick Add buttons:** Use `useIsSmallScreen` for layout adjustments
- **Text wrapping:** Button labels wrap to prevent overflow on narrow screens

---

## 7. Components

| Component | Role |
|-----------|------|
| `AppSidebarLayout` | Wraps dashboard; renders Sidebar + header; switches to Dialog on small screen |
| `MobileBottomNav` | Fixed bottom nav on mobile |
| `Dialog` (ui/dialog) | Sidebar nav overlay on small screens |

---

## 8. Transactions Table Responsive

- **File:** `app/(dashboard)/dashboard/transactions/page.tsx`
- **Desktop (≥ 1024px):** Full table with Date, Account, Category, Type, Amount, Note; Edit/Delete buttons per row
- **Tablet/Mobile (< 1024px):** Compact layout:
  - **First column:** Date + account + category combined (single cell)
  - **Type column:** Hidden
  - **Category column:** Hidden (merged into first column)
  - **Amount:** Shown with color (green income, red expense, blue transfer)
  - **Note:** Hidden
  - **Actions:** Tap row to open action menu dialog (shows date, account, amount; Edit/Delete options)
- **Dashboard recent transactions (mobile):** Icon only (no type label); date on separate row with `text-[10px]`

---

## 9. Fullscreen dialog — input focus scroll (mobile)

- **Component:** `DialogBody` in `components/ui/dialog.tsx`
- **When:** Any dialog that uses `DialogBody` and is fullscreen on mobile (e.g. transaction form, account form, category form, credit card payment, profile edit)
- **Behavior:** On mobile (`useIsMobile()`), when the user focuses any input or textarea inside the dialog body, the scrollable area (DialogBody) automatically scrolls so the focused element is brought into view (`scrollIntoView` with `block: 'center'`, after a short delay to account for virtual keyboard)
- **Purpose:** Avoids the user having to manually scroll down after tapping a field when the keyboard opens

---

## 10. Dialog: form vs simple (mobile fullscreen)

- **Rule:** Dialogs that contain a **form with multiple input fields** must be **fullscreen on mobile** (viewport &lt; md). Otherwise the content overflows the small dialog and is hard to use (scroll, tap targets). Dialogs that are **simple** (e.g. confirm/cancel only, or a short message) may stay centered and do not need fullscreen.
- **Implementation:** Use the same `DialogContent` class pattern as in `transaction-form-dialog`, `credit-card-payment-dialog`, `category-form-dialog`, `financial-account-form-dialog`:
  - Desktop: `max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md` (or `sm:max-w-sm` / `sm:max-w-lg` as needed)
  - Mobile: `max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none`
  - Inner layout: `DialogHeader` with `shrink-0`; `<form className="flex flex-1 flex-col min-h-0 overflow-hidden">`; `DialogBody` for scrollable form fields; `DialogFooter` with `shrink-0`.
- **Reference:** `.cursor/rules/dialog-mobile-fullscreen-form.mdc`; components listed above.

---

## 11. Accessibility

- Nav items use `aria-label` from i18n
- Dialog trigger has `aria-haspopup="dialog"`
- Active nav item uses `aria-current="page"`
- Mobile bottom nav has `aria-label` for the nav landmark
