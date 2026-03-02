# Changelog

Format: `# vMAJOR.MINOR.PATCH - YYYY-MM-DD` then `## Section` (Added, Changed, Fixed, Removed, Breaking, Migration).

---

# v0.1.0 - 2026-02-03

## Added

- Product Requirements Document (PRD) and split docs (structure/, core/, feature/).
- Environment variables & configuration strategy (.env, /config optional, MVP boundary).
- System logging strategy (file-based, Winston, JSON format).
- Required libraries doc (runtime, UI, dev/test); technical stack (Next.js, NextAuth, MySQL/Prisma).
- Docs changelog rule: PRD_CHANGE_LOG.md; Cursor rule for docs/**.

## Changed

- PRD reformatted with Markdown (headings, lists, code blocks, tables).
- MVP Boundary: Environment & config — no startup validation; .env only for initial phase.

---

# v0.2.0 - 2026-02-14

## Added

- Session strategy: JWT + UserSession table (Prisma Adapter); session metadata (userAgent, ipAddress via touch).
- Active users: heartbeat, lastActiveAt; session list and revoke (GET/POST/DELETE /api/sessions).
- User profile: GET/PATCH /api/users/me (name); PATCH /api/users/me/password; profile page (/dashboard/me) and dashboard nav.
- Route protection (proxy); session revoke as soft delete (UserSession.revokedAt).
- Validation: email format/length/normalize, password min 8 max 72 (register, change-password); lib/validation.
- Testing strategy: users/me and users/me/password API tests; auth unit tests (register, sessions, callbacks).

## Changed

- Session revoke: list/touch filter by revokedAt null; DELETE sets revokedAt instead of deleting rows.

---

# v0.3.0 - 2026-02-21

## Added

- Activity Log: data model (ActivityLog), action list, API GET /api/activity-log with filters.
- Activity Log UI at /dashboard/settings/activity-log (read-only list + filters).
- Emit from register, sign-in, org/project/task APIs; details format (create/delete/restore/update with changes array).
- API returns userDisplayName; UI shows "By: …" and formatted details (Deleted/Restored, field from→to).
- Entity types and actions: user, session; SESSION_REVOKED (details.scope), USER_PROFILE_UPDATED, USER_PASSWORD_CHANGED, USER_LOGGED_OUT.
- Emit from /api/sessions DELETE, /api/users/me PATCH, /api/users/me/password PATCH; USER_LOGGED_OUT via POST /api/auth/logout.

---

# v0.4.0 - 2026-02-24

## Added

- PRD §18 Income & Expense: data model (Transaction), APIs, UI behaviour (transactions, calendar, data tools).
- Product overview: lightweight Income & Expense tracker with calendar view documented.

## Changed

- Scope: Auth + Activity Log only; Organization/Project/Task/Note/Conclusion moved out of scope.
- MVP Boundary: Auth, Activity Log, System Log in scope; Org/Project/Task out of scope.
- INDEX.md feature section: only Authentication and Activity Log; Income & Expense noted in PRD §18.

## Removed

- Feature docs: organization-management, project-management, task-management, data-center, note-management, conclusion; prd_summary_for_commu folder.

---

# v0.5.0 - 2026-02-26

## Added

- Transaction CRUD via modal/dialog; list merged into /dashboard/transactions (removed /list route).
- Create/Edit: TransactionFormDialog; Delete: TransactionDeleteDialog; calendar day modal Add/Edit/Delete in-page.
- APIs: GET/PATCH/DELETE /api/transactions/[id]; GET /api/transactions/summary; list API extended with `type` query param.
- List filters (from, to, type), pagination, Edit/Delete per row; Data Tools export filters (from, to, type).
- Dashboard summary cards; calendar day modal Edit/Delete.
- Activity Log: entityType transaction; TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED, TRANSACTION_EXPORT, TRANSACTION_IMPORT; details format for export/import.
- Activity Log UI path: /dashboard/settings/activity-log (via Settings).

---

# v0.6.0 - 2026-02-26

## Added

- Forgot password: POST /api/auth/forgot-password; SMTP config, token storage; /forgot-password page.
- Reset password: POST /api/auth/reset-password; /reset-password page; security and token handling.
- Activity Log: USER_PASSWORD_RESET_REQUESTED (documented).

---

# v0.7.0 - 2026-02-26

## Added

- Email verification: soft policy, flow, token storage; GET /api/auth/verify-email, POST /api/auth/resend-verification.
- /verify-email page; profile page shows verification status and resend button.
- /api/users/me returns emailVerified; register sends verification email; Google OAuth sets emailVerified.
- Activity Log: USER_EMAIL_VERIFIED.

---

# v0.8.0 - 2026-03-01

## Added

- Credit Card Engine feature: data model (Transaction status/postedDate/statementId, CreditCardStatement), core logic (outstanding, available credit, expense/payment flow, statement closing).
- FinancialAccount for CREDIT_CARD: creditLimit, statementClosingDay, dueDay, currentOutstanding, availableCredit, interestRate, interestCalculatedUntil, cardType, bankName, accountNumber.
- Thai banks dropdown; accountNumber/bank number masked display on accounts page and credit card payment dialog.
- interestRate (%) and cardType (credit, debit, visa, master, jcb, amex, unionpay, truemoney, other).
- Payment API and validation (incomplete account, from-account); recordPayment with fromAccountId (EXPENSE on from-account).

## Changed

- FinancialAccount schema: bankName, accountNumber, interestRate, cardType; isAccountIncomplete checks.

## Migration

- Run prisma migrate deploy if schema changed.

---

# v0.9.0 - 2026-03-01

## Added

- Transaction Categories: default/custom, isDefault, CRUD in settings; ensureUserHasDefaultCategories.
- Activity Log: FINANCIAL_ACCOUNT_CREATED, FINANCIAL_ACCOUNT_UPDATED, FINANCIAL_ACCOUNT_DISABLED; entityType financialAccount; emit from account create/update/disable.
- Activity Log: TRANSACTION_UPDATED details with `changes` array (field, from, to) for type, amount, category, date, account.
- Activity log page: financialAccount entity type, actions, formatDetails for transaction update and account changes.
- Financial Accounts: isHidden on FinancialAccount; hide/show default account in UI; DELETE endpoint (soft/hard delete).
- Activity Log: FINANCIAL_ACCOUNT_DELETED; delete menu + AlertDialog on accounts page.
- Transaction form: filter isHidden from account dropdown.

## Changed

- ensureUserHasDefaultFinancialAccount and getDefaultFinancialAccount filter by isHidden.
- GET /api/financial-accounts returns isHidden, transactionCount; filters isActive.

## Migration

- Run prisma migrate deploy for isHidden.

---

# v0.10.0 - 2026-03-01

## Added

- Transaction type TRANSFER between accounts: transferAccountId and transferAccount relation on Transaction.
- getAccountBalance includes TRANSFER (out -amount, in +amount).
- createTransaction, updateTransaction, listTransactionsByUser support transferAccountId; list uses OR for account filter.
- POST /api/transactions validates and accepts transferAccountId for TRANSFER; GET/PATCH return transferAccountId, transferAccount.
- Export/import filter by account includes transferAccountId (OR); CSV import supports TRANSFER and transferAccountId.
- Transaction form: TRANSFER type, from/to account dropdowns; transactions page: TRANSFER filter, badge, display.

## Migration

- Run prisma migrate deploy for transferAccountId.

---

# v0.11.0 - 2026-03-02

## Added

- Application-level cache: lib/cache.ts (revalidate 45s, cacheKey helper, re-export unstable_cache).
- unstable_cache on GET: transactions (list, summary, calendar-summary, month-summary, year-summary), financial-accounts, categories, users/me.
- Cache invalidation: revalidateTag from next/cache; tags on cached routes.
- revalidateTag("transactions") on transactions POST, PATCH, DELETE, import; credit-card payment.
- revalidateTag on financial-accounts create, update, delete, disable, restore; categories create, update, delete; users/me PATCH.
- docs/core/caching-strategy.md: implementation and invalidation section.

---

# v1.0.0 - 2026-03-02

## Added

- Release Notes / Patch Note page at /dashboard/settings/patch-note (CHANGELOG.md as single source of truth).
- lib/changelog.ts: parseChangelog, getChangelogVersions (build-time read); react-markdown + remark-gfm for rendering.
- Breaking and Migration sections visually distinct; empty state when no file or no versions.
- Settings link to patch notes; i18n: settings.information.patchNote, settings.patchNote.title/empty/noReleases (en/th).
- Breadcrumb labels for settings and patch-note.

---