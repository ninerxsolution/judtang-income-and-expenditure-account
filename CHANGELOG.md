# Changelog

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