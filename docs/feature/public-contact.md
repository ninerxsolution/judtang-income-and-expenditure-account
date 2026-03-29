# Public contact form

**Routes:** `/contact` (public), `/admin/contact-messages`, `/admin/contact-messages/[id]` (ADMIN)

**API:** `POST /api/contact` (public), `GET /api/admin/contact-messages`, `GET /api/admin/contact-messages/[id]` (ADMIN)

## Purpose

Allow visitors without an account to send a message to the team. Submissions are stored in the database (`ContactMessage`) and an optional notification email is sent to `PUBLIC_CONTACT_TO` (e.g. `info@` behind Cloudflare Email Routing). Outbound email uses existing Resend/SMTP stack (`lib/email.ts`); **Reply-To** is the submitter’s email.

## Behaviour

- **Fields:** topic (enum), email (required), name (optional), subject, message. Length limits align with in-app feedback-style validation.
- **Spam:** Cloudflare Turnstile when not localhost; in-memory **rate limit by IP** (5 submissions / hour), see `lib/contact-rate-limit.ts`.
- **Email body:** Thai section first, then English, in one HTML message (`lib/email-i18n.ts` `buildContactNotificationEmail`).
- **If `PUBLIC_CONTACT_TO` is unset:** rows are still created; no notification email; `emailSentAt` stays null.

## Data model

- Prisma: `ContactMessage`, enum `ContactTopic` (`GENERAL`, `ACCOUNT_HELP`, `PRODUCT_FEEDBACK`, `PARTNERSHIP_OR_PRESS`, `OTHER`).
- After schema change, sync DB with `npm run db:push` (or your migration flow).

## UI / i18n

- Form copy: `publicContact.*` in `i18n/dictionaries`.
- Admin copy: `admin.contactMessages.*`.
- Landing footer link: `home.footer.contact` → `/contact`.
- Privacy policy section 10 updated to mention `/contact`.

## Tests

- `__tests__/api/contact.test.ts` — validation and email path.
- `__tests__/api/admin/contact-messages.test.ts` — list/detail and RBAC.
- `lib/__tests__/email.test.ts` — contact notification + Reply-To.
