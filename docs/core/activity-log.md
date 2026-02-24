# Activity Log

**Updated:** activity-log (21/02/2026)

**Source:** PRD §7.1

---

Records critical system events for auditing and tracking purposes.

## Data model (ActivityLog)

- **userId** — who performed the action (FK to User)
- **action** — event type (see list below)
- **entityType** — optional: `user` | `session` (other types reserved for future use)
- **entityId** — optional id of the related entity
- **details** — optional JSON; format depends on action (see below)
- **createdAt** — when the event occurred

### details format

- **Create:** `{ "name": "..." }` or `{ "title": "..." }` for task.
- **Delete:** `{ "name": "..." }` or `{ "title": "..." }` for task — what was deleted.
- **Restore:** `{ "name": "..." }` — what was restored.
- **Update / status change:** either `{ "from": "...", "to": "..." }` (e.g. status) or `{ "changes": [ { "field": "name", "from": "old", "to": "new" }, ... ] }` for multiple field changes.
- **Session revoked:** `{ "scope": "one" | "others" | "all" }` — one session, all other sessions, or all sessions.

## Logged events (actions)

- **User:** USER_REGISTERED, USER_LOGGED_IN, USER_LOGGED_OUT, USER_PROFILE_UPDATED, USER_PASSWORD_CHANGED
- **Session:** SESSION_REVOKED

Events are emitted from the relevant API routes and from the auth flow (register, sign-in, sign-out) via `lib/activity-log.ts` (`createActivityLog`). Logout is recorded when the client calls POST /api/auth/logout before signOut(). Failed log writes do not fail the main request.

## API

- **GET /api/activity-log** — list activity for the current user only. Query params: `entityType`, `action`, `dateFrom`, `dateTo`, `limit` (default 100, max 500). Sorted by `createdAt` desc.
- Response includes **userDisplayName** per entry (derived from User name/email; use `"System"` when the actor is the system, e.g. if `userId` is optional in the future).

## UI

- **Dashboard:** Activity Log page at `/dashboard/activity-log` (nav link with Bell icon). Read-only list/timeline with filters (entity type, action, date range).
- Each entry shows **who** (By: {userDisplayName} or "By: System"), **what** (action label), and **details** (e.g. "Deleted: « Name »", "Restored: « Name »", or "field: from → to" for updates). The "By" line and each detail item are shown on separate lines for readability.

## Examples (from PRD)

- User registered / logged in
- User logged out / session revoked
- Profile or password updated
