# Authentication & Authorization

**Updated:** 14/02/2026

**Source:** PRD §8

---

## Authentication

- Uses **NextAuth**
- Supports:
  - Email + Password (Credentials)
  - Google OAuth

## User Master

- Stored in MySQL
- Passwords are stored as hashes only
- Google-authenticated users do not have passwords

## Validation (register and change password)

- **Email:** Normalized (trim, lowercase). Format validated (e.g. local@domain.tld). Max length 254 characters.
- **Password:** Min 8 characters, max 72 characters (bcrypt limit). Register form includes confirm-password check; change-password form checks length and confirm match.
- Shared helpers in `lib/validation.ts`.

## Session Strategy

- NextAuth uses **JWT strategy** (session token in cookie). Credentials provider works only with JWT.
- **Prisma Adapter** (`@auth/prisma-adapter`) is used for OAuth (User, Account). NextAuth’s Session table is not used for session storage when strategy is JWT.
- Active sessions are tracked in a separate **UserSession** table (sessionId, userId, userAgent, ipAddress, lastActiveAt, createdAt, revokedAt) for list/revoke and per-session metadata. **revokedAt** is used for soft delete: when a session is revoked, the row is kept and **revokedAt** is set; list and touch only consider rows where **revokedAt** is null.

## Active Users

- "Active users" (count of users active at a given time) is supported via **Heartbeat / Last active**.
- User model includes **lastActiveAt** (timestamp); a heartbeat API updates it when the user is active.
- "Active" is defined as lastActiveAt within a configured window (e.g. last 5 minutes).
- Total user count: simple count on the User table.

## Session Metadata (UserSession)

- **userAgent** and **ipAddress** are stored on **UserSession** and updated when:
  1. The user loads any dashboard page — client calls **POST /api/sessions** (touch).
  2. The user opens the sessions list page — **GET /api/sessions** also updates the current session row.
- IP is read from request headers `x-forwarded-for` or `x-real-ip` (often null on localhost without a proxy).

## /api/sessions

- **GET** — List active sessions for the current user (only rows with revokedAt null); updates current session’s lastActiveAt, userAgent, ipAddress.
- **POST** — Touch current session (update lastActiveAt, userAgent, ipAddress); only updates rows with revokedAt null; called from dashboard layout on load.
- **DELETE** — Revoke one session (query `sessionId`), all others (`revokeAllOthers=true`), or all (`revokeAll=true`). Revoke is **soft delete**: rows are not removed; **revokedAt** is set to the current time. List and touch filter by revokedAt null, so revoked sessions disappear from the UI and the JWT is invalidated when the session is looked up.

## /api/users/me

- **GET** — Current user profile: id, name, email, image, lastActiveAt, hasPassword. Requires authenticated session (401 otherwise).
- **PATCH** — Update display name; body `{ name: string }` (optional). Name is trimmed; empty string is stored as null.

## /api/users/me/password

- **PATCH** — Change password; body `{ currentPassword, newPassword }`. Only for users with a password (Credentials). Returns 400 for OAuth-only users. New password validated for length (min 8, max 72). Validates current password with bcrypt before updating.

## User profile page

- **Route:** `/dashboard/user` (protected).
- **Content:** Profile block (avatar, name, email, sign-in method, last active), settings (change display name, change password for Credentials users; message for OAuth), and active sessions block (list with revoke, link to full list at `/dashboard/sessions`).
- Dashboard layout includes nav links to Dashboard, User, and Sessions.

## Route Protection

- Implemented via **proxy.ts** (Next.js 16): unauthenticated requests to protected path prefixes (e.g. `/dashboard`) are redirected to the sign-in page. Session is resolved with `getServerSession` (JWT). Guard or layout-level auth checks are deferred; can be added later if needed.
