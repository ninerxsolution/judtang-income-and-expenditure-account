# Testing Strategy (Initial)

**Updated:** 01/03/2026

**Source:** PRD §10

---

## Scope

- Focus on Authentication, Core Domain logic, and Financial & Credit Card
- UI testing is out of scope in the initial phase

## Tools

- Jest
- Supertest
- MySQL test schema

## Focus Areas

- Authentication flow behavior
- User creation and account merging
- Activity log emission
- Error-path logging
- **Financial & Credit Card** — `isAccountIncomplete`, `recordPayment`, payment validation and allocation

## Financial & Credit Card unit tests

- **lib/__tests__/financial-accounts.test.ts** — `isAccountIncomplete` for CASH/OTHER, BANK/WALLET, CREDIT_CARD; Prisma Decimal handling.
- **lib/credit-card/__tests__/payment.test.ts** — `recordPayment` validation (amount, account type, userId, incomplete credit card, outstanding, from-account); PAYMENT + EXPENSE creation; statement allocation.

**Note:** API integration tests (POST /api/financial-accounts, POST /api/credit-card/[id]/payment, POST /api/transactions) are deferred until test DB setup is defined.

## Authentication unit tests

- **__tests__/app/api/auth/register.test.ts** — POST /api/auth/register (validation, duplicate email, create user, error handling).
- **__tests__/app/api/sessions.test.ts** — GET (list sessions), POST (touch current session), DELETE (revoke one / all / others).
- **__tests__/app/api/users/me.test.ts** — GET /api/users/me (401, 404, 200 with hasPassword), PATCH /api/users/me (401, 400 invalid JSON, 200 update name).
- **__tests__/app/api/users/me/password.test.ts** — PATCH /api/users/me/password (401, 400 missing/short password, 400 OAuth user, 401 wrong current, 200 success).
- **__tests__/auth/auth.test.ts** — Credentials authorize, jwt callback (create/validate UserSession), session callback.
