# Changelog

---

# v0.9.44 - 2026-05-31

## Fixed

- **Sign-in no longer exposes raw server errors** — When the database was unreachable, signing in redirected to a page showing the raw driver error (e.g. `pool timeout: failed to retrieve a connection from pool ...`) in both the URL and the page body. NextAuth callbacks now catch infrastructure failures and surface a clean, localized "we're having trouble signing you in right now" message instead; the raw error is logged server-side only. Unknown error codes always fall back to a generic message, so internal details can never reach the user.

## Changed

- **Auth resilience during a database blip** — An already-signed-in user is no longer forced out or shown an error if the database is briefly unavailable; per-request session validation degrades gracefully and resumes automatically once the database recovers.
- **Error pages hide internals in production** — The global and dashboard error screens now show a generic message in production (the underlying message is shown only in development).

---

# v0.9.43 - 2026-05-31

## Fixed

- **Monthly entry no longer fails when saving large batches** — Saving many rows at once (e.g. 70–100+ at month-end) could return a 500 error. The bulk endpoint resolved every row's account and category with separate queries *inside* a single database transaction, which exceeded the database's 5-second interactive-transaction limit once the batch grew large. It now pre-resolves all accounts and categories up front and inserts with a single chunked batch write (with an explicit timeout), so hundreds of rows save reliably. The server also logs the real error instead of swallowing it into an opaque 500.

## Added

- **Multi-select bulk editing on the monthly entry page** — Select several unsaved rows (a per-day checkbox selects a whole day; "Select all" selects every entered row) and set their type, category, or account in one action — or delete them together — instead of editing one row at a time.
- **Draft auto-save for monthly entry** — Unsaved rows are now kept in your browser per month, so a refresh or navigating away no longer loses what you typed. Drafts are restored automatically (with a confirmation) and cleared once you save.

## Changed

- **Clearer monthly entry validation** — Transfer rows missing a destination account are caught before saving and highlighted; rows the server rejects are highlighted and scrolled into view; and save errors now distinguish validation, server, and network problems.

---

# v0.9.42 - 2026-05-16

## Added

- **Calendar month/year tooltips** — `GET /api/transactions/month-summary` and `year-summary` now return approximate THB totals per month/year (`incomeSumThb`, `expenseSumThb`, `transferSumThb`) using the same logic as `calendar-summary`. Hovering a month or year tile shows income, expense, and transfer breakdown in THB (or “no records”).

## Changed

- **Calendar view-mode toolbar placement** — Day / Week / Month / Year / Today controls on the **dashboard home** calendar sit in the card header on the same row as prev/next and the period label. On **transactions calendar view** (`/dashboard/transactions?view=calendar`) and the full **calendar page** (`variant="full"`), those controls render **above** the calendar card (previous layout). Override with `viewModeToolbarPlacement` on `TransactionsCalendar` (`inside-card` | `outside-card`).

---

# v0.9.41 - 2026-05-16

## Changed

- **Dashboard summary card** — The home page now shows balance, monthly income, and monthly expense in a single combined card (`DashboardSummaryCard`) with one olive-green background instead of three separate cards. Income and expense use text color only (no icons or internal borders). On mobile, income and expense stack one per row; from `sm` breakpoint up they appear side by side. Balance visibility toggle still masks all three amounts on this card.

---

# v0.9.40 - 2026-05-16

## Added

- **Calendar day THB summaries** — `GET /api/transactions/calendar-summary` now returns per-day income, expense, and transfer counts plus approximate THB totals (`incomeSumThb`, `expenseSumThb`, `transferSumThb`). Shared logic lives in `lib/calendar-summary-thb.ts`. The transactions calendar shows a tooltip on each day with the breakdown.
- **Landing public shell** — New `LandingPublicShell` wraps the home page and public information pages (Contact, Privacy, Terms, Releases) for a consistent layout. `LandingDoodleBackground` adds light floating doodle animations with `prefers-reduced-motion` support.

## Changed

- **Recurring link picker timezone** — `GET /api/recurring-transactions/[id]/link-candidates` accepts an optional `timezone` query param (used for `onDate` day bounds and date display in the link slide picker). Defaults to `Asia/Bangkok` when omitted.

---

# v0.9.39 - 2026-05-07

## Added

- **Entry page with tabs** — A new `/dashboard/entry` page groups Monthly entry and Recurring entry under tabs, so you can jump between the two flows without leaving the page.
- **Reports page with tabs** — A new `/dashboard/reports` page groups Summary and Spending Efficiency under tabs.

## Changed

- **Transactions page view switcher** — The transactions page now lets you switch between list and calendar views from the same page.
- **Sidebar and mobile nav** — Updated to include the new Entry and Reports links and to keep the most-used items reachable.

---

# v0.9.38 - 2026-05-06

## Changed

- **Landing hero refresh** — Updated layout and messaging on the home page hero. The responsive background curve is now stable across screen sizes (no more layout shift on narrow viewports).

---

# v0.9.37 - 2026-05-05

## Added

- **Balance reconciliation** — Record a snapshot of an account's actual balance (from your bank app or paper statement) against the app's calculated balance. The system stores the user-stated value, the app-calculated value, the difference, currency, and an optional note, so you can see drift over time.
- **Reconciliation history** — Each account detail page now has a reconciliation history alongside the transaction list. Activity Log records each reconciliation event.

## Migration

- Added a new `BalanceReconciliation` table.

---

# v0.9.36 - 2026-05-04

## Added

- **Recurring link picker** — When confirming a recurring template for the current month, you can now link an existing transaction instead of creating a new one. A new slide picker shows candidate transactions (POSTED, same type, not already linked, not part of a transfer group) and supports search and date filter.
- **Running balance after each transaction** — Transactions now carry `accountBalanceAfter` (and `transferAccountBalanceAfter` for same-currency transfers) — the account balance immediately after that posting. Snapshots are rebuilt automatically after any edit, delete, or import. Debit cards with a linked bank account get their snapshots from the combined chronological ledger.

## Fixed

- **Transactions list cache** — The transactions list endpoint is now cached at module level with a payload-version key. Bumping the version invalidates old cache entries whose JSON shape no longer matches the current response. Previously, stale cache entries could keep showing "—" in the balance column after a deploy.
- **Transfer-group PATCH guards** — Edits to a transfer-group row that explicitly pass `categoryId: null` (clear) now behave correctly. Previously the guard could confuse "clear" with "no change" and reject the edit.
- **Announcement API** — Returns `null` gracefully when the announcement table is unavailable, instead of throwing.

## Migration

- Added `accountBalanceAfter` and `transferAccountBalanceAfter` columns to the `Transaction` table.

---

# v0.9.35 - 2026-04-26

## Added

- **Average expense metrics** — The Summary page and Spending Efficiency page now show average monthly, weekly, and daily expenses next to the total — helpful for spotting whether the current period is above or below your usual pace.

---

# v0.9.34 - 2026-04-24

## Added

- **Spending Efficiency dashboard** — A new page at `/dashboard/spending-efficiency` compares your actual daily expenses (and interest) against a user-defined daily target. Shows day-by-day deltas so you can see which days went over.
- **Excluded categories** — Specific categories can be excluded from the spending-efficiency calculation (e.g. you may want to exclude transfers or rent).
- **API** — New `GET /api/spending-efficiency` with `from`, `to`, and `timezone` query params.
- **Persisted target** — The daily target is saved in `localStorage` so it persists across sessions.

---

# v0.9.33 - 2026-04-22

## Added

- **Balance Visibility toggle** — A new eye-icon toggle in the dashboard header masks the balance card, income / expense cards, and budget spent / total on the dashboard home. The state persists across reloads (`localStorage` key `judtang_balance_visible`, default visible). Useful when showing the screen to someone else.

---

# v0.9.32 - 2026-04-22

## Added

- **Multi-currency transactions** — Each financial account and transaction now carries a `currency` (ISO 4217). THB remains the base currency for dashboards, summaries, and budgets, but non-THB legs are now tracked at their native amount and converted to THB using a stored `exchangeRate` (= THB per 1 unit of the row's currency) and `baseAmount` snapshot taken at posting time.
- **Cross-currency transfers** — Transfers between accounts with different currencies are now recorded as a paired two-row group sharing a `transferGroupId` (OUT on source, IN on destination). Edit and delete act on the whole group. Same-currency transfers stay as a single row.
- **FX rate suggestion API** — New `GET /api/fx/suggest` returns a suggested USD→THB rate (with a 32 THB/USD fallback when the upstream is unavailable).
- **Dashboard approximate totals** — Dashboard and summary endpoints now report approximate THB for non-THB accounts so totals stay meaningful when you hold multiple currencies.

## Changed

- **Currency immutability** — After a financial account has its first POSTED transaction, its currency can no longer be changed.

## Migration

- Added `currency`, `exchangeRate`, `baseAmount`, `transferGroupId`, and `transferLeg` columns to the `Transaction` table; added `currency` to `FinancialAccount`.

---

# v0.9.31 - 2026-04-05

## Added

- **Spending Overview card on dashboard** — A new card on the dashboard home shows today's expenses and the weekly expense total at a glance. The data is included in the dashboard initialization response, so it loads with the rest of the home summary.

---

# v0.9.30 - 2026-04-04

## Added

- **Searchable account picker** — A new `AccountSelectorButton` in the transaction form lets you search accounts by name and prioritizes recently used accounts (MRU stored in `localStorage`).
- **Account slide picker** — A drill-down `AccountSlidePicker` panel is now used for account selection inside the transaction form, credit-card payment dialog, financial-account form, and recurring transaction dialog — one consistent picker across the app.

## Changed

- **Picker reset on dialog close** — When a dialog containing the account picker closes, its navigation and search term reset, so the next open starts fresh.

---

# v0.9.29 - 2026-04-03

## Changed

- **Budget settings rebuild** — The budget settings page (`/dashboard/settings/budget`) is split into focused components for a cleaner experience:
  - **Month toolbar** for switching year/month
  - **Total budget card** with monthly limit input
  - **Category budget grid** with inline edit per category
  - **Coverage grid** showing which categories have a limit set
  - **Template section** for creating, applying, editing, and deleting templates
- **Shared progress indicator type** — `BudgetProgressIndicator` is now used across the dashboard summary and the budget pages for consistent thresholds (normal / warning / critical / full / over).
- **Budget loading states** — Improved skeleton placement and user feedback while data loads.

---

# v0.9.28 - 2026-04-03

## Added

- **Recent categories (MRU)** — Category pickers now remember and prioritize categories you use most often, stored in `localStorage`. A new `CategoryRowSelect` component is used across the monthly entry page and category dropdowns for consistency.
- **Safer auth redirects** — Signed-in users hitting `/sign-in`, `/register`, or `/restore-account` are now redirected to the dashboard. Post-login redirect respects the `callbackUrl` only when it points to a same-origin path and is not another auth page (protects against open-redirect loops).

## Changed

- **Silent dashboard refresh** — Quick actions, calendar interactions, and transaction invalidations no longer flicker the global loading skeleton. The dashboard refreshes data in the background while the previous content stays visible.
- **Debit card validation** — `linkedAccountId` is now required when checking debit credit-card account completeness, preventing false "incomplete account" warnings.

---

# v0.9.27 - 2026-03-29

## Added

- **Public contact form** — A new public page at `/contact` lets anyone (signed-in or not) reach the team. Fields: topic (General / Account help / Product feedback / Partnership or Press / Other), email, optional name, subject, message. Protected by Cloudflare Turnstile and a per-IP rate limit.
- **Admin contact inbox** — `/admin/contact-messages` lists submissions with search and pagination; detail view at `/admin/contact-messages/[id]`.
- **Resend transactional email** — When `RESEND_API_KEY` is set, transactional email (verification, password reset, contact notification) is sent through Resend with `EMAIL_FROM`. Without it, the app falls back to Nodemailer over SMTP.

## Changed

- **Forgot / reset password** — Properly handles OAuth-only accounts and legacy email identifiers; response remains enumeration-safe.
- **Email link base URL** — In development, `NEXTAUTH_URL` is preferred so verify/reset links stay on the local origin; in production, optional `APP_BASE_URL` can override.

---

# v0.9.26 - 2026-03-22

## Added

- **Announcement image upload** — Admins can attach an image (JPEG, PNG, or WebP) to the home page announcement from `/admin/settings/announcement`. The image renders inside the announcement modal on the landing page; URLs are stable under `/storage/announcement/image/<filename>`.

---

# v0.9.25 - 2026-03-21

## Changed

- **Home announcement popup** — Configuration moved from `data/announcement.json` and `NEXT_PUBLIC_ANNOUNCEMENT_ENABLED` to the `SiteAnnouncement` database table. Admins edit content at `/admin/settings/announcement`. Public `GET /api/announcement` behaviour (date range, dismiss, localStorage key) is unchanged.

---

# v0.9.24 - 2026-03-18

## Added

- **Average monthly expense** — The "All" tab on `/dashboard/recurring` shows a summary of average monthly expense (sum of active EXPENSE items converted to monthly equivalent by frequency).

## Changed

- **Recurring per-item action menu** — Record payment and Edit buttons are now combined into a dropdown menu (⋯) instead of separate buttons. Click to choose "Record payment" or "Edit".

---

# v0.9.23 - 2026-03-17

## Added

- **Category English name (nameEn)** — Categories now support an optional English name. When the app language is English, category names display in English when `nameEn` is set; default categories fall back to built-in translations (e.g. อาหาร → Food). Custom categories can set `nameEn` when creating or editing in Settings → Categories.
- **getCategoryDisplayName** — New helper in `lib/categories-display.ts` for locale-aware category display across the app (transaction forms, lists, monthly entry, etc.).

## Changed

- **Category API** — POST and PATCH `/api/categories` now accept optional `nameEn` in the request body.
- **Category form** — Add/Edit dialog includes an optional "Category name (English)" field.

---

# v0.9.22 - 2026-03-16

## Added

- **Account deactivation** — Users can deactivate their account from Settings → Privacy. A grace period (default 30 days, configurable via `ACCOUNT_GRACE_PERIOD_DAYS`) is provided before permanent deletion. During the grace period, all sessions are revoked and login is disabled.
- **Account restore** — Deactivated accounts can be restored during the grace period via `/restore-account` (email + password). After successful restore, users can sign in again.
- **Email reuse after deletion** — Once the grace period expires, the original email becomes available for new registrations. Deleted accounts are soft-deleted (email mutated to `deleted_<userId>_<email>`) for analytics and audit retention.
- **Activity Log actions** — New actions: `ACCOUNT_DEACTIVATE`, `ACCOUNT_RESTORE`, `ACCOUNT_DELETED` for audit trail.
- **Sign-in page** — Link to "Restore a deactivated account?" and banner when redirecting from deactivation with the restore deadline date.

## Changed

- **Login flow** — Credentials and Google OAuth now check user status; suspended or logically deleted users are denied login. JWT refresh validates status and revokes stale sessions for suspended users.
- **Registration flow** — Handles existing users in grace period (409) and past grace period (finalizes deletion, then allows new account creation with the same email).

---

# v0.9.21 - 2026-03-15

## Added

- **Go to Top on home page** — A floating round button (bottom-right) with an arrow-up icon appears on the public landing page (`/`) when the user scrolls down. It stays hidden at the top; after scrolling past a short threshold it slides in from the right with an opacity transition. Clicking it smooth-scrolls to the top; when back at the top the button slides out and fades. Uses Lucide `ArrowUp` and matches landing light/dark styles.

---

# v0.9.20 - 2026-03-15

## Added

- **Announcement popup on home page** — An optional modal appears on the public home page (`/`) when `NEXT_PUBLIC_ANNOUNCEMENT_ENABLED=true`. Content is driven by `data/announcement.json` (image, title, content, optional CTA link). Date range (`start_at` / `end_at`) controls visibility. Dismissible with optional "Don't show again today" checkbox (stored in localStorage by date); or permanent dismiss when `show_once: true`.
- **Localized announcement content** — `title`, `content`, `image_alt`, and `action_label` in the config support both Thai and English via `{ th, en }` objects; the UI resolves the value from the current app language.

## Changed

- **Announcement placement** — Popup shows on the home page (`/`) only, not the dashboard. Mounted in root layout.

---

# v0.9.19 - 2026-03-15

## Added

- **Cookie consent flow** — A cookie consent banner appears on first visit. Users can "Accept all" (enables analytics) or "Manage preferences" to choose: Necessary (always on) and Analytics (optional). Preference is stored in localStorage.
- **Conditional analytics** — Vercel Analytics and Speed Insights load only when the user consents to analytics. No tracking runs before consent.

## Changed

- **Analytics loading** — Replaced direct Analytics/SpeedInsights in layout with `ConditionalAnalytics` component that checks consent before rendering.

---

# v0.9.18 - 2026-03-14

## Added

- **Notification per-item menu** — Each notification row now has a "⋯" (more) button in the top-right. Clicking it opens a dropdown with "Mark as read" or "Mark as unread" depending on the current state.
- **Mark as unread** — Persisted notifications can be marked as unread via the per-item menu. Virtual alerts can be "un-dismissed" the same way (removes from localStorage).
- **PATCH /api/notifications/read** — Extended to accept `{ ids: string[], unread: true }` for marking specific notifications as unread.

## Changed

- **Notification badge on load** — Unread count badge now fetches on page mount so it appears without opening the panel first.
- **Virtual alert read state** — Virtual alerts (recurring due, budget, etc.) now persist "read" state in `localStorage` so they stay marked as read after refresh.
- **Notifications on mobile** — Uses a fullscreen Sheet (bottom drawer) instead of Popover for better UX on small screens.
- **Sheet accessibility** — Added `SheetHeader` with `SheetTitle` and `SheetDescription` (sr-only) for screen reader accessibility.

---

# v0.9.17 - 2026-03-11

## Added

- **Vercel Speed Insights** — Integrated `@vercel/speed-insights/next` in the root layout to collect real-user performance metrics (Core Web Vitals) for monitoring and optimization.

---

# v0.9.16 - 2026-03-09

## Changed

- **Slip upload persistence** — Slip drafts and OCR results are now persisted in `localStorage`, so you can close the slip upload dialog, do something else, and reopen it later without losing the current batch.
- **Slip upload background flow** — Closing the dialog no longer aborts in-flight OCR/upload while staying on the same page; reopening the dialog shows the latest in-progress or completed state.
- **Slip upload recovery after refresh** — Completed and errored drafts are restored after refresh. Drafts that were still processing are restored as interrupted items so users can review or re-upload safely.
- **Slip upload review UI** — Each slip now stays compact while loading, then switches to a summary view (`amount`, `type`, `date`) after OCR is done. Advanced fields are hidden behind an expandable edit section.
- **Slip upload telemetry and speed feedback** — The dialog now shows per-slip upload percentage, uploaded/total size, estimated upload speed, file size before/after compression, per-slip elapsed time, and batch elapsed time.
- **Slip upload action states** — Preview mode now keeps an upload entry point visible when appropriate, supports adding more slips to the existing batch, and preserves a usable empty state after clearing drafts.

---

# v0.9.15 - 2026-03-09

## Changed

- **Recurring page mobile layout** — Recurring cards on `/dashboard/recurring` now stack into two rows on small screens so item details stay readable and the amount/actions no longer feel cramped.
- **Recurring confirm date input** — The payment date in the recurring confirm dialog now uses the same inline calendar trigger style as the transaction dialog instead of a native date input.
- **Recurring settings active toggle** — In the recurring create/edit dialog, the active state in edit mode now uses a toggle-style switch instead of a checkbox.
- **Recurring confirm action styling** — The `Confirm payment` button on recurring cards now uses a solid green primary style instead of an outline style.

---

# v0.9.14 - 2026-03-05

## Added

- **Budget: Template CRUD in Settings** — On the Budget settings page (`/dashboard/settings/budget`), a new Templates section lets you create, list, edit, and delete budget templates. Each template has a name, optional total budget, and repeatable category limits (category + amount). Create/Edit dialog supports multiple category rows with add/remove; Delete uses a confirmation dialog. Apply-template block remains when templates exist.
- **Budget: Edit category budget** — Each category budget row for the selected month now has an Edit button (pencil icon). Clicking it opens a dialog to change the limit (฿) for that category; saving calls `PATCH /api/budgets/categories/[id]` and refreshes progress. No need to delete and re-add to change a limit.

## Changed

- **Budget settings i18n** — New keys under `settings.budget`: `createTemplate`, `editTemplate`, `deleteTemplate`, `templateDeleteConfirm`, `editCategoryBudget`, `addLimitRow` (EN/TH).

---

# v0.9.13 - 2026-03-05

## Changed

- **Fullscreen dialog input focus on mobile** — When a dialog is fullscreen on mobile, focusing any input or textarea (e.g. date, account, amount, note) now automatically scrolls the dialog body so the focused field is visible. Implemented in `DialogBody` (`components/ui/dialog.tsx`) so all dialogs using it (transaction form, account form, category form, credit card payment, profile, etc.) get this behavior without per-dialog changes.

---

# v0.9.12 - 2026-03-05

## Changed

- **Dark theme coverage** — Components, elements, and pages now fully support dark mode:
  - **Mobile bottom nav** — Theme-aware colors (background, border, active/inactive states) via `useTheme()`
  - **Landing page** — Added `.dark .landing-page` CSS variables for dark mode
  - **Landing CTA buttons** — Dark variants for Get Started and primary CTAs
  - **Accounts page** — Empty-state add-account buttons and icons with dark variants
  - **Card type select** — Icons use `dark:text-stone-400`
  - **App sidebar mobile dialog** — Active nav items use `dark:bg-amber-900/50 dark:text-amber-100`
  - **Transactions calendar** — Muted text uses `dark:text-stone-500` for better contrast
  - **Bank combobox** — No-results message has dark variant

---

# v0.9.11 - 2026-03-04

## Added

- **Mobile bottom nav redesign** — Cream background, icon + text label per item, active indicator bar; 5 items: Dashboard, Accounts, Transactions, Summary, Settings
- **useIsDesktopOrLarger hook** — Detects viewport ≥ 1024px (Tailwind `lg`) for desktop layout
- **Transactions table compact layout (tablet)** — On screens < 1024px: date + account + category combined in one column; type column hidden; amount shown with color (green/red/blue); tap row to open Edit/Delete menu
- **Transaction action menu with details** — When tapping a transaction on tablet, the action dialog shows date, account, and amount before Edit/Delete options

## Changed

- **Dashboard recent transactions (mobile)** — Icon only (no income/expense label); date on separate row with `text-[12px]`
- **Transactions table (desktop)** — Edit/Delete buttons remain in table; compact layout and tap-to-menu only on tablet/mobile
- **Transactions list i18n** — Added `dateAndAccount`, `tapToEditOrDelete`, `selectAction` keys

---

# v0.9.10 - 2026-03-04

## Added

- **Transaction form fullscreen on mobile** — On screens < 768px, the add/edit transaction dialog opens fullscreen so users can scroll when the mobile keyboard is visible
- **Responsive sidebar navigation** — On small screens (< 640px), sidebar opens as a dialog with nav items in a 2×2 grid for easier touch access
- **Mobile bottom navigation** — Fixed bottom nav bar on mobile (< 768px) with quick links to Dashboard, Accounts, and Calendar
- **useIsSmallScreen hook** — Detects viewport below Tailwind sm (640px) for mobile-first UI adjustments
- **Dashboard layout responsiveness** — Single-column layout on small screens; text wrapping on button labels to prevent overflow

## Changed

- **Dashboard button styles** — Enhanced visual feedback and accessibility with border and shadow improvements
- **Dialog component** — Refined content styling for sidebar nav overlay on small screens
- **Account management** — Improved add-account button design; default account type support in creation modal

---

# v0.9.9 - 2026-03-03

## Added

- **Dashboard quick actions** — Balance and Quick Add cards now sit above the calendar in the left column. Quick Add provides one-tap buttons for Record Income, Record Expense, and Transfer between accounts — each opens the transaction form with the correct type pre-selected.
- **Manage accounts link** — Quick Add card includes a link to the Accounts page for quick access.

## Changed

- **Dashboard layout revamp** — Summary cards redesigned: Balance card uses a prominent dark olive green style; Income and Expense cards use light green and amber backgrounds with circular accents. Layout reorganized into two columns: left (Balance + Quick Actions + Calendar), right (Income + Expense + Recent transactions).

---

# v0.9.8 - 2026-03-03

## Added

- **Remember Me** — Sign-in with optional "Remember me" for extended session (default 30 days when checked; 24 hours when unchecked)
- **Terms & Conditions** — Public page at `/terms` covering service terms, acceptable use, and user obligations; linked in footer
- **Help & Feedback** — Submit bug reports and feature requests at Settings → Help & Feedback; admin backoffice at `/admin/reports` for reviewing submissions
- **Card type refactor** — Replaced `cardType` with `cardAccountType` (credit/debit/prepaid/other) and `cardNetwork` (visa/master/jcb/amex/unionpay/truemoney/other) for clearer categorization
- **Bank logos & card network icons** — Accounts page and forms now display bank logos and card network icons for better visual identification
- **AccountCombobox & CardTypeSelect** — New components for improved account selection and card type management in forms

## Changed

- **Earth tone design** — Landing page, auth pages, and dashboard updated with stone/amber/emerald palette for a cohesive look
- Form dropdowns and financial account forms aligned with the new design system

## Migration

- Added `cardAccountType` and `cardNetwork` fields to FinancialAccount; `cardType` deprecated

---

# v0.9.7 - 2026-03-02

## Added

- **Encrypted account/card numbers** — Full account numbers (FULL mode) are encrypted with AES-256-GCM before storage
- **Account number storage mode** — Bank and wallet accounts can choose: store full number (encrypted) or last 4 digits only
- **Credit card last 4 only** — Enter only the last 4 digits of the card; full number is never stored

## Changed

- **Delete account/card confirmation** — Uses a random 6-character code for all delete confirmations (instead of entering full account number)
- Reveal (eye) button only appears for accounts storing full number (FULL mode)

## Migration

- Added `accountNumberMode` field and changed `accountNumber` to TEXT for encrypted payloads
- Set `ENCRYPTION_KEY` in `.env` to use full-number storage mode (generate key: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)

---

# v0.9.6 - 2026-03-02

## Fixed

- The **"This month"** summary cards (Income / Expense / Balance) and **Recent transactions** on the dashboard now update immediately after adding, editing, or deleting a transaction from the calendar — previously the data remained stale even after a refresh due to stale-while-revalidate caching on the dashboard API.

---

# v0.9.5 - 2026-03-02

## Fixed

- The **"This month"** summary cards on the dashboard now correctly show income, expense, and balance for the **current month only** — previously they were summing up all transactions across all time.
- Account balances and transaction counts on the **Accounts page** now update immediately after creating, editing, or deleting a transaction — no page refresh required.
- The **calendar view** (dots and transaction list inside the day dialog) now refreshes instantly after adding, editing, or deleting a transaction.
- The **transaction list** on the Transactions page also reflects changes immediately.
- Closing a credit card statement now correctly refreshes the account's statement data without a page refresh.

---

# v0.9.4 - 2026-03-02

## Added

- A public **Privacy Policy** page is now available at `/privacy` — no login required. It covers what data is collected, how it's used, third-party services (including Cloudflare Turnstile), data retention, user rights, and account deletion.
- The footer on the landing page now includes a link to the Privacy Policy.

---

# v0.9.3 - 2026-03-02

## Added

- A new **Releases** page is now publicly accessible — anyone can view what's new without signing in.
- The app now includes a **public landing page** explaining what the app does, with a theme switcher (Light / Dark / System) and language switcher (Thai / English).

---

# v0.9.2 - 2026-03-02

## Improved

- The dashboard now loads noticeably faster. Less waiting, more doing.

---

# v0.9.1 - 2026-03-02

## Added

- You can now view **Patch Notes** directly in the app under Settings → Patch Notes, so you're always up to date on what's changed.

---

# v0.9.0 - 2026-03-01

## Added

- **Transfer between accounts** — you can now record money moved from one account to another as a Transfer transaction.
- Transfers are included in your account balance calculations and can be filtered in your transaction list.
- CSV import now supports Transfer transactions.

## Migration

- The Transfer feature requires a new database field on transactions to link the source and destination accounts together.

---

# v0.8.0 - 2026-03-01

## Added

- **Transaction Categories** — organize your income and expenses with default categories, or create your own under Settings.
- **Hide accounts** — you can now hide accounts from your transaction forms without deleting them.
- Activity log now tracks when accounts are created, updated, or removed.

## Migration

- The Hide Account feature requires a new database field to remember which accounts you've chosen to hide.

---

# v0.7.0 - 2026-03-01

## Added

- **Credit Card support** — track credit card spending, payments, and statements.
- Set your credit limit, statement closing day, due date, and interest rate per card.
- Supports major card types: Visa, Mastercard, JCB, Amex, UnionPay, TrueMoney.
- Thai bank names available as a dropdown when adding a card.
- Card and account numbers are masked for security in the UI.

## Migration

- The Credit Card feature requires new database structures to store card details (credit limit, interest rate, card type, bank name, account number) and to track monthly statements and transaction statuses.

---

# v0.6.0 - 2026-02-26

## Added

- **Email verification** — after signing up, you'll receive a verification email. Your profile page shows your verification status and lets you resend the email if needed.

---

# v0.5.0 - 2026-02-26

## Added

- **Forgot your password?** — you can now reset your password via email from the login page.

---

# v0.4.0 - 2026-02-26

## Added

- **Income & Expense transactions** — create, edit, and delete transactions through a clean dialog. Includes filters by date range and type.
- **Calendar view** — see your income and expenses laid out by day. Add or edit transactions directly from the calendar.
- **Summary cards** on the dashboard showing your financial overview at a glance.
- **Export** your transactions to CSV with date and type filters.

---

# v0.3.0 - 2026-02-21

## Added

- **Activity Log** — view a history of actions in your account (sign-ins, password changes, transaction edits, etc.) under Settings → Activity Log.
- Filters available to narrow down activity by type or date.

---

# v0.2.0 - 2026-02-14

## Added

- **Session management** — view and revoke active sessions from your account settings.
- **Profile page** — update your display name or change your password under Dashboard → Profile.
- Sessions are tracked per device, so you can see where you're logged in and sign out remotely.

---