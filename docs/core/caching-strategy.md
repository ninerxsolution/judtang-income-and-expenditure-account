# Caching Strategy (Level 1 – Application-Level Cache)

**Updated:** 02/03/2026 (dashboard init — removed unstable_cache; no-store on client fetch)

**Source:** PRD §14

---

## Objective

Reduce direct database access and connection pressure on the shared MariaDB instance by leveraging Next.js built-in caching mechanisms.  
This approach aims to improve perceived performance and system stability for an internal tool with low to moderate traffic, without introducing additional infrastructure.

## Scope

This caching strategy applies to read-only and read-heavy operations only, such as:

- Dashboard summaries
- Task or workflow listings
- Project or pipeline overviews
- Reference or configuration data

Write operations (create/update/delete) are explicitly excluded from caching.

## Implementation

Application-level cache is implemented using Next.js `unstable_cache` in API route handlers. Configuration is centralized in `lib/cache.ts`:

- **Revalidate:** 45 seconds (`CACHE_REVALIDATE_SECONDS`)
- **Cache keys:** Include `userId` and relevant query parameters so data is isolated per user and per request shape

**Cached GET routes:**

- `GET /api/transactions/summary` — summary + total balance
- `GET /api/transactions` — transaction list (with filters)
- `GET /api/transactions/calendar-summary` — calendar day summary
- `GET /api/transactions/month-summary` — month summary
- `GET /api/transactions/year-summary` — year summary
- `GET /api/financial-accounts` — account list (after ensure default)
- `GET /api/categories` — category list (after ensure default)
- `GET /api/users/me` — current user profile

Auth is always checked first via `getServerSession`; only the data-fetch portion is cached. Routes that run `ensureUserHasDefault*` run that step before reading from cache.

## Caching Approach

The system uses Next.js application-level caching:

- **API layer:** `unstable_cache` wraps the database/query logic for the GET routes listed above. Cached callbacks return JSON-serializable data only.

Caching is performed in-memory per deployment instance, managed automatically by the Next.js runtime.

## Cache Duration

- Default revalidation interval: 30–60 seconds
- Cache duration may vary depending on data volatility
- No long-lived or permanent cache entries are used

This ensures data remains reasonably fresh while significantly reducing redundant database queries.

## Cache Invalidation

- Cached data is automatically invalidated based on the configured revalidation interval (45 seconds)
- **On-demand invalidation:** Each cached route uses a `tags` option. When mutations occur, the corresponding route calls `revalidateTag(tag)` so the next request fetches fresh data
- **Tags:** `transactions` (summary, list, calendar, month, year), `financial-accounts`, `categories`, `users-me`
- **Mutation points and tags invalidated:**

| Mutation | Tags invalidated |
|---|---|
| Transaction create/update/delete/import | `transactions`, `financial-accounts` |
| Financial account create/update/delete/disable/restore | `financial-accounts`, `transactions` |
| Credit card payment | `transactions`, `financial-accounts` |
| Credit card close-statement | `financial-accounts`, `transactions` |
| Category create/update/delete | `categories` |
| User profile update | `users-me` |

> **Note:** Transaction mutations invalidate `financial-accounts` in addition to `transactions` because account balances are computed from transaction history. Failing to invalidate this tag would cause stale balances on the Accounts page until the TTL expires.

> **Note:** `GET /api/dashboard/init` is intentionally excluded from `unstable_cache`. Because the client calls this endpoint immediately after a mutation (via `refreshDashboard()`), using stale-while-revalidate semantics caused the dashboard to display stale data on the first refresh. The route now queries the database directly on every request and responds with `Cache-Control: no-store`.

## Client-Side Fetch Behavior

Client components that call cached API routes use `{ cache: "no-store" }` on the browser `fetch` call. This prevents HTTP-level browser caching from serving stale responses after a mutation. The server-side `unstable_cache` is unaffected — it still caches and invalidates based on tags as described above.

Affected client fetch calls:
- `GET /api/dashboard/init` — `DashboardDataProvider` refresh (always `no-store`; route also sets `Cache-Control: no-store`)
- `GET /api/financial-accounts` — Accounts page `fetchAccounts()`
- `GET /api/transactions` — calendar `openDay()`, transactions page `refreshList()`
- `GET /api/transactions/calendar-summary` — calendar day/week summary
- `GET /api/transactions/month-summary` — calendar month view
- `GET /api/transactions/year-summary` — calendar year view

## Non-Goals

The following are intentionally out of scope for this level of caching:

- Distributed cache (e.g., Redis)
- Per-user or personalized cache
- Complex cache invalidation rules
- Real-time data synchronization
- High-availability or multi-region cache consistency

## Rationale

Given the system constraints (serverless frontend, shared database, internal usage), application-level caching provides the highest return on investment with minimal operational complexity.

This strategy:

- Reduces database connection churn
- Lowers average response time
- Avoids additional infrastructure dependencies
- Aligns with the expected traffic profile of an internal workflow tool
