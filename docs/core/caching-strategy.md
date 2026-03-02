# Caching Strategy (Level 1 – Application-Level Cache)

**Updated:** 02/03/2026 (implementation)

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

- `GET /api/dashboard/init` — batch API for dashboard initial load (user, summary, appInfo, recentTransactions)
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
- **Tags:** `dashboard-init`, `transactions` (summary, list, calendar, month, year), `financial-accounts`, `categories`, `users-me`
- **Mutation points:** Transaction create/update/delete/import, financial account create/update/delete/disable/restore, credit card payment, category create/update/delete, user profile update. Each mutation invalidates `dashboard-init` when it affects dashboard data.

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
