---
name: transaction-features
description: Transaction business logic for Judtang — occurredAt datetime, transfers (same/cross-currency), balance snapshots, debit card linked bank ledger, and recurring transactions. Use when creating or editing transaction-related code, dialogs, API routes, or balance snapshot logic.
---

# Transaction Features

## occurredAt — always full datetime

**Never send `"YYYY-MM-DD"` as occurredAt from frontend.** Date-only becomes midnight UTC = 07:00 Bangkok (UTC+7).

**Frontend pattern** (any dialog that creates a transaction):
```ts
// Combine selected date + current time before sending
const now = new Date()
const d = new Date(selectedDate) // date from picker
d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds())
occurredAt: d.toISOString()
```

**Backend pattern** (any API route receiving occurredAt):
```ts
import { parseOccurredAt } from "@/lib/date-range"
const occurredAt = parseOccurredAt(body.occurredAt)  // handles date-only gracefully
```

Reference dialogs: `transaction-form-dialog.tsx`, `credit-card-payment-dialog.tsx`, `recurring-confirm-dialog.tsx`

## Transfers

| Type | Structure |
|------|-----------|
| Same-currency | Single `TRANSFER` row |
| Cross-currency | Two rows sharing the same `transferGroupId` |

**Edit and delete must apply to the whole transfer group**, not one leg alone.

## Balance snapshots (accountBalanceAfter)

- Stored on each transaction row as `accountBalanceAfter`
- Debit card rows + linked bank account (`linkedAccountId`) share a combined chronological ledger
- Rebuilding snapshots for the bank account alone leaves `accountBalanceAfter` unset on card rows (shows "—" in UI)
- Any `isAccountIncomplete` check requires `linkedAccountId` in the Prisma `select`

## Transactions list cache

`GET /api/transactions` uses `unstable_cache` with a payload version string (`TRANSACTIONS_LIST_CACHE_VERSION`).

**When adding/removing fields on the list response:** bump `TRANSACTIONS_LIST_CACHE_VERSION` in `app/api/transactions/route.ts`, otherwise old cached payloads omit the new fields.

## Recurring transactions

`isPaid` for a template = rows with that template's `recurringTransactionId` posted in the due calendar month. A manual transaction without that link does NOT count as paying the recurring round.

## Key files

| File | Purpose |
|------|---------|
| `lib/date-range.ts` | `parseOccurredAt()`, `getDateRangeInTimezone()` |
| `lib/transactions.ts` | Core transaction create/update helpers |
| `app/api/transactions/route.ts` | List API with cache versioning |
| `lib/transfer-group-patch-utils.ts` | Transfer group PATCH guards |
