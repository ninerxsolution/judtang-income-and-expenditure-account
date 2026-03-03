# Testing Strategy

**Updated:** 03/03/2026

**Source:** PRD §10

---

## Scope

- Focus on Authentication, Core Domain logic, and Financial & Credit Card
- UI testing is out of scope in the initial phase

## Tools

- Jest
- Direct handler import for API routes (no Supertest; mocks for prisma, next-auth)

## Focus Areas

- Authentication flow behavior
- User creation and account merging
- Activity log emission
- **Financial & Credit Card** — `isAccountIncomplete`, `recordPayment`, payment validation and allocation
- API routes — auth, 401/404/400/200 responses

## Lib unit tests

- **lib/__tests__/validation.test.ts** — `normalizeEmail`, `isValidEmailFormat`, `validatePasswordLength`
- **lib/__tests__/format.test.ts** — `maskAccountNumber`, `formatCardNumber`, `formatBankAccountNumber`, `formatAmount`
- **lib/__tests__/date-range.test.ts** — `getDateRangeInTimezone`, `toDateStringInTimezone`
- **lib/__tests__/thai-banks.test.ts** — `getBankDisplayName`
- **lib/__tests__/card-types.test.ts** — `getCardTypeDisplayName`
- **lib/__tests__/categories-display.test.ts** — `getCategoryDisplayName`
- **lib/__tests__/transactions-csv.test.ts** — `serializeTransactionsToCsv`, `parseTransactionsCsv`
- **lib/__tests__/changelog.test.ts** — `parseChangelog`
- **lib/__tests__/account-number.test.ts** — `getAccountNumberForMasking`, `processAccountNumberForStorage`, `getFullAccountNumber` (with encryption mock)
- **lib/__tests__/financial-accounts.test.ts** — `isAccountIncomplete` for CASH/OTHER, BANK/WALLET, CREDIT_CARD; Prisma Decimal handling
- **lib/credit-card/__tests__/payment.test.ts** — `recordPayment` validation and success paths
- **lib/credit-card/__tests__/statement.test.ts** — `getPeriodForClosingDate`

## API integration tests

- **__tests__/api/app-info.test.ts** — GET (401, 200)
- **__tests__/api/auth/register.test.ts** — POST (validation, duplicate, success)
- **__tests__/api/users/me.test.ts** — GET (401, 404, 200), PATCH (401, 400, 200)
- **__tests__/api/sessions.test.ts** — GET, POST, DELETE (401, 400, 200)
- **__tests__/api/financial-accounts.test.ts** — GET, POST, GET/PATCH/DELETE [id]
- **__tests__/api/transactions.test.ts** — GET, POST (validation, success)
- **__tests__/api/categories.test.ts** — GET, POST, PATCH, DELETE [id]
- **__tests__/api/dashboard.test.ts** — GET /api/dashboard/init
- **__tests__/api/activity-log.test.ts** — GET /api/activity-log
- **__tests__/api/transactions-summary.test.ts** — GET /api/transactions/summary
- **__tests__/api/credit-card.test.ts** — payment, apply-interest, close-statement

## Deferred

- `POST /api/auth/forgot-password`, `reset-password`, `verify-email` — token + email flow
- `POST /api/transactions/import`, `export` — file handling
- `POST /api/reports` — PDF generation
- `PATCH /api/users/me/password` — password change flow
- `__tests__/auth/auth.test.ts` — NextAuth credentials flow
