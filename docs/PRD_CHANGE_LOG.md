# PRD / Docs Changelog

All notable changes to docs (PRD and split documents) are recorded here.  
**Rule:** Any edit under `docs/` must add an entry here. See [RULE.md](./RULE.md).

---

## 17/03/2026 (Category English name — nameEn, bilingual display)

- docs/feature/categories.md — Added nameEn field to data model; bilingual display (getCategoryDisplayName, DEFAULT_CATEGORY_TRANSLATIONS); API body nameEn; UI form nameEn; ensureUserHasDefaultCategories note.
- CHANGELOG.md — Added v0.9.23: Category English name (nameEn), getCategoryDisplayName, API and form changes.
- CHANGELOG.th.md — Added v0.9.23 (Thai).
- docs/PRD_CHANGE_LOG.md — This entry.

---

## 17/03/2026 (Debit card UI: no outstanding/Pay, hide bank in form)

- docs/feature/financial-accounts.md — Debit card: แสดงยอดคงเหลือแบบบัญชีธนาคาร ไม่แสดงยอดค้างชำระ/ปุ่มชำระ; ฟอร์มแก้ไข: ซ่อนธนาคารเมื่อเลือกบัตรเดบิต, auto-fill bankName จากบัญชีที่ผูก.
- docs/PRD_CHANGE_LOG.md — This entry.

---

## 17/03/2026 (Feedback: accounts yellow border, bank account number, debit card)

- docs/feature/financial-accounts.md — needsAttention logic (last activity + last verified); debit card: optional bill due/interest, linkedAccountId; account number: no silent fallback when encryption fails.
- docs/PRD_CHANGE_LOG.md — This entry.

---

## 16/03/2026 (Account Lifecycle — deactivate, restore)

- docs/feature/account-lifecycle.md — New: Account lifecycle (deactivate, grace period, restore), data model, logic, APIs, UI, Activity Log.
- docs/INDEX.md — Added reference to account-lifecycle.md.
- docs/PRD.md — Added §7.7 Account Lifecycle (Deactivate & Restore); updated §1 Overview to mention account deactivation and restore.
- CHANGELOG.md — Added v0.9.22: Account deactivation, restore, email reuse, Activity Log, sign-in updates.
- CHANGELOG.th.md — Added v0.9.22 (Thai).
- docs/PRD_CHANGE_LOG.md — This entry.

---

## 15/03/2026 (Go to Top on home page — docs and changelogs)

- docs/feature/public-landing-page.md — Page structure §2: added item 8 Go to Top; §10 Components: added LandingGoToTop; new §11 Go to Top Button (placement, appearance, behaviour); renumbered §12 Visual Guidelines, §13 Non-Goals.
- CHANGELOG.md — Added v0.9.21: Go to Top on home page (floating button, slide + opacity, scroll to top).
- CHANGELOG.th.md — Added v0.9.21 (Thai).
- docs/PRD_CHANGE_LOG.md — This entry.

---

## 15/03/2026 (Announcement Popup — docs and changelogs)

- docs/feature/announcement-popup.md — New feature doc: overview, behaviour (home page only, date range, dismiss and "don't show again today"), config schema (incl. localized title/content/image_alt/action_label), API, implementation refs, assets.
- docs/INDEX.md — Added reference to feature/announcement-popup.md.
- CHANGELOG.md — Added v0.9.20: Announcement popup on home page.
- CHANGELOG.th.md — Added v0.9.20 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 15/03/2026 (Announcement Popup — implementation)

- data/announcement.json — New JSON config (id, title, content, image, image_alt, start_at, end_at, show_once, dismissible, action_url, action_label); later extended with localized { th, en } for title, content, image_alt, action_label.
- lib/announcement.ts — Announcement type, LocalizedString, resolveLocalized().
- app/api/announcement/route.ts — GET reads data/announcement.json and validates date range.
- components/dashboard/announcement-dialog.tsx — Client component: shows on home page (/), env guard, image + bottom overlay, optional "don't show again today" checkbox (when show_once false), localized content.
- app/layout.tsx — Mount AnnouncementDialog (moved from dashboard layout so it appears on /).
- .env.example — NEXT_PUBLIC_ANNOUNCEMENT_ENABLED.

---

## 15/03/2026 (Cookie consent flow)

- docs/feature/privacy-policy.md — Added §9 Cookie Consent (Implemented): components (ConsentProvider, CookieConsentBanner, ConditionalAnalytics, lib/consent), flow, i18n; added Vercel Analytics/Speed Insights to Third-Party Services table; removed "Consent management / cookie banner" from Out of Scope.
- docs/structure/technical-stack.md — Analytics row: added note that Vercel Analytics and Speed Insights load conditionally only after user consents via cookie banner.
- docs/PRD.md — §11 Technical Stack: Analytics row updated with conditional loading note.
- CHANGELOG.md — Added v0.9.19: Cookie consent flow, conditional analytics.
- CHANGELOG.th.md — Added v0.9.19 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 14/03/2026 (In-App Notifications: implemented)

- docs/feature/notifications.md — Updated: Status from Planned to Implemented; documented data model (persisted + virtual), APIs (GET, POST, PATCH read/unread), UI (Popover on desktop, Sheet on mobile, tabs, mark all read, per-item menu with Mark as read/unread), LocalStorage for virtual read state.
- docs/INDEX.md — Updated: In-App Notifications description (implemented, removed "planned").
- CHANGELOG.md — Added v0.9.18: In-App Notifications enhancements.
- CHANGELOG.th.md — Added v0.9.18 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 11/03/2026 (Vercel Speed Insights)

- app/layout.tsx — Added SpeedInsights from @vercel/speed-insights/next in root layout.
- docs/PRD.md — Added Vercel Speed Insights to §11 Technical Stack.
- docs/structure/technical-stack.md — Added Vercel Speed Insights to Analytics row.
- docs/structure/required_lib.md — Added @vercel/speed-insights to Runtime / Application table.
- CHANGELOG.md — Added v0.9.17: Vercel Speed Insights.
- CHANGELOG.th.md — Added v0.9.17 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 09/03/2026 (Slip upload persistence + UX)

- docs/feature/slip-ocr.md — Updated slip upload docs: client-side compression and telemetry, OCR engine 2 with fallback to engine 3, compact summary/edit flow, and localStorage persistence/recovery behavior.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 09/03/2026

- docs/feature/recurring-transactions.md — Updated recurring UI notes: mobile card stacking, inline calendar date trigger in confirm dialog, toggle switch for active state in edit dialog, and solid primary confirm button.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 07/03/2026 (Year display พ.ศ./ค.ศ.)

- lib/format-year.ts — New: formatYearForDisplay(year, language) for Buddhist Era (th) / Gregorian (en).
- app/(dashboard)/dashboard/settings/budget/page.tsx — Year dropdown uses formatYearForDisplay.
- app/(dashboard)/dashboard/summary/page.tsx — Year dropdown uses formatYearForDisplay.
- components/dashboard/transactions-calendar.tsx — Use formatYearForDisplay from lib; remove local implementation.
- components/landing/landing-footer.tsx — Copyright year uses formatYearForDisplay.
- .cursor/rules/date-time-year-display.mdc — New: rule for year display in date/time components.
- docs/structure/date-time-year-display.md — New: convention and component list for พ.ศ./ค.ศ.
- docs/INDEX.md — Added date-time-year-display.md to structure index.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 07/03/2026 (Planned: In-App Notifications)

- docs/feature/notifications.md — New: Planned feature note — notification window for news, updates, in-app alerts.
- docs/INDEX.md — Added notifications.md to feature index.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 06/03/2026 (Slip OCR: dual-language parser)

- lib/slip-parser.ts — Thai support: จำนวน/บาท amount pattern, ม.ค./ก.พ./... date pattern, Buddhist Era year; skip Thai boilerplate in note.
- lib/__tests__/slip-parser.test.ts — Thai amount, Thai date (2-digit year and Buddhist Era), full Thai slip sample.
- docs/feature/slip-ocr.md — New: Slip OCR feature doc.
- docs/structure/testing-strategy.md — Added slip-parser.test.ts to Lib unit tests.

---

## 06/03/2026 (Slip OCR to Transaction)

- app/api/ocr/parse-slips/route.ts — New: POST /api/ocr/parse-slips; auth, FormData files, OCR.space API (language=tha), parseSlipText; 503/429/400 handling.
- lib/slip-parser.ts — New: parseSlipText (amount, occurredAt, note) for Kasikorn-style slips.
- components/dashboard/slip-upload-dialog.tsx — New: SlipUploadDialog (select images, processing, preview, confirm & create).
- components/dashboard/mobile-bottom-nav.tsx — handleSlipUpload, SlipUploadDialog; Slip upload button opens dialog.
- .env.example — OCR_SPACE_API_KEY.
- i18n/dictionaries/en.ts, th.ts — dashboard.slipUpload keys.

---

## 06/03/2026 (Credit Card Apply Interest v1.1)

- lib/credit-card/interest.ts — New: applyInterest(accountId, userId); formula daily rate, INTEREST transaction, interestCalculatedUntil update, recomputeOutstanding, Activity Log CREDIT_CARD_INTEREST_APPLIED.
- app/api/credit-card/[id]/apply-interest/route.ts — Replaced 501 stub with applyInterest call; 404/400/200 handling.
- lib/activity-log.ts — Added CREDIT_CARD_INTEREST_APPLIED.
- lib/credit-card/__tests__/interest.test.ts — New: unit tests for applyInterest.
- __tests__/api/credit-card.test.ts — apply-interest: 404, 400 incomplete, 200 applied false/true.
- app/(dashboard)/dashboard/settings/activity-log/page.tsx — ACTION_OPTIONS and formatDetails for CREDIT_CARD_INTEREST_APPLIED.
- i18n/dictionaries/en.ts, th.ts — activityLog.actions.CREDIT_CARD_INTEREST_APPLIED, details.creditCardInterestApplied.
- docs/feature/credit-card-engine.md — §4.6 Apply Interest (v1.1), §5 apply-interest row, §7 removed Interest (v1.1) from Out of Scope.
- docs/core/activity-log.md — Added CREDIT_CARD_INTEREST_APPLIED to Credit card actions.

---

## 06/03/2026 (Testing strategy: deferred API tests added)

- __tests__/api/auth/forgot-password.test.ts, reset-password.test.ts, verify-email.test.ts — New tests for auth flows.
- __tests__/api/transactions-export.test.ts, transactions-import.test.ts — New tests for export/import.
- __tests__/api/reports.test.ts — New tests for POST /api/reports.
- __tests__/api/users/me-password.test.ts — New tests for PATCH /api/users/me/password.
- docs/structure/testing-strategy.md — Moved above from Deferred to API integration tests; updated date.

---

## 06/03/2026 (MVP Boundary: Budget + Recurring)

- docs/structure/mvp-boundary.md — Added Budget Management and Recurring Transactions to Implemented (Beyond MVP); updated date to 06/03/2026.

---

## 06/03/2026 (Recurring Transactions feature doc + PRD §7.6)

- docs/feature/recurring-transactions.md — New: Recurring Transactions feature doc (data model, APIs, logic, UI, Activity Log).
- docs/INDEX.md — Added reference to recurring-transactions.md in feature section.
- docs/PRD.md — Added §7.6 Recurring Transactions (templates, due by month, confirm as transaction).

---

## 06/03/2026 (Dialog form fullscreen on mobile — convention)

- docs/structure/dashboard-responsive-ui.md — Added §10 Dialog: form vs simple (mobile fullscreen): rule that form dialogs must be fullscreen on mobile; class pattern and layout; reference to .cursor/rules/dialog-mobile-fullscreen-form.mdc. Renumbered §10 Accessibility to §11.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 05/03/2026 (Budget: Template CRUD UI and Edit category budget)

- app/(dashboard)/dashboard/settings/budget/page.tsx — Templates section (list, Add template), Create/Edit template dialog (name, totalBudget, category limits rows), Delete template AlertDialog; Edit category budget (Edit button per row, dialog to change limit, PATCH categories/[id]).
- i18n/dictionaries/en.ts, th.ts — Added settings.budget: createTemplate, editTemplate, deleteTemplate, templateDeleteConfirm, editCategoryBudget, addLimitRow.
- docs/feature/budget-management.md — UI §5: Template management (create, list, edit, delete); Edit category budget (change limit per row).

---

## 05/03/2026 (Budget Management feature)

- docs/feature/budget-management.md — New: Budget Management (templates, BudgetMonth, BudgetCategory, progress calculation, APIs, UI, edge cases).
- docs/INDEX.md — Added reference to budget-management.md in feature section.

---

## 05/03/2026 (Fullscreen dialog input focus scroll on mobile)

- docs/structure/dashboard-responsive-ui.md — Added §9 Fullscreen dialog — input focus scroll (mobile): DialogBody auto-scrolls focused input into view on mobile; renumbered §10 Accessibility.
- CHANGELOG.md — Added v0.9.13: fullscreen dialog input focus scroll on mobile (DialogBody).
- CHANGELOG.th.md — Added v0.9.13 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 05/03/2026 (Dark theme coverage)

- docs/structure/dashboard-responsive-ui.md — §5 Mobile Bottom Nav: added dark theme note (theme-aware colors via useTheme).
- docs/feature/public-landing-page.md — §11 Visual Guidelines: added Dark theme bullet (landing CSS variables, CTA dark variants).
- CHANGELOG.md — Added v0.9.12: dark theme coverage (mobile nav, landing, accounts, sidebar, calendar, bank combobox).
- CHANGELOG.th.md — Added v0.9.12 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 04/03/2026 (Transactions table responsive + mobile bottom nav v2)

- docs/structure/dashboard-responsive-ui.md — Added §9 Transactions Table Responsive; updated §5 Mobile Bottom Nav (cream bg, icon+label, active bar, 5 items); added useIsDesktopOrLarger hook.
- CHANGELOG.md — Added v0.9.11: mobile bottom nav redesign, useIsDesktopOrLarger, transactions table compact layout, action menu with details.
- CHANGELOG.th.md — Added v0.9.11 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 04/03/2026 (Dashboard responsive UI)

- docs/structure/dashboard-responsive-ui.md — New: Responsive sidebar (dialog on small screens), mobile bottom nav, useIsSmallScreen/useIsMobile hooks, breakpoints, dashboard layout.
- docs/INDEX.md — Added dashboard-responsive-ui.md to structure list.
- CHANGELOG.md — Added v0.9.10: responsive sidebar, mobile bottom nav, useIsSmallScreen, dashboard layout, button styles.
- CHANGELOG.th.md — Added v0.9.10 (Thai).
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 04/03/2026 (Account Detail Page)

- app/(dashboard)/dashboard/accounts/[id]/page.tsx — New: Account detail page with header, info card, quick actions, summary stats, transaction list.
- app/(dashboard)/dashboard/accounts/page.tsx — Account name links to detail page.
- app/api/financial-accounts/[id]/route.ts — GET now returns `isIncomplete`.
- i18n/dictionaries/th.ts, en.ts — Added `accounts.detail.*` keys.
- docs/feature/financial-accounts.md — Added §4.4 Account Detail Page; updated API table.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 03/03/2026 (Docs sync: v0.9.8, Remember Me, Terms & Conditions, MVP boundary)

- docs/core/authentication-authorization.md — Added Remember Me section (Credentials only, TTL, env vars).
- docs/feature/terms-and-conditions.md — New: Terms & Conditions feature doc (route, content, footer link).
- docs/PRD.md — §1 Overview: added Terms & Conditions; §7.5: new Terms & Conditions section.
- docs/INDEX.md — Added terms-and-conditions.md to feature list.
- docs/feature/public-landing-page.md — Footer: added Terms & Conditions link; i18n keys.
- docs/structure/mvp-boundary.md — Added Terms & Conditions, Help & Feedback to Implemented; updated date.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 03/03/2026 (Card type refactor: cardAccountType + cardNetwork)

- docs/feature/financial-accounts.md — Replaced `cardType` with `cardAccountType` (credit/debit/prepaid/other) and `cardNetwork` (visa/master/jcb etc.); updated incomplete validation.
- docs/feature/credit-card-engine.md — Updated card fields to cardAccountType and cardNetwork.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 03/03/2026 (Landing page Earth tone revamp)

- app/page.tsx — Changed background to stone-50/950; added LandingCta section.
- components/landing/* — Revamped all landing components: stone/amber/emerald Earth tone palette; added Hero dashboard mock preview; improved section spacing; fixed FeatureGrid missing light-mode bg.
- docs/feature/public-landing-page.md — §11 Visual Guidelines: updated to stone/amber/emerald.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 03/03/2026 (Testing strategy update)

- docs/structure/testing-strategy.md — Updated: reflect implemented test suite (lib unit tests, API integration tests); direct handler import; list of test files and deferred items.

---

## 03/03/2026 (Help & Feedback feature)

- docs/feature/help-feedback.md — New: full spec for Help & Feedback (report form, admin backoffice, RBAC, seeder, email, storage, APIs).
- docs/INDEX.md — Added help-feedback.md to feature list.
- docs/PRD.md — §7.4: new Help & Feedback section.
- docs/feature/privacy-policy.md — §4.1: added User Feedback & Reports to data classification.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Financial account encryption & storage modes)

- docs/feature/financial-accounts.md — Added encryption (AES-256-GCM), accountNumberMode (FULL/LAST_4_ONLY), credit card last-4-only, delete confirmation flow; updated Data Model and UI sections.
- docs/core/environment-config-strategy.md — Added ENCRYPTION_KEY to environment variables examples.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Dashboard real-time refresh fix)

- app/api/dashboard/init/route.ts — Removed `unstable_cache`; route now queries DB directly on every request and returns `Cache-Control: no-store`. This fixes stale summary cards and recent transactions on dashboard after mutation.
- components/dashboard/dashboard-data-context.tsx — `fetch("/api/dashboard/init")` now uses `{ cache: "no-store" }` to prevent browser HTTP caching.
- docs/core/caching-strategy.md — Removed `GET /api/dashboard/init` from cached routes list; updated tags table (removed `dashboard-init` tag); added explanatory note on why dashboard/init is excluded from `unstable_cache`; added `GET /api/dashboard/init` to client-side no-store list.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Cache invalidation bug fixes)

- app/api/dashboard/init/route.ts — Fixed summary to filter by current month (Asia/Bangkok timezone) instead of all-time; added `getCurrentMonthRange()` helper.
- app/api/transactions/route.ts — POST now also calls `revalidateTag("financial-accounts")` (both PAYMENT branch and general branch).
- app/api/transactions/[id]/route.ts — PATCH and DELETE now also call `revalidateTag("financial-accounts")`.
- app/api/transactions/import/route.ts — POST now also calls `revalidateTag("financial-accounts")`.
- app/api/credit-card/[id]/payment/route.ts — POST now also calls `revalidateTag("financial-accounts")`.
- app/api/credit-card/[id]/close-statement/route.ts — Added `revalidateTag` for all three tags (`financial-accounts`, `transactions`, `dashboard-init`); previously had no revalidation at all.
- app/(dashboard)/dashboard/accounts/page.tsx — `fetchAccounts()` now uses `{ cache: "no-store" }`.
- components/dashboard/transactions-calendar.tsx — All client-side fetches (`openDay`, calendar-summary, month-summary, year-summary) now use `{ cache: "no-store" }`.
- app/(dashboard)/dashboard/transactions/page.tsx — `refreshList()` fetch now uses `{ cache: "no-store" }`.
- docs/core/caching-strategy.md — Updated Cache Invalidation section: expanded mutation points table; added `financial-accounts` column; added Client-Side Fetch Behavior section documenting `no-store` pattern.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Privacy Policy page)

- docs/feature/privacy-policy.md — New: full spec for Privacy Policy page (route, data classification, 10 sections, third-party disclosure, i18n structure, footer link, versioning, out of scope).
- docs/INDEX.md — Added privacy-policy.md to feature list.
- docs/PRD.md — §1 Overview: added Privacy Policy; §7.3: new Privacy Policy section.
- docs/structure/mvp-boundary.md — Added Privacy Policy to Implemented list.
- docs/feature/public-landing-page.md — Updated footer section: added Privacy Policy link.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Vercel Analytics integration)

- docs/PRD.md — §11 Technical Stack: added Analytics (Vercel Web Analytics via `@vercel/analytics/next`).
- docs/structure/technical-stack.md — Updated: added Analytics row.
- docs/structure/required_lib.md — Updated: added @vercel/analytics under Runtime / Application.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Dashboard performance optimization)

- docs/core/caching-strategy.md — Added `GET /api/dashboard/init` batch API; added `dashboard-init` tag and mutation invalidation.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Documentation update — full sync)

- docs/feature/public-landing-page.md — New: full spec for Public Product Landing Page (structure, navbar, hero, core value, feature grid, engine, CTA, footer, theme/language switchers, i18n, components, releases page).
- docs/INDEX.md — Added public-landing-page.md and transfers.md to feature list.
- docs/structure/product-overview.md — Updated: Judtang Financial Engine branding; overview now includes Public Landing Page, Releases page, theme/language switchers; target users updated.
- docs/structure/technical-stack.md — Added next-themes, i18n (custom dictionary).
- docs/structure/mvp-boundary.md — Added Implemented section: Public Landing, Releases, Income & Expense, Financial Accounts, Credit Card Engine.
- docs/structure/open-questions.md — Removed resolved dashboard layout question.
- docs/PRD.md — §1 Overview: Judtang Financial Engine branding, landing page, releases; §7.2: Public Landing Page; §12: Removed resolved dashboard layout question.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Public Product Landing Page)

- app/page.tsx — Refactored into full product landing page: Navbar, Hero, Core Value, Feature Grid, Engine, CTA, Footer.
- app/releases/page.tsx — New: public releases page (changelog) for unauthenticated users.
- components/landing/* — New: landing-navbar, landing-hero, landing-core-value, landing-feature-grid, landing-engine, landing-cta, landing-footer.
- i18n/dictionaries/en.ts, i18n/dictionaries/th.ts — home.nav, home.hero, home.coreValue, home.features, home.engine, home.cta, home.footer.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Release Notes / Patch Note page)

- CHANGELOG.md — New: single source of truth for release notes (format: # vX.Y.Z - date, ## Added/Changed/etc.).
- lib/changelog.ts — New: parseChangelog, getChangelogVersions (build-time read from project root).
- app/(dashboard)/dashboard/settings/patch-note/page.tsx — New: Server Component; renders CHANGELOG.md with react-markdown; Breaking/Migration sections styled; empty state when no file or no versions.
- i18n/dictionaries/en.ts, i18n/dictionaries/th.ts — settings.information.patchNote, settings.patchNote.title/empty/noReleases.
- components/dashboard/dashboard-breadcrumb.tsx — Breadcrumb labels for settings, patch-note.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Cache invalidation on mutation)

- lib/cache.ts — Export revalidateTag from next/cache.
- app/api/transactions/* — Add tags to unstable_cache; call revalidateTag("transactions") on POST, PATCH, DELETE, import.
- app/api/financial-accounts/* — Add tags; call revalidateTag on create, update, delete, disable, restore.
- app/api/credit-card/[id]/payment/route.ts — Call revalidateTag("transactions") after recordPayment.
- app/api/categories/* — Add tags; call revalidateTag("categories") on create, update, delete.
- app/api/users/me/route.ts — Add tags; call revalidateTag("users-me") on PATCH.
- docs/core/caching-strategy.md — Update Cache Invalidation section: tags, revalidateTag, mutation points.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Application-level cache implementation)

- lib/cache.ts — New: revalidate constant (45s), cacheKey helper, re-export unstable_cache.
- app/api/transactions/summary/route.ts — GET wrapped with unstable_cache.
- app/api/transactions/route.ts — GET list wrapped with unstable_cache.
- app/api/transactions/calendar-summary/route.ts — GET wrapped with unstable_cache.
- app/api/transactions/month-summary/route.ts — GET wrapped with unstable_cache.
- app/api/transactions/year-summary/route.ts — GET wrapped with unstable_cache.
- app/api/financial-accounts/route.ts — GET wrapped with unstable_cache (after ensureUserHasDefaultFinancialAccount).
- app/api/categories/route.ts — GET wrapped with unstable_cache (after ensureUserHasDefaultCategories).
- app/api/users/me/route.ts — GET wrapped with unstable_cache.
- docs/core/caching-strategy.md — Added Implementation section: cached routes, revalidate, key shape.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 01/03/2026 (TRANSFER Between Accounts)

- prisma/schema.prisma — Added `transferAccountId` and `transferAccount` relation to Transaction.
- prisma/migrations/ — Added migration for transferAccountId.
- lib/balance.ts — getAccountBalance now includes TRANSFER (out -amount, in +amount).
- lib/transactions.ts — createTransaction, updateTransaction, listTransactionsByUser support transferAccountId; list uses OR for account filter.
- app/api/transactions/route.ts — POST validates and accepts transferAccountId for TRANSFER.
- app/api/transactions/[id]/route.ts — GET/PATCH return transferAccountId, transferAccount.
- app/api/transactions/export/route.ts — Filter by account includes transferAccountId (OR).
- app/api/transactions/import/route.ts — CSV import supports TRANSFER and transferAccountId.
- lib/transactions-csv.ts — Added transferAccountId to optional columns and serialization.
- components/dashboard/transaction-form-dialog.tsx — Added TRANSFER type, from/to account dropdowns.
- app/(dashboard)/dashboard/transactions/page.tsx — TRANSFER filter, badge, display.
- i18n — Added transfer, fromAccount, toAccount, transferTo, validation keys.
- docs/feature/transfers.md — New feature doc for TRANSFER.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 01/03/2026 (Financial Accounts: Hide/Show Default, Delete)

- prisma/schema.prisma — Added `isHidden` to FinancialAccount.
- prisma/migrations/ — Added migration for isHidden.
- lib/financial-accounts.ts — ensureUserHasDefaultFinancialAccount and getDefaultFinancialAccount filter by isHidden.
- app/api/financial-accounts/route.ts — GET returns isHidden, transactionCount; filters isActive.
- app/api/financial-accounts/[id]/route.ts — PATCH supports isHidden; added DELETE (soft/hard delete).
- lib/activity-log.ts — Added FINANCIAL_ACCOUNT_DELETED.
- app/(dashboard)/dashboard/accounts/page.tsx — Hide/show default UI, delete menu + AlertDialog.
- components/dashboard/transaction-form-dialog.tsx — Filter isHidden from account dropdown.
- i18n — Added labels for hide/show default, delete, activity log FINANCIAL_ACCOUNT_DELETED.
- docs/feature/financial-accounts.md — Added isHidden, DELETE endpoint, §6 Hide/Show Default, §7 Delete.
- docs/core/activity-log.md — Added FINANCIAL_ACCOUNT_DELETED.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 02/03/2026 (Cloudflare Turnstile bot protection)

- docs/PRD.md — §8 Authentication: documented Cloudflare Turnstile protection on public auth forms and environment variables.
- docs/core/authentication-authorization.md — Added Bot protection (Cloudflare Turnstile) section describing forms, verification flow, and local-development behavior.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this update.

---

## 01/03/2026 (Activity Log: Financial Account)

- lib/activity-log.ts — Added FINANCIAL_ACCOUNT_CREATED, FINANCIAL_ACCOUNT_UPDATED, FINANCIAL_ACCOUNT_DISABLED.
- app/api/financial-accounts/route.ts — Log on account create.
- app/api/financial-accounts/[id]/route.ts — Log on account update with changes array (before/after).
- app/api/financial-accounts/[id]/disable/route.ts — Log on account disable.
- activity-log page — Added financialAccount entity type, actions, formatDetails.
- i18n — Added labels for financial account actions and change fields.
- docs/core/activity-log.md — Updated actions and entity types.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 01/03/2026 (Activity Log: Transaction Update Before/After)

- lib/transactions.ts — TRANSACTION_UPDATED now stores `changes` array with { field, from, to } for each changed field (type, amount, category, date, account).
- app/(dashboard)/dashboard/settings/activity-log/page.tsx — formatDetails for TRANSACTION_UPDATED displays "field: from → to" when changes exist.
- i18n — Added activityLog.details.changeFields (type, amount, category, date, account).
- docs/core/activity-log.md — Updated transaction update details format.
- docs/PRD_CHANGE_LOG.md — Changelog entry.

---

## 01/03/2026 (Activity Log Detail Enhancement)

- docs/core/activity-log.md — Updated: details format for transaction create/update/delete, credit card payment, export, import; added CREDIT_CARD_PAYMENT, USER_EMAIL_VERIFIED, USER_PASSWORD_RESET_REQUESTED to actions; UI description for transaction/credit-card detail display.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Activity Log detail enhancement.

---

## 01/03/2026 (Category Settings)

- docs/feature/categories.md — Added: Transaction Categories feature doc (default/custom, isDefault, CRUD in settings, ensureUserHasDefaultCategories).
- docs/INDEX.md — Updated: feature section to link categories.md.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Category Settings.

---

## 01/03/2026 (Docs and Tests Update)

- docs/feature/financial-accounts.md — Added: Financial Accounts feature doc (model, AccountType, isAccountIncomplete, bank/account number, account sections UI, incomplete behavior).
- docs/feature/credit-card-engine.md — Updated: §3.1 bankName, accountNumber, cardType; interestRate in use; §4.4 fromAccountId and EXPENSE on from-account; §5 payment body; §6 validation (incomplete, from-account).
- docs/INDEX.md — Updated: feature section to link financial-accounts.md.
- docs/structure/testing-strategy.md — Updated: Financial & Credit Card focus area; lib/__tests__/financial-accounts.test.ts, lib/credit-card/__tests__/payment.test.ts; API integration tests deferred.
- docs/PRD_CHANGE_LOG.md — Changelog entry for docs update.

---

## 01/03/2026 (Credit Card: Interest Rate & Card Type)

- docs/PRD_CHANGE_LOG.md — Changelog entry: Credit card accounts now support interestRate (%) and cardType (credit, debit, visa, master, jcb, amex, unionpay, truemoney, other).

---

## 01/03/2026 (Financial Account Enhancement)

- docs/PRD_CHANGE_LOG.md — Changelog entry for Financial Account Enhancement: bankName (Thai banks dropdown), accountNumber (bank/card number), masked display on accounts page and credit card payment dialog.

---

## 01/03/2026 (Credit Card Engine)

- docs/feature/credit-card-engine.md — Added: Credit Card Engine feature doc (data model, core logic, APIs, validation).
- docs/INDEX.md — Updated: feature section to link credit-card-engine.md.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Credit Card Engine.

---

## 26/02/2026 (email verification)

- docs/core/authentication-authorization.md — Added Email verification: soft policy, flow, token storage; GET /api/auth/verify-email, POST /api/auth/resend-verification; /verify-email page; profile page shows verification status and resend button; /api/users/me returns emailVerified; register sends verification email; Google OAuth sets emailVerified.
- docs/PRD_CHANGE_LOG.md — Changelog entry for email verification feature.

---

## 26/02/2026 (password reset)

- docs/core/authentication-authorization.md — Added Forgot password and reset password: flow, SMTP config, token storage, security; /api/auth/forgot-password (POST), /api/auth/reset-password (POST); pages /forgot-password, /reset-password.
- docs/PRD_CHANGE_LOG.md — Changelog entry for password reset feature.

---

## 26/02/2026

- docs/PRD.md — §18.4: Transaction CRUD changed from full-page to modal/dialog. List merged into `/dashboard/transactions` (removed `/list` route). Create/Edit use TransactionFormDialog; Delete uses TransactionDeleteDialog. Calendar Add/Edit/Delete open modals in-page.
- docs/PRD_CHANGE_LOG.md — Changelog entry for transaction modal UX.
- docs/PRD.md — §18: Added 18.3.8 Single Transaction (GET/PATCH/DELETE /api/transactions/[id]), 18.3.9 Summary (GET /api/transactions/summary); List API 18.3.2 extended with `type` query param; 18.4.1 New/Edit Transaction (edit mode with ?id=); 18.4.2 List filters (from, to, type), pagination, Edit/Delete per row; Calendar day modal Edit/Delete; Dashboard summary cards; Data Tools export filters (from, to, type). Implementation of missing income/expense features per plan.
- docs/PRD.md — §18: (earlier) Added 18.3.6 Export, 18.3.7 Import, 18.4.4 Data Tools to match implementation.
- docs/core/activity-log.md — entityType extended with `transaction`; actions extended with TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED, TRANSACTION_EXPORT, TRANSACTION_IMPORT; details format for export/import; UI path corrected to /dashboard/settings/activity-log (via Settings).
- docs/INDEX.md — feature section updated to mention Income & Expense (PRD §18).
- docs/structure/mvp-boundary.md — Note added that current implementation includes Income & Expense + Data Tools (PRD §18), not MVP must-have.
- docs/PRD_CHANGE_LOG.md — Changelog entry for docs sync and §18 feature updates.

---

## 24/02/2026

- docs/feature/organization-management.md, docs/feature/project-management.md, docs/feature/task-management.md, docs/feature/data-center.md, docs/feature/note-management.md, docs/feature/conclusion.md — Removed (feature docs out of scope).
- docs/prd_summary_for_commu/summary_app_prd_pwp.md — Removed; folder prd_summary_for_commu removed.
- docs/INDEX.md — Feature section updated: only Authentication and Activity Log in scope; no separate feature docs for current scope.
- docs/PRD.md — Scoped to Authentication and Activity Log: §1–§6 rewritten; §7 only Activity Log (§7.1); §12 Open Questions and §13 MVP Boundary updated.
- docs/structure/product-overview.md — Aligned with Auth + Activity Log scope.
- docs/structure/mvp-boundary.md — MVP Must Have: Auth, Activity Log, System Log; Org/Project/Task moved to Out of Scope.
- docs/structure/open-questions.md — Updated to current scope (dashboard layout, future integrations).
- docs/core/activity-log.md — entityType and actions limited to user and session; examples updated.
- docs/PRD_CHANGE_LOG.md — Changelog entry for docs clean (Auth + Activity Log only).
 - docs/PRD.md — Added §18 Income & Expense Transactions & Calendar (data model, APIs, and UI behaviour) to document the current income/expense + calendar implementation.
 - docs/structure/product-overview.md — Noted the presence of a lightweight Income & Expense tracker with calendar view in the current implementation.
 - docs/PRD_CHANGE_LOG.md — Changelog entry for income/expense calendar docs update.

---

## 22/02/2026

- prisma/seed.ts — Seed extended with Note and Conclusion: org-level notes (Acme, Beta), project-level notes (Website Revamp, Mobile App Pilot), task-level notes (Design new wireframes); conclusions on notes. Idempotent: skips when org/project already has notes.
- docs/feature/note-management.md — Note Management implementation: data model (Note), association with org/project/task, API (list/create under org, project, task; get/patch/delete note under org), UI (org/project/task notes pages, note detail page).
- docs/feature/conclusion.md — Conclusion implementation: data model (Conclusion, type enum NEW_TASK/MA/CR/KEY_DECISION), API under note (list/create/patch/delete), UI on note detail page.
- docs/core/activity-log.md — Activity Log: entityType note, conclusion; actions NOTE_CREATED, NOTE_UPDATED, NOTE_DELETED, CONCLUSION_CREATED, CONCLUSION_UPDATED, CONCLUSION_DELETED.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Note Management, Conclusion, and seed.

---

## 21/02/2026

- docs/core/activity-log.md — Activity Log implementation: data model (ActivityLog), action list, API GET /api/activity-log with filters, UI at /dashboard/activity-log (read-only list + filters). Emit from register, sign-in, org/project/task APIs.
- docs/core/activity-log.md — Richer Activity Log: details format (create/delete/restore/update with changes array), API returns userDisplayName (who), UI shows "By: …" and formatted details (Deleted/Restored, field from→to).
- docs/core/activity-log.md — UI: "By" and each detail item displayed on separate lines for readability.
- docs/core/activity-log.md — Activity Log for session revoke and user actions: entityType session, SESSION_REVOKED (details.scope), USER_PROFILE_UPDATED, USER_PASSWORD_CHANGED; emitted from /api/sessions DELETE, /api/users/me PATCH, /api/users/me/password PATCH.
- docs/core/activity-log.md — Activity Log for logout: USER_LOGGED_OUT; recorded via POST /api/auth/logout (client calls before signOut).
- docs/PRD_CHANGE_LOG.md — Changelog entry for Activity Log docs update.

---

## 14/02/2026

- docs/feature/project-management.md — Clarified implementation from PRD: Project fields (name, description, thumbnail image URL, start/end due dates, status); Project Management backend and dashboard-level behavior implemented for Org → Projects, including trash/restore semantics aligned with Organizations.
- docs/feature/organization-management.md — Updated: Key data to contact list (OrganizationContact, at least one), slug, delete behaviour (move to trash, restore, permanent delete); added API and UI summary.
- docs/PRD.md — Updated: §7.1 Organization Management; Key Data aligned with contact list, slug, trash; link to feature doc.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Organization docs sync.
- docs/core/authentication-authorization.md — Added: Validation section (email format/length/normalize, password min 8 max 72); register and change-password use lib/validation.
- docs/core/authentication-authorization.md — Updated: Session revoke is soft delete (UserSession.revokedAt); list/touch filter by revokedAt null; /api/sessions DELETE sets revokedAt instead of deleting rows.
- docs/core/authentication-authorization.md — Added: /api/users/me (GET profile, PATCH name), /api/users/me/password (PATCH), User profile page (/dashboard/user) and dashboard nav.
- docs/structure/testing-strategy.md — Added: users/me and users/me/password API test coverage.
- docs/core/authentication-authorization.md — Updated: Session strategy (JWT + UserSession table), Session metadata (userAgent/ipAddress via touch + GET), /api/sessions APIs (GET, POST, DELETE), Route protection (JWT).
- docs/structure/testing-strategy.md — Added: Authentication unit tests coverage (register, sessions GET/POST/DELETE, auth callbacks).
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.
- docs/core/authentication-authorization.md — Added: Route protection (proxy.ts); Guard deferred.
- docs/core/authentication-authorization.md — Added: Session strategy (DB, Prisma Adapter), Active users (heartbeat/lastActiveAt), Session metadata (IP, userAgent, createdAt).
- docs/PRD.md — Updated: §8 Authentication; added Session, Active users & Session metadata bullets; link to core auth doc.
- docs/structure/required_lib.md — Updated: Auth row to include @auth/prisma-adapter for DB session.
- docs/prd_summary_for_commu/summary_app_prd_pwp.md — Updated: Authentication section; session storage, active users, session metadata.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 03/02/2026

- docs/PRD.md — Updated: §17 MVP Boundary; removed startup validation; use .env only for initial phase; /config optional for later.
- docs/core/environment-config-strategy.md — Updated: removed Validation & Fail-fast Strategy; MVP Boundary aligned (no validation, /config excluded for initial phase).
- docs/INDEX.md — Updated: environment-config-strategy description (validation removed, /config optional).
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Updated: §11 Technical Stack; Database now specified as MySQL (Prisma ORM).
- docs/structure/technical-stack.md — Updated: Stack to use Prisma ORM for MySQL.
- docs/structure/required_lib.md — Updated: Database lib from MySQL to Prisma (@prisma/client, prisma dev).
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Added: §17 Environment Variables & Configuration Strategy (purpose, .env, /config, Next.js server/client, validation, version control, MVP).
- docs/core/environment-config-strategy.md — Added: split doc for environment & config strategy.
- docs/INDEX.md — Added: link to environment-config-strategy.md.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/structure/required_lib.md — Added: required libraries doc (runtime, UI, dev/test); complements technical-stack.
- docs/INDEX.md — Added: link to required_lib.md.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Reformatted: ใช้ Markdown ครบ (หัวข้อ ##/###/####, รายการ -, code block, ตาราง); §14 Cache, §15 UI Guidelines, §16 System Logging และหัวข้อ/รายการทั่วทั้งเอกสาร.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Added: System Logging section (purpose, scope, storage, format, levels, security, tooling, MVP boundary).
- docs/core/logging-strategy.md — Synced: new System Logging content from PRD.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/structure/*.md, docs/core/*.md, docs/feature/*.md — **Updated:** ใช้เฉพาะวันที่ (DD/MM/YYYY), ลบเวลาในทุกเอกสารและใน RULE.
- docs/RULE.md, .cursor/rules/docs-changelog.mdc — Format ช่อง changelog เป็นวันที่อย่างเดียว.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.
- docs/RULE.md — Added: rule to update PRD_CHANGE_LOG whenever docs are edited.
- docs/PRD_CHANGE_LOG.md — Added: changelog file and this entry.
- .cursor/rules/docs-changelog.mdc — Added: Cursor rule for docs changelog (globs: docs/**).

<!-- Entries below, newest first by date -->
