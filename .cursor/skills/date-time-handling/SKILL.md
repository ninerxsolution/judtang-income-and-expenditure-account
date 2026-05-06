---
name: date-time-handling
description: Date and time handling for Judtang — Buddhist Era year display (พ.ศ./ค.ศ.), occurredAt full datetime, DateRangePicker, timezone-aware helpers. Use when displaying dates/years in the UI, building date pickers, handling occurredAt, or working with timezone-sensitive date logic.
---

# Date & Time Handling

## Year display: พ.ศ. vs ค.ศ.

| Language | Year format | Calculation |
|----------|-------------|-------------|
| Thai (th) | พ.ศ. (Buddhist Era) | Gregorian + 543 |
| English (en) | ค.ศ. (Christian Era) | Gregorian (as-is) |

**Always use `formatYearForDisplay(year, language)` from `@/lib/format-year` when rendering year in UI.**

```ts
import { formatYearForDisplay } from "@/lib/format-year"

// In a year dropdown:
<option value={year}>{formatYearForDisplay(year, language)}</option>
```

**Store and send Gregorian year everywhere** — only convert at the display layer.  
Never send Buddhist year to API.

## occurredAt — full datetime required

Sending `"YYYY-MM-DD"` (date-only) to the API causes the time to be stored as midnight UTC = **07:00 Bangkok time**.

**Frontend — combine date + current time before sending:**
```ts
const now = new Date()
const d = new Date(selectedDateString)
d.setHours(now.getHours(), now.getMinutes(), now.getSeconds())
body.occurredAt = d.toISOString()  // full ISO string with time
```

**Backend — use parseOccurredAt to handle both cases:**
```ts
import { parseOccurredAt } from "@/lib/date-range"
const occurredAt = parseOccurredAt(body.occurredAt)
```

## DateRangePicker

For any from/to date range in the UI, use `DateRangePicker` (`@/components/ui/date-range-picker`).  
Never use two separate `DatePicker` components.

```tsx
<DateRangePicker
  value={{ from: fromDate, to: toDate }}
  onChange={(v) => { setFrom(v.from ?? ""); setTo(v.to ?? "") }}
/>
```

## Timezone helpers (`lib/date-range.ts`)

| Function | Use |
|----------|-----|
| `parseOccurredAt(value)` | Parse occurredAt from API body — handles date-only safely |
| `getDateRangeInTimezone(from, to, tz)` | Convert from/to date strings to UTC range for DB query |
| `toDateStringInTimezone(date, tz)` | Format a Date as `YYYY-MM-DD` in a given timezone |

Default timezone in the app: `Asia/Bangkok` (UTC+7).

## Components that already handle Buddhist year

- `DatePicker` — year display uses พ.ศ. for Thai
- `DateRangePicker` — same
- `transactions-calendar` — same

Do not add raw `year` rendering in new components; always call `formatYearForDisplay`.
