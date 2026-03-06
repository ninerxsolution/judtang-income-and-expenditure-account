# Activity Log

**Updated:** activity-log (21/02/2026)

**Source:** PRD §7.1

---

Records critical system events for auditing and tracking purposes.

## Data model (ActivityLog)

- **userId** — who performed the action (FK to User)
- **action** — event type (see list below)
- **entityType** — optional: `user` | `session` | `transaction` | `financialAccount` (other types reserved for future use)
- **entityId** — optional id of the related entity
- **details** — optional JSON; format depends on action (see below)
- **createdAt** — when the event occurred

### details format

- **User create/update:** `{ "name": "..." }` or `{ "changes": [ { "field": "name", "from": "old", "to": "new" }, ... ] }`.
- **Delete / Restore:** `{ "name": "..." }` or `{ "title": "..." }` — what was deleted or restored.
- **Session revoked:** `{ "scope": "one" | "others" | "all" }` — one session, all other sessions, or all sessions.
- **Transaction create:** `{ type, amount, category, categoryName?, occurredAt, accountName?, financialAccountId }` — human-readable names stored at log time for audit.
- **Transaction update:** Same as create, plus `changes?: [ { field, from, to } ]` — for each changed field (type, amount, category, date, account), stores before/after values.
- **Transaction delete:** `{ type, amount, occurredAt, accountName?, categoryName?, note? }`.
- **Credit card payment:** `{ accountId, accountName, amount, occurredAt, fromAccountId?, fromAccountName? }`.
- **Transaction export:** `{ rowCount, hasFilter, from?, to?, type?, financialAccountId?, accountName? }`.
- **Transaction import:** `{ createdCount, updatedCount, totalRows }`.

## Logged events (actions)

- **User:** USER_REGISTERED, USER_LOGGED_IN, USER_LOGGED_OUT, USER_PROFILE_UPDATED, USER_PASSWORD_CHANGED, USER_PASSWORD_RESET_REQUESTED, USER_EMAIL_VERIFIED
- **Session:** SESSION_REVOKED
- **Transaction:** TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED, TRANSACTION_EXPORT, TRANSACTION_IMPORT
- **Credit card:** CREDIT_CARD_PAYMENT, CREDIT_CARD_INTEREST_APPLIED
- **Financial account:** FINANCIAL_ACCOUNT_CREATED, FINANCIAL_ACCOUNT_UPDATED, FINANCIAL_ACCOUNT_DISABLED, FINANCIAL_ACCOUNT_DELETED

Events are emitted from the relevant API routes and from the auth flow (register, sign-in, sign-out) via `lib/activity-log.ts` (`createActivityLog`). Logout is recorded when the client calls POST /api/auth/logout before signOut(). Failed log writes do not fail the main request.

## API

- **GET /api/activity-log** — list activity for the current user only. Query params: `entityType`, `action`, `dateFrom`, `dateTo`, `limit` (default 100, max 500). Sorted by `createdAt` desc.
- Response includes **userDisplayName** per entry (derived from User name/email; use `"System"` when the actor is the system, e.g. if `userId` is optional in the future).

## UI

- **Dashboard:** Activity Log page at `/dashboard/settings/activity-log` (reached via **Settings**). Read-only list/timeline with filters (entity type, action, date range).
- Each entry shows **who** (By: {userDisplayName}), **what** (action label), and **details** formatted per action type. Transaction entries show type, amount, category, date, and account name. Credit card payment shows amount, from-account, and date. Export/import show row counts. The "By" line and each detail item are shown on separate lines for readability.

## Examples (from PRD)

- User registered / logged in
- User logged out / session revoked
- Profile or password updated
