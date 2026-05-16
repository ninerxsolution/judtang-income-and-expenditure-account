# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Product

Judtang is a Next.js 16 (App Router) personal finance web app (Thai/English; UI defaults to Thai) for tracking income/expenses across bank accounts, credit cards, and wallets. Stack: React 19, TypeScript (strict, no `any`), MariaDB/MySQL via Prisma 7, NextAuth (JWT sessions), Tailwind v4 + shadcn/ui (new-york style) + lucide-react icons.

See `AGENTS.md` for the full product/agent brief and `docs/INDEX.md` for the documentation map.

## Commands

The dev server runs on port **3910** (not 3000). Terminal is **Windows PowerShell** — do not chain commands with `&&`; run them as separate invocations.

| Task | Command |
|---|---|
| Install deps | `npm install` (postinstall runs `prisma generate`; requires `DATABASE_URL` in `.env`) |
| Dev server | `npm run dev` |
| Lint | `npm run lint` |
| All tests | `npm test` |
| Single test file | `npx jest path/to/file.test.ts` |
| Single test by name | `npx jest -t "test name fragment"` |
| Coverage | `npm run test:coverage` |
| Sync schema to DB | `npm run db:push` |
| Seed demo data | `npm run db:seed` (creates `anna@example.com` / `password` with ~1600 txns) |
| Reset + seed | `npm run db:seed:reset` |
| Frontend-only build check | `npx next build` (see Prisma warning below) |

`npm run build` runs `prisma generate && next build`. It does NOT run `prisma migrate`, but verify `package.json` scripts before running anything DB-adjacent — historically a build script was edited to run `prisma migrate deploy` and broke the DB.

## Prisma rules (hard constraints)

- **Never run `prisma migrate dev`, `prisma migrate deploy`, or any `migrate` command autonomously.** Suggest the command and let the user run it. Editing `schema.prisma` is fine.
- **Never create `prisma/migrations/*/migration.sql` files by hand.** Manual files get the timestamp and table/column casing wrong. Let `prisma migrate dev` generate them.
- Migration SQL uses **PascalCase table names** (`FinancialAccount`, `Transaction`, `User`) and **camelCase columns**. Case-only mismatches apply on Windows but fail on case-sensitive Linux MySQL/MariaDB and leave columns missing in prod.
- Do not add `@@map("table_name")` — model name is the table name. `@map` on individual fields is allowed.
- For local schema sync, prefer `npm run db:push`.
- After schema edits, if Prisma throws `Unknown argument '<newField>'`, run `npx prisma generate` and restart the dev server.

## Architecture

### Routing layout

The app uses Next.js route groups under `app/`:

- `app/(auth)/` — sign-in, register, forgot/reset password, verify-email, restore-account. Public.
- `app/(dashboard)/` — main authenticated app. Wrapped by `BalanceVisibilityProvider` (state in `localStorage` key `judtang_balance_visible`; masks balance card + income/expense + budget on the dashboard home only).
- `app/(admin)/` — admin-only routes; requires `session.user.role === "ADMIN"`.
- `app/api/` — REST handlers grouped by domain (`transactions`, `financial-accounts`, `budgets`, `credit-card`, `ocr`, `recurring-transactions`, `reports`, `fx`, `dashboard`, …).

Route protection lives in **`proxy.ts`** (Next.js 16 middleware-equivalent). It uses `getServerSession(authOptions)` because `withAuth` is JWT-only. Redirects unauthenticated users away from `/dashboard`, gates `/admin` on role, and bounces signed-in users away from `/sign-in|/register|/restore-account` (callback URL is sanitized to same-origin, never another auth-entry path).

### Auth

`auth.ts` configures NextAuth with **JWT session strategy** and Prisma Adapter (for OAuth User/Account rows). Each sign-in writes a `UserSession` row keyed by `sessionId` in the JWT; the `jwt` callback validates that row on every request and clears the token if it is revoked/expired/SUSPENDED/DELETED. `rememberMe` is credentials-only (OAuth always gets the long TTL). When a SUSPENDED/DELETED user signs in, `finalizeDeletion` replaces the email with `deleted_<userId>_…` so the address can be reused.

### Data layer

`lib/` is the business logic core; API route handlers are thin wrappers around it.

- `lib/prisma.ts` — singleton client.
- `lib/transactions.ts` — create/update/bulk transaction logic; the entry point most API routes call.
- `lib/transaction-balance-snapshot.ts`, `lib/transaction-ledger-delta.ts`, `lib/balance.ts` — `accountBalanceAfter` snapshots and ledger arithmetic. For debit-card rows with a `linkedAccountId`, snapshots must rebuild across the **combined** card+bank ledger; rebuilding the bank alone leaves `accountBalanceAfter` blank on card rows.
- `lib/transfer-group-patch-utils.ts` — guards for PATCH on rows in a `transferGroupId` (cross-currency transfers are two rows sharing the same group; edit/delete acts on the whole group).
- `lib/budget.ts`, `lib/budget-shared.ts` — budgets are **THB-only**. `getBudgetIndicator` treats exactly 100% as `full`; only `> 100%` is `over`.
- `lib/fx-rate.ts`, `lib/currency.ts`, `lib/fx-display.ts` — multi-currency. `exchangeRate` field means **THB per 1 unit of the row's currency** (1 when the leg is THB). Dashboards and budgets always summarize in THB; non-THB legs use approximate THB with a 32 THB/USD fallback when no rate is available.
- `lib/recent-categories.ts`, `lib/recent-financial-accounts.ts` — MRU lists backed by `localStorage` keys `judtang_recent_categories` and `judtang_recent_financial_accounts`. Always use the shared pickers (`CategoryRowSelect`, `CategoryCombobox`, `CategoryCapsulePicker`, `AccountCombobox`) so MRU behavior is preserved.
- `lib/email-config.ts` (`getEmailAppBaseUrl`) — picks the URL base for transactional email links. In development `NEXTAUTH_URL` wins; in production `APP_BASE_URL` can override.
- `lib/encryption.ts` — requires `ENCRYPTION_KEY`.

### Transactions list cache

`app/api/transactions/route.ts` wraps the list in a **module-level** `unstable_cache` (`getCachedTransactionsList`) with `keyParts` that include a payload-version string (e.g. `snap-v1`). **Bump `TRANSACTIONS_LIST_CACHE_VERSION` whenever the serialized list shape changes** (added/removed/renamed field) — old cache entries serving the previous shape have caused "—" to appear in balance columns. Mutations call `revalidateTag("transactions")`.

### `occurredAt` is always date+time

Sending `"YYYY-MM-DD"` to APIs that take `occurredAt` becomes 00:00 UTC = 07:00 Bangkok. Every transaction-creating UI (form dialog, credit-card payment, recurring confirm, transfer, …) must combine the picked date with the current time and send a full ISO string. Backend routes that accept `occurredAt` must call `parseOccurredAt()` from `lib/date-range.ts` — it merges date-only inputs with the current UTC time.

### Recurring transactions

A recurring template counts as "paid this month" only when a posted row carries that template's `recurringTransactionId` for the due month. A manual transaction in the same period does not count; confirming the recurring afterwards without removing the manual row double-counts.

### Slip OCR

`lib/slip-parser.ts` plus `app/api/ocr/*`. There is an engine fallback chain (see `.cursor/rules/slip-ocr-engine-fallback.mdc`). PDF rendering uses `@react-pdf/renderer` (marked as a server external package in `next.config.ts`); Thai font is Sarabun.

### i18n

`i18n/dictionaries/` (Thai default, English alternate), accessed through `hooks/use-i18n.ts`. Server email translations: `lib/email-i18n.ts`.

## Frontend conventions

- **shadcn/ui first.** Prefer adding via `npx shadcn@latest add <component>` (style: new-york, config: `components.json`). Don't hand-roll Button/Card/Dialog/etc.
- **Icons:** `lucide-react` only. No emoji-as-icon, no other icon libraries.
- **Date range pickers:** use the shared `DateRangePicker` everywhere (transactions, data-tools, accounts/[id], activity-log) — do not pair two single-date pickers.
- **Multi-field dialogs:** go fullscreen on mobile (see `.cursor/rules/dialog-mobile-fullscreen-form.mdc`).
- **Account selection inside modals:** use the drill-down `AccountSlidePicker` from `transaction-form-dialog`; reset picker navigation when the dialog closes.
- **Skeleton loaders:** mirror the final structure, not generic blocks.
- **Dashboard data refresh:** `DashboardDataProvider.refresh()` is silent; call `load({ showLoadingOverlay: true })` when you want the global skeleton.
- **`isAccountIncomplete` for debit `CREDIT_CARD`** requires `linkedAccountId`. Any Prisma `select` passed to that check must include `linkedAccountId`, or valid debit cards get falsely flagged.

## Reuse-first

Before adding a new component or helper, grep for the existing pattern (date range, MRU picker, RowSelect, dialog form, etc.) and extend the shared one via props/config. Don't duplicate. When modifying behavior, also check every other site using the same pattern.

## Testing — important caveat

`__tests__/api/*.test.ts` heavily mock `@/lib/transactions` and `@/lib/prisma`. **A green `npm test` is not proof a save/update flow works from the browser** — the broken layer is the one being mocked. After changing transaction create/update/bulk/snapshot paths, either:

1. Add tests that execute the real helper (pure functions in `lib/`), or
2. Replay the request with the exact JSON body shape the UI sends (explicit `null` fields matter — they are not the same as `undefined` in the transfer-group PATCH guards).

See `.cursor/rules/verification-jest-vs-ui-api-paths.mdc` and `lib/transfer-group-patch-utils.ts`.

## Environment

- `.env` is required before `npm install` (postinstall calls `prisma generate`, which reads `prisma.config.ts` → `DATABASE_URL`).
- `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` must be set. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
- Email: with `RESEND_API_KEY` the app uses Resend (set `EMAIL_FROM`); otherwise it falls back to Nodemailer via `SMTP_*`.
- Cloudflare Turnstile is auto-disabled on `localhost` / `APP_ENV=development`, so no Turnstile keys are needed locally.
- Forgot-password is enumeration-safe: an OAuth-only account gets a generic success response without sending a reset email.

## Communication style

- No emojis in responses (per `AGENTS.md`).
- Do not paste live `.env` values, DB URLs, or third-party API keys into chat; rotate credentials if they leak.
- Do not claim to autonomously merge/apply diffs in the editor — applying code requires the user to accept.
