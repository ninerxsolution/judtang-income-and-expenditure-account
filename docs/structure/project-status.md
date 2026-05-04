# Project status (implementation snapshot)

**Last updated:** 04/05/2026  
**Audience:** maintainers and agents aligning docs with the repo.

This page summarizes **where the codebase stands today**, not the original MVP intent alone. The canonical product spec remains [PRD.md](../PRD.md); feature detail lives under [feature/](../feature/).

---

## 1. Product at a glance

- **Stack:** Next.js (App Router), NextAuth, Prisma 7 + MariaDB/MySQL driver adapter, Tailwind + shadcn/ui, Thai/English i18n.
- **Money model:** Dashboards and budgets are **THB-centric**; transaction rows store **account currency**, `exchangeRate` (THB per 1 unit of row currency), and optional `baseAmount` snapshot. Same-currency **TRANSFER** is one row; **cross-currency** uses two rows sharing `transferGroupId` + `transferLeg`.
- **Docs split:** [INDEX.md](../INDEX.md) maps `structure/`, `core/`, `feature/`. **Phase 2 credit-card cross-currency PAYMENT** is documented only as scope ([feature/multi-currency-cc-payment-phase2.md](../feature/multi-currency-cc-payment-phase2.md)) — **not implemented**.

---

## 2. Transactions and balances (recent hardening)

- **Persisted running balance** on `Transaction`: `accountBalanceAfter`, `transferAccountBalanceAfter` (nullable for legacy rows). Rebuilt after create/update/delete and related flows (bulk monthly save, import, recurring confirm, card payment, etc.) via `lib/transaction-balance-snapshot.ts` and ledger deltas in `lib/transaction-ledger-delta.ts`.
- **UI:** “Balance after transaction” column on the transactions list and account detail transaction table (when data exists).
- **GET `/api/transactions` list cache:** Module-level `unstable_cache` with a **payload version** key (`TRANSACTIONS_LIST_CACHE_VERSION` in `app/api/transactions/route.ts`) so cached list entries are not reused across incompatible JSON shapes. Mutations call `revalidateTag("transactions")` (and related tags). See [caching-strategy.md](../core/caching-strategy.md).
- **Monthly entry (`/dashboard/monthly-entry`):** Saves edited rows with `PATCH /api/transactions/[id]` and new rows with `POST /api/transactions/bulk`. Bulk create aligns with main create path: `currency`, `exchangeRate`, `baseAmount`, `postedDate`, `status`; validates accounts and rejects cross-currency bulk transfers with **400** instead of failing late.
- **Cross-currency pair PATCH guard:** Rows with `transferGroupId` restrict which fields can change from the generic PATCH endpoint. Clients that send explicit `categoryId: null` must not be treated as a category mutation when the stored value is already null — handled via `lib/transfer-group-patch-utils.ts`.
- **Snapshot writes vs Prisma client drift:** If the runtime Prisma Client lags the schema (e.g. after adding balance columns), `transaction.update({ data: { accountBalanceAfter }})` can throw `Unknown argument` even though the **main** update already committed — users see **500** but data appears saved. Snapshot flushing uses **parameterized raw SQL** for those columns to reduce dependence on generated update input types; operators should still run `npx prisma generate` and **restart the dev server** after schema changes.

---

## 3. Testing and verification (important)

- Jest covers many API routes by **importing route handlers** and mocking Prisma / `lib/transactions`. That proves handler wiring and auth shapes, **not** always the full `updateTransaction` + snapshot path against a real database.
- New **pure** tests exist for fragile guards (e.g. `__tests__/lib/transfer-group-patch-utils.test.ts`). For transaction/snapshot changes, treat **browser Network payload parity** or targeted integration checks as part of “done,” not only green Jest when mocks bypass the failing layer.
- Workspace guidance: `.cursor/rules/verification-jest-vs-ui-api-paths.mdc` and [testing-strategy.md](./testing-strategy.md).

---

## 4. Database and ops (project conventions)

- **Schema sync:** This repo commonly uses `npm run db:push` for local/dev alignment with `schema.prisma` (see [AGENTS.md](../../AGENTS.md)). Autonomous `prisma migrate` execution by agents is **forbidden** by project rules; production migration cadence is a human decision.
- **After Prisma schema field changes:** Run `npx prisma generate` and restart `next dev` so the server loads a client that knows new fields. See `.cursor/rules/prisma-client-unknown-argument-after-schema-change.mdc`.

---

## 5. Suggested “health check” for a new machine

1. `.env` from `.env.example` with `DATABASE_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`.
2. `npm install` (postinstall runs `prisma generate`).
3. MariaDB up; `npm run db:push` if schema drift; optional `npm run db:seed`.
4. `npm run dev` (port per `package.json`, commonly 3910).
5. Smoke: sign in, create one transaction, open transactions list and monthly entry, confirm no 500 on PATCH/bulk for typical rows.

---

## 6. Related docs

- [caching-strategy.md](../core/caching-strategy.md) — list cache versioning and tags.
- [testing-strategy.md](./testing-strategy.md) — tools, focus, verification caveats.
- [product-overview.md](./product-overview.md) — high-level product framing.
- [PRD_CHANGE_LOG.md](../PRD_CHANGE_LOG.md) — dated doc edits.
