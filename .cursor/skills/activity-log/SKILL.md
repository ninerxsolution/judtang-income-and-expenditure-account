---
name: activity-log
description: Activity log for Judtang — which events to log, createActivityLog usage, details format per action type, and when failed log writes are acceptable. Use when creating or modifying API routes that perform write operations (create, update, delete transactions, accounts, categories, payments, user profile changes).
---

# Activity Log

Every **write operation** that changes user data must call `createActivityLog`. Failed log writes do **not** fail the main request — wrap in try/catch if needed.

## Import

```ts
import { createActivityLog } from "@/lib/activity-log"
```

## When to call it

Call `createActivityLog` after the main operation succeeds, inside the same API route handler.

```ts
await createActivityLog({
  userId: session.user.id,
  action: "TRANSACTION_CREATED",
  entityType: "transaction",
  entityId: newTransaction.id,
  details: {
    type: newTransaction.type,
    amount: newTransaction.amount,
    occurredAt: newTransaction.occurredAt,
    financialAccountId: newTransaction.financialAccountId,
    accountName: account.name,
    categoryName: category?.name,
  },
})
```

## All logged actions

### Transaction
| Action | When |
|--------|------|
| `TRANSACTION_CREATED` | New transaction saved |
| `TRANSACTION_UPDATED` | Transaction edited |
| `TRANSACTION_DELETED` | Transaction deleted |
| `TRANSACTION_EXPORT` | Export downloaded |
| `TRANSACTION_IMPORT` | CSV imported |

### Credit card
| Action | When |
|--------|------|
| `CREDIT_CARD_PAYMENT` | Payment recorded |
| `CREDIT_CARD_INTEREST_APPLIED` | Interest applied (v1.1) |

### Financial account
| Action | When |
|--------|------|
| `FINANCIAL_ACCOUNT_CREATED` | New account |
| `FINANCIAL_ACCOUNT_UPDATED` | Account edited |
| `FINANCIAL_ACCOUNT_DISABLED` | Account deactivated |
| `FINANCIAL_ACCOUNT_DELETED` | Account permanently deleted |

### User / Session
`USER_REGISTERED`, `USER_LOGGED_IN`, `USER_LOGGED_OUT`, `USER_PROFILE_UPDATED`, `USER_PASSWORD_CHANGED`, `USER_PASSWORD_RESET_REQUESTED`, `USER_EMAIL_VERIFIED`, `SESSION_REVOKED`

## details format per action

```ts
// TRANSACTION_CREATED / TRANSACTION_UPDATED
{
  type, amount, category, categoryName?, occurredAt,
  accountName?, financialAccountId,
  changes?: [{ field, from, to }]  // UPDATED only
}

// TRANSACTION_DELETED
{ type, amount, occurredAt, accountName?, categoryName?, note? }

// CREDIT_CARD_PAYMENT
{ accountId, accountName, amount, occurredAt, fromAccountId?, fromAccountName? }

// TRANSACTION_EXPORT
{ rowCount, hasFilter, from?, to?, type?, financialAccountId?, accountName? }

// TRANSACTION_IMPORT
{ createdCount, updatedCount, totalRows }

// USER_PROFILE_UPDATED
{ changes: [{ field, from, to }] }

// SESSION_REVOKED
{ scope: "one" | "others" | "all" }
```

## entityType values

`"user"` | `"session"` | `"transaction"` | `"financialAccount"`

## Key files

| File | Purpose |
|------|---------|
| `lib/activity-log.ts` | `createActivityLog()` |
| `docs/core/activity-log.md` | Full spec |

## Checklist when adding a write API route

- [ ] `createActivityLog` called after successful write
- [ ] Correct `action` constant used (see table above)
- [ ] `details` includes human-readable names (accountName, categoryName) — not just IDs
- [ ] Log failure does not cause main request to return 500
