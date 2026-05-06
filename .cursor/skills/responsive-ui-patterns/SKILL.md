---
name: responsive-ui-patterns
description: Responsive UI patterns for Judtang — breakpoints, responsive hooks (useIsMobile, useIsDesktopOrLarger), mobile bottom nav, sidebar, and table compact layout. Use when building new pages, adjusting layout for mobile/desktop, adding nav items, or working on the dashboard shell.
---

# Responsive UI Patterns

## Breakpoints

| Breakpoint | Width | Hook | Usage |
|------------|-------|------|-------|
| `sm` | 640px | `useIsSmallScreen()` | Sidebar → Dialog on small screen |
| `md` | 768px | `useIsMobile()` | Mobile bottom nav shown; sidebar hidden |
| `lg` | 1024px | `useIsDesktopOrLarger()` | Full table with Edit/Delete; compact layout below |

All hooks are in `hooks/use-mobile.ts`.

## Hook usage

```tsx
import { useIsMobile, useIsSmallScreen, useIsDesktopOrLarger } from "@/hooks/use-mobile"

function MyComponent() {
  const isMobile = useIsMobile()           // < 768px
  const isSmall = useIsSmallScreen()       // < 640px
  const isDesktop = useIsDesktopOrLarger() // ≥ 1024px

  return isMobile ? <MobileView /> : <DesktopView />
}
```

Prefer Tailwind responsive prefixes (`md:hidden`, `lg:flex`) for pure styling. Use hooks only when conditional JSX rendering is needed.

## Mobile bottom nav

- **Component:** `components/dashboard/mobile-bottom-nav.tsx`
- **Shown:** when `useIsMobile()` is true (`md:hidden`)
- **Items:** Dashboard, Accounts, Transactions, Summary, Settings (5 items)
- **Slip upload:** shown as a button in the mobile bottom nav (opens `SlipUploadDialog`)
- **Position:** `fixed bottom-0` with `safe-area-inset-bottom` for notched devices
- **Active state:** indicator bar + theme-aware colors

When adding a new top-level section accessible from mobile, add it to the bottom nav AND the sidebar nav.

## Sidebar navigation

- **Desktop (≥ 640px):** Collapsible shadcn `Sidebar` with icon rail
- **Small screen (< 640px):** Hidden — `PanelLeftIcon` button in header opens a `Dialog` with 2×2 grid nav

## Transactions table responsive

| Viewport | Layout |
|----------|--------|
| Desktop (≥ 1024px) | Full table: Date, Account, Category, Type, Amount, Note + Edit/Delete buttons |
| Tablet/Mobile (< 1024px) | Compact: Date+Account+Category merged, Type/Note hidden, tap row for action menu |

## Dashboard page grid

```tsx
// Single column on mobile, two columns on md+
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

## Dialog fullscreen on mobile (form dialogs)

Any dialog with multiple form fields must be fullscreen on mobile. See the `form-dialog-patterns` skill for the exact class pattern and inner layout structure.

Key Tailwind classes:
```
sm:max-w-md max-h-[90vh] flex flex-col overflow-hidden
max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none
max-md:w-full max-md:max-w-none max-md:rounded-none
```

## Input focus scroll (mobile)

`DialogBody` in `components/ui/dialog.tsx` automatically scrolls to the focused input when the keyboard opens on mobile. This is built-in — no extra code needed in dialog forms.

## Accessibility

- Nav items: `aria-label` from i18n keys
- Active nav item: `aria-current="page"`
- Mobile bottom nav: `aria-label` on the `<nav>` landmark
- Dialog trigger: `aria-haspopup="dialog"`

## Key files

| File | Purpose |
|------|---------|
| `hooks/use-mobile.ts` | `useIsMobile`, `useIsSmallScreen`, `useIsDesktopOrLarger` |
| `components/dashboard/mobile-bottom-nav.tsx` | Mobile bottom nav |
| `components/dashboard/app-sidebar-layout.tsx` | Sidebar + header shell |
| `docs/structure/dashboard-responsive-ui.md` | Full responsive spec |
