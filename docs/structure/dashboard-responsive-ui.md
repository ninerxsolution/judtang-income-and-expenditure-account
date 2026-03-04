# Dashboard Responsive UI

**Updated:** 04/03/2026

**Source:** PRD §18 (Income & Expense), Dashboard layout

---

## 1. Overview

The dashboard layout adapts to different screen sizes with a responsive sidebar, mobile bottom navigation, and layout adjustments. On small screens (< 640px), the sidebar is replaced by a dialog-based navigation; on mobile (< 768px), a bottom nav bar provides quick access to main sections.

---

## 2. Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| **sm** | 640px | `useIsSmallScreen()` — sidebar becomes dialog trigger |
| **md** | 768px | `useIsMobile()` — mobile bottom nav shown; sidebar hidden |

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
- **Items:** Dashboard, Accounts, Calendar (Transactions via Calendar or Dashboard)
- **Styling:** `md:hidden`; safe-area-inset-bottom for notched devices
- **Active state:** Amber background for current route

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

## 8. Accessibility

- Nav items use `aria-label` from i18n
- Dialog trigger has `aria-haspopup="dialog"`
- Active nav item uses `aria-current="page"`
- Mobile bottom nav has `aria-label` for the nav landmark
