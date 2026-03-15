# Product Requirements Document (PRD)
## Project: Judtang Financial Engine

**This document is the authoritative source.** Split documents for maintainability and code generation are in [structure/](structure/), [core/](core/), and [feature/](feature/). See [INDEX.md](INDEX.md) for the mapping.

---

## 1. Overview

**Judtang Financial Engine** provides **user authentication** (sign-in, registration, sessions) and an **Activity Log** for auditing critical events. The product includes a **Public Landing Page** (`/`) for product introduction and entry points, a **Public Releases Page** (`/releases`), a **Public Privacy Policy** (`/privacy`), a **Public Terms & Conditions** (`/terms`), and **Income & Expense** tracking with multi-account and credit card support.

It is built on Next.js with NextAuth and a MySQL database, and is intended for general users and teams who need personal finance management with login and audit trails.

---

## 2. Purpose (Short)

To enable secure sign-in and registration, session management, and a reliable audit trail (Activity Log) for critical user and session events.

---

## 3. Core Problems

- Users need a single, secure way to sign in (credentials and/or OAuth).
- Critical actions (e.g. login, logout, profile changes) must be auditable.
- Session and active-user visibility support security and support workflows.

---

## 4. Non-goals

- This is not a full workflow or project-management product in this scope.
- Advanced analytics, real-time collaboration, and deep dashboards are out of scope for this baseline.

---

## 5. Success Criteria

- Users can register and sign in (Email + Password and/or Google).
- Session listing and revoke work as specified.
- Activity Log records critical events and is viewable by the user.
- Authentication and session behavior are stable and predictable.

---

## 6. Target Users

- Developers and teams who need a shared login and activity-log baseline.
- Any solution that will add new features on top of Auth and Activity Log.

---

## 7. Feature Scope

### 7.1 Activity Log

Records critical system events for auditing and tracking purposes. See [activity-log.md](core/activity-log.md) for full spec.

**Examples**

- User registered / logged in
- User logged out / session revoked
- Profile or password updated

### 7.2 Public Landing Page

The home page (`/`) serves as the public entry point. It introduces the product (Judtang Financial Engine), explains core capabilities, and provides entry points to sign in or register. Includes navbar (theme switcher, language switcher, Releases, Login, Get Started), Hero, Core Value, Feature Grid, Engine section, CTA, and Footer. The public releases page (`/releases`) shows the changelog without login. See [feature/public-landing-page.md](feature/public-landing-page.md) for full spec.

### 7.3 Privacy Policy

A public Privacy Policy page at `/privacy` (no login required) that reflects actual system behavior and satisfies PDPA / GDPR-ready transparency requirements. Covers data collected, data not collected, usage purposes, security practices, third-party services (Cloudflare Turnstile, hosting, email), data retention, user rights, account deletion, and contact information. Version 1.0, effective 2 March 2026. Linked in the landing page footer. See [feature/privacy-policy.md](feature/privacy-policy.md) for full spec.

### 7.4 Help & Feedback

User-facing report submission at Settings → Help & Feedback (`/dashboard/settings/feedback`). Users can submit bug reports, feature requests, or other feedback with optional screenshots. Admin backoffice at `/admin/reports` for reviewing and managing submissions. Root admin seeder for initial setup. See [feature/help-feedback.md](feature/help-feedback.md) for full spec.

### 7.5 Terms & Conditions

A public Terms & Conditions page at `/terms` (no login required) that defines the service agreement, acceptable use, and user obligations. Linked in the landing page footer. See [feature/terms-and-conditions.md](feature/terms-and-conditions.md) for full spec.

### 7.6 Recurring Transactions

Templates for repeating income or expense items (WEEKLY, MONTHLY, YEARLY). Users view items due in a selected month and confirm to create an actual Transaction from a template. See [feature/recurring-transactions.md](feature/recurring-transactions.md) for full spec.

---

## 8. Authentication & Authorization

### Authentication

- Uses **NextAuth**
- Supports:
  - Email + Password (Credentials)
  - Google OAuth
 - Bot protection for public auth forms via **Cloudflare Turnstile**:
   - Widget embedded on `/sign-in` (Credentials only), `/register`, `/forgot-password`, and `/reset-password`.
   - Server-side verification uses `CLOUDFLARE_TURNSTILE_SECRETKEY` and `CLOUDFLARE_TURNSTILE_SITEKEY` (client-side uses `NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITEKEY`).
   - Local development and environments where Cloudflare challenges are not reachable can skip verification (see core docs for rules).

### User Master

- Stored in MySQL
- Passwords are stored as hashes only
- Google-authenticated users do not have passwords

### Session

- Sessions are stored in the database (Prisma Adapter); see core doc for detail.

### Active Users & Session Metadata

- Active users: supported via heartbeat / lastActiveAt; total users via User table count.
- Per-session metadata (login time, IP, device/User-Agent) is supported; see [core/authentication-authorization.md](core/authentication-authorization.md).

---

## 9. Logging Strategy

### Activity Log (Database)

- Used for business-level events
- Records who did what, where, and when

### System Log (File-based)

- Used for errors, exceptions, and integration failures
- Stored as files within the project
- Uses structured logging (JSON format)

---

## 10. Testing Strategy (Initial)

### Scope

- Focus on Authentication and Core Domain logic
- UI testing is out of scope in the initial phase

### Tools

- Jest
- Supertest
- MySQL test schema

### Focus Areas

- Authentication flow behavior
- User creation and account merging
- Activity log emission
- Error-path logging

---

## 11. Technical Stack (Initial)

- Framework: Next.js
- Authentication: NextAuth
- Database: MySQL (Prisma ORM)
- Analytics: Vercel Web Analytics (`@vercel/analytics/next`), Vercel Speed Insights (`@vercel/speed-insights/next`); loaded only after user consents via cookie banner
- Logging: Winston (file-based)
- Testing: Jest + Supertest

---

## 12. Open Questions / To Be Defined

- Future integration with external tools (if any)

---

## 13. MVP Boundary

**MVP Must Have**

- Authentication (Email + Google)
- Activity Log for critical events
- System Log at error level

**MVP Out of Scope**

- Organization / Project / Task management (to be rebuilt as needed)
- Advanced analytics
- Real-time notifications
- Third-party integrations

---

## 14. Cache

### Caching Strategy (Level 1 – Application-Level Cache)

#### Objective

Reduce direct database access and connection pressure on the shared MariaDB instance by leveraging Next.js built-in caching mechanisms.  
This approach aims to improve perceived performance and system stability for an internal tool with low to moderate traffic, without introducing additional infrastructure.

#### Scope

This caching strategy applies to read-only and read-heavy operations only, such as:

- Dashboard summaries
- Task or workflow listings
- Project or pipeline overviews
- Reference or configuration data

Write operations (create/update/delete) are explicitly excluded from caching.

#### Caching Approach

The system will use Next.js application-level caching, including:

- Server Component cache
- `fetch()` cache with revalidate
- React `cache()` utility for database queries

Caching is performed in-memory per deployment instance, managed automatically by the Next.js runtime.

#### Cache Duration

- Default revalidation interval: 30–60 seconds
- Cache duration may vary depending on data volatility
- No long-lived or permanent cache entries are used

This ensures data remains reasonably fresh while significantly reducing redundant database queries.

#### Cache Invalidation

- Cached data is automatically invalidated based on the configured revalidation interval
- Manual cache invalidation is not implemented at this level
- Write operations rely on short cache TTLs rather than explicit invalidation logic
- This design favors simplicity and predictability over aggressive consistency guarantees.

#### Non-Goals

The following are intentionally out of scope for this level of caching:

- Distributed cache (e.g., Redis)
- Per-user or personalized cache
- Complex cache invalidation rules
- Real-time data synchronization
- High-availability or multi-region cache consistency

#### Rationale

Given the system constraints (serverless frontend, shared database, internal usage), application-level caching provides the highest return on investment with minimal operational complexity.

This strategy:

- Reduces database connection churn
- Lowers average response time
- Avoids additional infrastructure dependencies
- Aligns with the expected traffic profile of an internal workflow tool

---

## 15. UI Component & Icon Guidelines

### UI Components

- The project should prioritize using **shadcn/ui** as the primary source for reusable UI components.
- Before creating any custom component, developers should first evaluate whether an existing shadcn component can be used or adapted.
- Custom UI components should only be introduced when requirements cannot be reasonably fulfilled by shadcn/ui.

### Icons

- All icons used in the application must come from **lucide-react** (Lucide Icons).
- Mixing icon libraries is discouraged to ensure visual consistency across the system.
- Custom SVG icons should be avoided unless absolutely necessary and must follow the same visual style as Lucide.

---

## 16. System Logging

### Purpose

System Logging is intended to capture technical and operational events that are not visible from the UI, to support debugging, incident investigation, and system reliability during development and production.

This logging mechanism is not intended for business analytics or user-facing activity tracking.

### Scope

System logs are used to record:

- Application errors and exceptions
- Authentication and authorization failures
- Database connection or query errors
- External integration failures (e.g., OAuth providers)
- Unexpected runtime behavior

Business-level events (e.g., user and session actions) are recorded in the Activity Log (database).

### Log Storage Strategy

- Logs are stored as files within the project environment.
- Directory structure is date-based for easy navigation and rotation:

```
/logs
  /YYYY
    /MM
      /DD
        app.log
        error.log
```

- Logs must not be committed to version control.
- Log files are environment-specific (local / staging / production).

### Log Format

- Logs must be written in structured JSON format.
- Each log entry should include sufficient context for debugging.

**Required fields**

- `timestamp`
- `level` (error, warn, info)
- `service` / `module`
- `action`
- `message`

**Optional fields**

- `requestId`
- `userId` (internal identifier only)
- `errorCode`
- `stackTrace` (error-level only)

### Log Levels

| Level   | Use |
|--------|-----|
| **error** | Unhandled exceptions; authentication failures; database or integration failures |
| **warn**  | Recoverable or degraded behavior |
| **info**  | Minimal operational information (non-noisy) |

### Security & Data Safety

Logs must never contain:

- Passwords
- Access tokens
- Refresh tokens
- Raw OAuth payloads

Personally identifiable or sensitive data must be avoided or masked.

### Tooling (Initial)

- Logging library: Winston
- File-based transports only
- Date-based rotation
- No centralized logging, tracing, or external log aggregation is required in the MVP phase.

### MVP Boundary (System Logging)

**Included**

- Error-level system logging
- File-based storage with date-based structure
- Structured JSON logs

**Excluded**

- Real-time log streaming
- Log analytics dashboard
- External log aggregation services

---

## 17. Environment Variables & Configuration Strategy

### Purpose

This document defines how environment variables and configuration files are used within the system, with the goal of balancing security, maintainability, and developer productivity.

The system prioritizes clear separation between:

- environment-specific values
- application behavior and decisions

### Core Principle

- **Environment variables** store raw values.
- **Configuration files** define system behavior.
- Environment variables must not contain business logic or decision-making rules.

### Environment Variables (.env)

#### Responsibilities

Environment variables are used exclusively for:

- Secrets and credentials
- Environment-specific values
- Infrastructure-related configuration

#### Examples

```
APP_ENV=development
APP_NAME=Judtang

DATABASE_URL=mysql://...
NEXTAUTH_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

LOG_LEVEL=info
LOG_PATH=logs
```

#### What Must NOT Be Stored in .env

- Feature toggles
- Business rules
- Conditional logic
- Behavior switches

**Invalid examples**

```
ENABLE_TASK_MANAGEMENT=true
USE_ADVANCED_LOGGING=false
```

Such decisions must be expressed in configuration files instead.

### Configuration Files (/config)

#### Responsibilities

- Configuration files interpret values from environment variables.
- They define application behavior.
- They act as the single source of truth for system decisions.
- Configuration files are version-controlled and safe to edit for behavior changes.

#### Recommended Structure

```
/config
  app.config.ts
  auth.config.ts
  log.config.ts
```

#### Example: Application Configuration

```ts
export const appConfig = {
  env: process.env.APP_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'PWP',

  features: {
    activityLog: true,
    systemLog: true,
  },
}
```

#### Example: Logging Configuration

```ts
export const logConfig = {
  level: process.env.LOG_LEVEL ?? 'info',
  basePath: process.env.LOG_PATH ?? 'logs',

  format: 'json',
  rotateByDate: true,
}
```

### Server vs Client Environment Variables (Next.js)

#### Server-only Variables

- Must **NOT** use the `NEXT_PUBLIC_` prefix.
- Accessible only in server-side code.
- Used for secrets and internal configuration.

#### Client-exposed Variables

- Must use the `NEXT_PUBLIC_` prefix.
- Should contain non-sensitive values only.
- Usage should be minimized.

### Version Control Rules

- `.env` files must never be committed to version control.
- `.env.example` must be provided and kept up to date.

**Example**

```
DATABASE_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Design Rationale

This strategy allows:

- Fast behavior changes via config files
- Safe handling of secrets
- Clear boundaries between infrastructure and business logic
- Future migration to other environments or platforms without refactoring core logic

### MVP Boundary (Environment & Config)

**Included**

- `.env` for secrets and environment values (no startup validation; use values directly as needed)

**Excluded (for initial phase)**

- Startup validation of environment variables
- Config files (/config) for system behavior — may be introduced later
- Runtime environment mutation
- Dynamic remote configuration services

---

## 18. Income & Expense Transactions & Calendar

### 18.1 Purpose

Although this project is primarily scoped to **Authentication** and **Activity Log**, the current implementation includes a lightweight **Income & Expense tracker** with a **calendar view**.  
This tracker is intended for:

- Quickly recording personal income and expenses
- Reviewing which days, months, and years have recorded transactions
- Supporting **backdated entry** (บันทึกย้อนหลัง) directly from a calendar UI

All behaviour here is per authenticated user; each user only sees their own transactions.

---

### 18.2 Data Model (Transaction)

Backed by the Prisma `Transaction` model (MySQL):

- `id: string` — primary key
- `userId: string` — owner (references `User.id`)
- `type: "INCOME" | "EXPENSE"` — transaction type
- `amount: Decimal(10, 2)` — positive amount; sign is not used to encode income vs expense
- `category: string?` — free-text category (optional)
- `note: string?` — optional description / memo
- `occurredAt: DateTime` — when the transaction is considered to have happened (used for calendar grouping)
- `createdAt: DateTime` — when the record was created
- `updatedAt: DateTime` — last update timestamp

Indexes:

- `@@index([userId, occurredAt])` — efficient per-user range queries by date

Validation and invariants:

- `amount` must be a finite number `> 0`
- `type` must be exactly `"INCOME"` or `"EXPENSE"`
- `occurredAt` must be a valid date

---

### 18.3 APIs

#### 18.3.1 Create Transaction — `POST /api/transactions`

Body:

```json
{
  "type": "INCOME" | "EXPENSE",
  "amount": number,
  "category": "optional string",
  "note": "optional string",
  "occurredAt": "optional ISO or YYYY-MM-DD"
}
```

Behaviour:

- Requires authenticated user (NextAuth session); otherwise `401`
- Validates:
  - `type` is `"INCOME"` or `"EXPENSE"` (case-insensitive on input)
  - `amount` is a positive, finite number
  - `occurredAt` if provided must parse to a valid `Date`
- If `occurredAt` is omitted or invalid, defaults to **current server time**
- Persists a `Transaction` row and returns a JSON representation with `occurredAt` and `createdAt` as ISO strings

Used by:

- `/dashboard/transactions` “New Transaction” page
- “Add” action from the calendar day modal (pre-fills `occurredAt` via query string)

#### 18.3.2 List Transactions — `GET /api/transactions`

Query params:

- `limit?: number` — default 50, max 200
- `offset?: number` — default 0
- `from?: string` — optional start date (parsed by `new Date(from)`)
- `to?: string` — optional end date
- `date?: string` — optional single date (`YYYY-MM-DD` or ISO)
- `type?: string` — optional `"INCOME"` or `"EXPENSE"` to filter by transaction type

Semantics:

- If `date` is provided and parses successfully:
  - `from`/`to` are ignored
  - Query is constrained to **startOfDay(date) .. endOfDay(date)** in server timezone
- Otherwise, `from` and/or `to` (if valid) are used directly as range bounds
- If `type` is `"INCOME"` or `"EXPENSE"`, only transactions of that type are returned
- Results are ordered by `occurredAt desc, createdAt desc`

Used by:

- `/dashboard/transactions` — list of recent transactions (e.g. `?limit=100`)
- Calendar **day modal** — daily transactions via `?date=YYYY-MM-DD&limit=200`

#### 18.3.3 Calendar Daily Summary — `GET /api/transactions/calendar-summary`

Query params:

- `from=YYYY-MM-DD` — start of displayed calendar grid (including leading days from previous month)
- `to=YYYY-MM-DD` — end of displayed calendar grid

Behaviour:

- Requires authenticated user; returns `401` otherwise
- Converts `from` to **startOfDay** and `to` to **endOfDay**
- Fetches all `Transaction` rows for the user in that range (only `occurredAt` is selected)
- Groups by calendar date (derived from `occurredAt.toISOString().slice(0, 10)`)

Response:

```json
[
  { "date": "2026-02-01", "hasTransactions": true, "count": 3 },
  { "date": "2026-02-05", "hasTransactions": true, "count": 1 }
]
```

Used by the **Day view** version of the calendar grid to determine whether to show an indicator per day and (optionally) transaction counts.

#### 18.3.4 Month Summary — `GET /api/transactions/month-summary`

Query params:

- `year=YYYY`

Behaviour:

- Requires authenticated user; returns `401` otherwise
- Builds range `from = 1 Jan YYYY 00:00:00.000`, `to = 31 Dec YYYY 23:59:59.999`
- Fetches all transactions in that year (selecting only `occurredAt`)
- Groups by `occurredAt.getMonth()` (0–11)

Response:

```json
[
  { "monthIndex": 0, "hasTransactions": true, "count": 10 },
  { "monthIndex": 5, "hasTransactions": true, "count": 2 }
]
```

Used by the **Month view** to show which months have any transactions (and rough volume) in the selected year.

#### 18.3.5 Year Summary — `GET /api/transactions/year-summary`

Query params:

- `fromYear=YYYY`
- `toYear=YYYY`

Behaviour:

- Requires authenticated user; returns `401` otherwise
- Normalises the range: `startYear = min(fromYear, toYear)`, `endYear = max(fromYear, toYear)`
- Builds `from = 1 Jan startYear`, `to = 31 Dec endYear`
- Fetches all transactions in that inclusive year range (only `occurredAt`)
- Groups by `occurredAt.getFullYear()`

Response:

```json
[
  { "year": 2024, "hasTransactions": true, "count": 50 },
  { "year": 2025, "hasTransactions": false, "count": 0 }
]
```

Used by the **Year view** to highlight years that contain any transactions and give a coarse sense of volume.

#### 18.3.6 Export — `GET /api/transactions/export`

Query params:

- `from?: string` — optional start date (parsed by `new Date(from)`)
- `to?: string` — optional end date
- `type?: string` — optional `"INCOME"` or `"EXPENSE"` (case-insensitive)

Behaviour:

- Requires authenticated user; otherwise `401`
- Fetches transactions for the user in the given range/type (same filters as list)
- Returns response body as **CSV** (UTF-8), with `Content-Disposition: attachment; filename="transactions-YYYYMMDD.csv"`
- Records **Activity Log** with action `TRANSACTION_EXPORT`, entityType `transaction`, details (rowCount, hasFilter, from, to, type)

Used by the **Data Tools** page for downloading transactions as CSV.

#### 18.3.7 Import — `POST /api/transactions/import`

Body: CSV as raw text, or `multipart/form-data` with `file` (CSV file). Max file size ~2MB; max rows 10,000.

CSV columns: `id`, `type`, `amount`, `category`, `note`, `occurredAt`, `createdAt`. Header row required. For new rows, `id` may be empty; for updates, `id` must match an existing transaction of the current user.

Behaviour:

- Requires authenticated user; otherwise `401`
- Parses and validates rows (type INCOME/EXPENSE, amount > 0, valid occurredAt). Duplicate `id` in file is invalid.
- Rows with no `id`: **create** new transactions (createdAt in CSV ignored; server sets createdAt/updatedAt).
- Rows with `id`: **update** existing transaction if it belongs to the user; otherwise validation error.
- Returns JSON: `{ createdCount, updatedCount, totalRows, errorCount?, errors? }`. On validation failure returns `400` with `errors` array (row, message).
- Records **Activity Log** with action `TRANSACTION_IMPORT`, entityType `transaction`, details (createdCount, updatedCount, totalRows, errorCount).

Used by the **Data Tools** page for importing transactions from CSV.

#### 18.3.8 Single Transaction — `GET /api/transactions/[id]`, `PATCH /api/transactions/[id]`, `DELETE /api/transactions/[id]`

**GET** — Returns the transaction as JSON if it belongs to the current user; otherwise `404`. Used by the edit form to load existing data.

**PATCH** — Body same as create (`type`, `amount`, `category`, `note`, `occurredAt`). Validates and updates the transaction if it belongs to the current user. Records Activity Log `TRANSACTION_UPDATED`. Returns the updated transaction or `404`.

**DELETE** — Deletes the transaction if it belongs to the current user. Records Activity Log `TRANSACTION_DELETED`. Returns `{ ok: true }` or `404`.

#### 18.3.9 Summary — `GET /api/transactions/summary`

Query params:

- `from?: string` — optional start date
- `to?: string` — optional end date

Behaviour:

- Requires authenticated user; otherwise `401`
- If `from` and `to` are omitted or invalid, uses the **current month** (start and end of month in server timezone)
- Aggregates transactions in the range by type and returns `{ income: number, expense: number }` (balance can be computed client-side as income − expense)

Used by the **Dashboard** home page to show summary cards (income, expense, balance) for the current month.

---

### 18.4 UI & Calendar Behaviour

#### 18.4.1 Transactions List — `/dashboard/transactions`

Purpose:

- Table view of transactions with optional filters, pagination, and modal-based Create/Edit/Delete.

Key behaviours:

- If the page is opened with `?id=<transactionId>` in the URL, the form operates in **edit mode**: it loads the transaction via `GET /api/transactions/[id]`, pre-fills the form, and on submit calls `PATCH /api/transactions/[id]`. After a successful update, a success message is shown and the user is redirected to the list (or may navigate back).
- Without `id`, the form is **create mode**.
- User selects **Type**: Income or Expense
- User inputs `amount` (positive number, validated on client and server)
- Optional `category`, `note`
- `Date` picker defaults to **today** in create mode, or the transaction’s `occurredAt` in edit mode; if the page is opened with `?date=YYYY-MM-DD` (and no `id`), that value is used as the initial date (for backdated entry via the calendar)
- On successful create: form resets `amount`, `category`, and `note`; a success message is shown
- On successful update: redirect to list after a short delay

Navigation:

- Link to view all transactions at `/dashboard/transactions/list`

#### 18.4.2 Transactions List — `/dashboard/transactions/list`

Purpose:

- Table view of transactions for the current user with optional filters and pagination.

Key behaviours:

- **Filters**: Optional “From date”, “To date”, and “Type” (All / Income / Expense). An “Apply” (or “Search”) action builds query params and fetches with `offset=0`.
- **Pagination**: Results are fetched with a fixed page size (e.g. 20). “Previous” and “Next” buttons adjust `offset` and refetch. “Next” is disabled when the returned count is less than the page size.
- Calls `GET /api/transactions` with `limit`, `offset`, and optional `from`, `to`, `type`.
- Table shows: Date (`occurredAt`), Type with icons (Income/Expense), Amount (locale-formatted), Category, Note (truncated if long).
- **Edit**: Each row has an Edit action that links to `/dashboard/transactions?id=<id>`.
- **Delete**: Each row has a Delete action; confirmation dialog then `DELETE /api/transactions/[id]`; on success the list is refetched or the row removed from state.

Navigation:

- Button to create a **New transaction**
- Button to open the **Calendar view** (`/dashboard/calendar`) for a more visual overview

#### 18.4.3 Calendar — `/dashboard/calendar`

Purpose:

- Act as a **visual calendar** for income and expense records:
  - See at a glance which days, months, and years have activity
  - Click any date to review and backfill transactions

Core concepts:

- `viewMode: "day" | "month" | "year"` controls which level of zoom is shown
- `year` and `monthIndex` track the current focus month/year
- Navigation uses `<`, `>` buttons to move across months/years/ranges

**Global controls**

- **View mode switcher**: segmented control with `Day`, `Month`, `Year`
- **Today** button:
  - Resets `year` and `monthIndex` to the current date
  - Switches back to **Day** view
- **New transaction** button:
  - Opens the create-transaction modal in-page

##### Day view

- Shows a classic **month grid** (5–6 rows, 7 columns):
  - Week header (จ–อา)
  - Leading/trailing days from adjacent months to fill whole weeks
- For each cell (day):
  - Shows the day number (1–31)
  - Uses `calendar-summary` data to decide if there is at least one transaction:
    - If yes, displays a small green dot
    - If there are multiple transactions, may show a small “N records” label
  - Today is highlighted with a pill and ring
- Clicking any day:
  - Opens a **modal** showing transactions for that date (loaded via `GET /api/transactions?date=YYYY-MM-DD&limit=200`)
  - The modal includes an **Add** button which opens the create-transaction modal in-page with the date pre-filled to that day
  - Each transaction in the modal has **Edit** (opens edit modal in-page) and **Delete** (confirmation then `DELETE /api/transactions/[id]`; on success the modal’s list is updated)

##### Month view

- Shows a **3×4 grid of months** for the currently selected `year`
- Each tile:
  - Displays the month name (short format, locale-dependent)
  - Uses `month-summary` data to show whether there are any transactions in that month, and how many:
    - If there are no transactions, shows a muted “ไม่มีบันทึก” / “no records” label
    - If there are transactions, shows a green dot and optional count
- Navigation:
  - `<`/`>` buttons move `year - 1` / `year + 1`
- Interaction:
  - Clicking a month tile sets `monthIndex` to that month and switches to **Day** view for that year/month

##### Year view

- Shows a **grid of years** (e.g. 12 years at a time, arranged 3×4)
- Internally tracks a `yearRangeStart`; `yearRangeEnd` is derived (e.g. `yearRangeStart + 11`)
- Each tile:
  - Displays the year number
  - Uses `year-summary` data to show whether there are any transactions that year, plus an optional count
- Navigation:
  - `<`/`>` buttons slide the year window backward or forward by 12 years
- Interaction:
  - Clicking a year tile:
    - Sets `year` to that year
    - Leaves `monthIndex` unchanged
    - Switches to **Month** view for that year

##### Dashboard summary (home)

- The dashboard home page (`/dashboard`) displays **summary cards** for the current month: total **Income**, total **Expense**, and **Balance** (income − expense). Data is loaded from `GET /api/transactions/summary` (defaults to current month when `from`/`to` are omitted).

##### Data Tools — `/dashboard/tools`

- Single page for **Export** and **Import** of transactions as CSV.
- **Export:** Optional filters “From date”, “To date”, and “Type” (All / Income / Expense). Button triggers `GET /api/transactions/export?from=…&to=…&type=…` with the chosen values; browser downloads the CSV file.
- **Import:** User selects a CSV file; on submit, `POST /api/transactions/import`; UI shows result summary (created/updated counts, and any row-level errors if validation failed).

---

### 18.5 Backdated Entry (บันทึกย้อนหลัง)

To support quick backfilling of income and expense data:

- Users can navigate the **Day** view to any past date and click that day:
  - The modal shows existing transactions (if any)
  - Clicking **Add** opens the New Transaction page with `?date=YYYY-MM-DD`
- The New Transaction page:
  - Reads `searchParams.date` and, if valid:
    - Uses it as the default `occurredAt` value
  - Otherwise falls back to today’s date

This flow keeps the UI simple while making it convenient to add records for previous days directly from the calendar overview.
