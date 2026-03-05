# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Judtang is a Next.js 16 personal finance web app (Thai/English) for tracking income/expenses across bank accounts, credit cards, and wallets. Uses MariaDB/MySQL via Prisma ORM, NextAuth for authentication, and Tailwind CSS + shadcn/ui for the frontend.

### Services

| Service | Port | How to run |
|---|---|---|
| MariaDB | 3306 | `sudo service mariadb start` |
| Next.js dev server | 3000 | `npm run dev` |

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
| Test | `npm test` (Jest, 261 tests, all unit/integration — no DB needed) |
| Dev server | `npm run dev` |
| Push schema | `npm run db:push` |
| Seed data | `npm run db:seed` |

### Gotchas

- `npm install` (postinstall) requires `DATABASE_URL` in `.env` because `prisma generate` reads `prisma.config.ts` which resolves this env var. Create `.env` from `.env.example` before installing.
- `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` must be set for auth and encryption to work. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- Cloudflare Turnstile is auto-disabled on `localhost` / `APP_ENV=development`, so no Turnstile keys are needed locally.
- The test suite (Jest) uses mocks and does not require a running database.
- The app UI defaults to Thai. Language can be switched via the header.
