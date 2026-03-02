# Authentication & Authorization

**Updated:** 26/02/2026

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

- **GET** — Current user profile: id, name, email, emailVerified, emailVerifiedAt, image, lastActiveAt, hasPassword. Requires authenticated session (401 otherwise).
- **PATCH** — Update display name; body `{ name: string }` (optional). Name is trimmed; empty string is stored as null.

## /api/users/me/password

- **PATCH** — Change password; body `{ currentPassword, newPassword }`. Only for users with a password (Credentials). Returns 400 for OAuth-only users. New password validated for length (min 8, max 72). Validates current password with bcrypt before updating.

## Forgot password and reset password

- **Flow:** User requests reset at `/forgot-password`; system sends email with link to `/reset-password?token=xxx`; user sets new password; token is single-use and expires in 1 hour.
- **Email:** Sent via SMTP (e.g. Gmail). Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. Uses Nodemailer (`lib/email.ts`).
- **Token storage:** `VerificationToken` (identifier = email, token, expires). Existing tokens for the same email are deleted before creating a new one.
- **Security:** Always returns `{ ok: true }` from forgot-password to prevent email enumeration; OAuth-only users do not receive an email but get the same response.

## Bot protection (Cloudflare Turnstile)

- Uses **Cloudflare Turnstile** for human verification on **public auth forms**:
  - `/sign-in` (Credentials provider only; Google OAuth button is unchanged).
  - `/register`
  - `/forgot-password`
  - `/reset-password`
- Frontend uses `react-turnstile` and a shared `TurnstileCaptcha` component, which renders the widget when `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY` is set and the app is not running on `localhost`.
- Each form includes a `turnstileToken` field in the payload when verification is required.
- Server-side verification:
  - Helper `verifyTurnstileToken` in `lib/turnstile.ts` calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` with `CLOUDFLARE_TURNSTILE_SECRETKEY`, the token, and optional `remoteip`.
  - Credentials sign-in (NextAuth `authorize`) and the following APIs enforce verification when enabled:
    - `POST /api/auth/register`
    - `POST /api/auth/forgot-password`
    - `POST /api/auth/reset-password`
- Local development and environments that cannot reach Cloudflare:
  - Helper `shouldSkipTurnstileVerification(request?)` skips verification when `APP_ENV=development`, when `NEXTAUTH_URL` or the `Host` header contains `localhost`/`127.0.0.1`, or when `CLOUDFLARE_TURNSTILE_SECRETKEY` is not configured.
  - On localhost, the widget is also hidden on the client via `useIsLocalhost`, so developers can test auth flows without Turnstile connectivity.

### /api/auth/forgot-password

- **POST** — Request password reset; body `{ email: string }`. Validates email format/length. If user exists with password: creates token, sends email, logs `USER_PASSWORD_RESET_REQUESTED`. Always returns `{ ok: true }` on valid input.

### /api/auth/reset-password

- **POST** — Reset password; body `{ token: string, newPassword: string }`. Validates token (exists, not expired), validates new password. Updates `User.password`, deletes `VerificationToken`, logs `USER_PASSWORD_CHANGED` with `details.source: "password_reset"`. Returns `{ ok: true }` on success; 400 with generic error on invalid/expired token.

### Pages

- **/forgot-password** — Form to enter email; link to sign-in. Sign-in page includes "Forgot password?" link.
- **/reset-password** — Form to enter new password (requires `?token=xxx`). If token missing, shows error and links to request new link or sign-in.

## Email verification

- **Policy:** Soft verification — user can sign in before verifying. Verification status and resend button shown on profile page.
- **Flow:** On register, verification email is sent. User clicks link in email to open `/verify-email?token=xxx`. Token is validated, `User.emailVerified` is set, token is deleted. Google OAuth users get `emailVerified` set automatically on sign-in.
- **Token storage:** `VerificationToken` with `identifier = "email_verify:" + email` to avoid collision with password reset tokens. Token expires in 24 hours.

### /api/auth/verify-email

- **GET** — Verify email; query `?token=xxx`. Finds token with `identifier` starting `email_verify:`, not expired. Updates `User.emailVerified`, deletes token, logs `USER_EMAIL_VERIFIED`. Returns `{ ok: true }` or 400 with generic error.

### /api/auth/resend-verification

- **POST** — Resend verification email. Requires authenticated session. Returns 400 if email already verified. Deletes existing token, creates new one, sends email. Client-side 60s cooldown on profile page.

### Pages

- **/verify-email** — Handles token from email link; shows success or error and links to profile/sign-in.

## User profile page

- **Route:** `/dashboard/me` (protected).
- **Content:** Profile block (avatar, name, email with verification status and resend button if unverified, sign-in method, last active), settings (change display name, change password for Credentials users; message for OAuth), and active sessions block (list with revoke, link to full list at `/dashboard/settings/sessions`).
- Dashboard layout includes nav links to Dashboard, User, and Sessions.

## Route Protection

- Implemented via **proxy.ts** (Next.js 16): unauthenticated requests to protected path prefixes (e.g. `/dashboard`) are redirected to the sign-in page. Session is resolved with `getServerSession` (JWT). Guard or layout-level auth checks are deferred; can be added later if needed.
