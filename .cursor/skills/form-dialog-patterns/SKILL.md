---
name: form-dialog-patterns
description: Dialog and form UI patterns for Judtang — fullscreen on mobile, DateRangePicker usage, RowSelect/AccountCombobox, MRU pickers, and modal navigation reset. Use when creating or editing any dialog that contains a form, date range input, select/dropdown, or account picker.
---

# Form & Dialog Patterns

## Dialog with multi-field form → fullscreen on mobile

Any dialog with multiple form fields **must** be fullscreen on small viewports.

```tsx
<DialogContent className={cn(
  "max-h-[90vh] flex flex-col overflow-hidden sm:max-w-md",
  "max-md:inset-0 max-md:translate-none max-md:h-dvh max-md:max-h-none max-md:w-full max-md:max-w-none max-md:rounded-none"
)}>
  <DialogHeader className="shrink-0">...</DialogHeader>
  <form className="flex flex-1 flex-col min-h-0 overflow-hidden">
    <DialogBody>
      {/* form fields here — scrollable */}
    </DialogBody>
    <DialogFooter className="shrink-0">...</DialogFooter>
  </form>
</DialogContent>
```

Reference: `transaction-form-dialog.tsx`, `category-form-dialog.tsx`, `financial-account-form-dialog.tsx`, `credit-card-payment-dialog.tsx`

Confirm-only dialogs (no form fields) do NOT need fullscreen.

## Date range input → DateRangePicker

For any "from date / to date" pair, use `DateRangePicker` — never two separate `DatePicker` components.

```tsx
import { DateRangePicker } from "@/components/ui/date-range-picker"

<DateRangePicker
  value={{ from: fromDate, to: toDate }}
  onChange={(v) => { setFrom(v.from ?? ""); setTo(v.to ?? "") }}
/>
```

Locations that use DateRangePicker (check when adding a new one):
- `app/(dashboard)/dashboard/transactions/page.tsx`
- `components/dashboard/data-tools.tsx`
- `app/(dashboard)/dashboard/accounts/[id]/page.tsx`
- `app/(dashboard)/dashboard/settings/activity-log/page.tsx`

Date range logic: `lib/date-range.ts` (`getDateRangeInTimezone`, `toDateStringInTimezone`)

## Select/Dropdown → RowSelect or AccountCombobox

Never mix shadcn `Select` with `AccountCombobox` in the same row.

| Use case | Component |
|----------|-----------|
| Type, category, simple options | `RowSelect` (`@/components/dashboard/row-select`) |
| Financial account | `AccountCombobox` (`@/components/dashboard/account-combobox`) |

Reference: `app/(dashboard)/dashboard/monthly-entry/page.tsx`

## Account picker in modals → AccountSlidePicker

Modal account selection uses the drill-down slide picker (`AccountSlidePicker`) from `transaction-form-dialog`. Reset picker navigation state when the dialog closes.

## MRU (Most Recently Used) pickers

Category and account pickers track recents via `localStorage`:
- Key: `judtang_recent_categories`
- Always use shared picker components (`CategoryRowSelect`, `CategoryCombobox`, `CategoryCapsulePicker`, `AccountCombobox`) — do not build custom pickers that bypass MRU tracking.

## Checklist when adding a new dialog form

- [ ] DialogContent has fullscreen-on-mobile classes
- [ ] DialogHeader has `shrink-0`
- [ ] `<form>` has `flex flex-1 flex-col min-h-0 overflow-hidden`
- [ ] Form fields are inside `DialogBody`
- [ ] DialogFooter has `shrink-0`
- [ ] Date range uses `DateRangePicker`
- [ ] Selects use `RowSelect` / `AccountCombobox`
