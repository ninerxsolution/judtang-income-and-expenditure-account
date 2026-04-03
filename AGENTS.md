# AGENTS.md

## Communication style

- Do not use emojis in any responses.

## Cursor Cloud specific instructions

### Git workflow

- When working locally, do not require creating a new branch before editing files.
- Create a dedicated branch only when the user explicitly asks for one, or when preparing to commit or open a pull request.
- Commit each logical change separately with a descriptive message.
- Do not force push or amend commits.

### Product overview

Judtang is a Next.js 16 personal finance web app (Thai/English) for tracking income/expenses across bank accounts, credit cards, and wallets. Uses MariaDB/MySQL via Prisma ORM, NextAuth for authentication, and Tailwind CSS + shadcn/ui for the frontend.

### Services

| Service | Port | How to run |
|---|---|---|
| MariaDB | 3306 | `sudo service mariadb start` |
| Next.js dev server | 3910 | `npm run dev` (`next dev -p 3910`) |

### Database

- MariaDB must be running before the dev server or tests that hit the DB.
- DB credentials: `mysql://judtang:judtang_pass@localhost:3306/judtang` (configured in `.env`).
- `npm run db:push` syncs the Prisma schema to the database (safe to re-run; no migration files needed).
- `npm run db:seed` creates a demo user (`anna@example.com` / `password`) with ~1600 sample transactions.
- **Do not run `prisma migrate`** — the project rules forbid autonomous migration. Use `db:push` for schema sync.

### Key commands

| Task | Command |
|---|---|
| Install deps | `npm install` (postinstall runs `prisma generate`) |
| Lint | `npm run lint` |
| Test | `npm test` (Jest, 667 tests, all unit/integration — no DB needed) |
| Dev server | `npm run dev` |
| Push schema | `npm run db:push` |
| Seed data | `npm run db:seed` |

### Gotchas

- `npm install` (postinstall) requires `DATABASE_URL` in `.env` because `prisma generate` reads `prisma.config.ts` which resolves this env var. Create `.env` from `.env.example` before installing.
- `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` must be set for auth and encryption to work. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- Outbound email: with `RESEND_API_KEY`, the app sends via Resend (auth flows need `EMAIL_FROM`); without it, configure `SMTP_*` for Nodemailer fallback.
- Links inside transactional email use `lib/email-config.ts` (`getEmailAppBaseUrl`): in development (`NODE_ENV=development` or `APP_ENV=development`), `NEXTAUTH_URL` is preferred over `APP_BASE_URL` so verify/reset links stay on the local dev origin; in production, optional `APP_BASE_URL` can override when the public link base should differ from NextAuth.
- Forgot-password sends a reset email only when the user has a password credential; OAuth-only accounts still get a generic success response (enumeration-safe).
- When an admin sets a user to `DELETED`, the API runs `finalizeDeletion` so the real email is replaced with a `deleted_<userId>_...` placeholder and the address can be reused; restoring to active may recover the original email when the row still matches that placeholder pattern.
- Cloudflare Turnstile is auto-disabled on `localhost` / `APP_ENV=development`, so no Turnstile keys are needed locally.
- The test suite (Jest) uses mocks and does not require a running database.
- The app UI defaults to Thai. Language can be switched via the header.
- `.cursor/hooks/state/` is local Cursor hook runtime (e.g. continual-learning index); do not commit it. Keep it gitignored so it does not churn `git status`.
- `isAccountIncomplete` for debit `CREDIT_CARD` rows requires `linkedAccountId`. Any Prisma `select` passed into that check must include `linkedAccountId` or alerts and API guards can falsely treat valid debit cards as incomplete.

## Learned User Preferences

- Do not paste live `.env` values, database URLs, or third-party API keys into chat; if they are exposed, rotate those credentials.
- Never claim to autonomously accept or merge code diffs into the editor. Explain that applying code requires the user to click 'Accept' in the Cursor UI.

## Learned Workspace Facts

- Category and Financial Account pickers use an MRU (Most Recently Used) pattern backed by `localStorage` keys like `judtang_recent_categories`. Always use shared components like `CategoryRowSelect`, `CategoryCombobox`, or `AccountCombobox` to maintain this behavior.
- In `DashboardDataProvider`, `refresh()` updates data silently (without toggling the global loading skeleton). To show the loading overlay, use `load({ showLoadingOverlay: true })`.
