# Caching Strategy (Level 1 – Application-Level Cache)

**Updated:** caching-strategy (03/02/2026)

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

## Caching Approach

The system will use Next.js application-level caching, including:

- Server Component cache
- fetch() cache with revalidate
- React cache() utility for database queries

Caching is performed in-memory per deployment instance, managed automatically by the Next.js runtime.

## Cache Duration

- Default revalidation interval: 30–60 seconds
- Cache duration may vary depending on data volatility
- No long-lived or permanent cache entries are used

This ensures data remains reasonably fresh while significantly reducing redundant database queries.

## Cache Invalidation

- Cached data is automatically invalidated based on the configured revalidation interval
- Manual cache invalidation is not implemented at this level
- Write operations rely on short cache TTLs rather than explicit invalidation logic
- This design favors simplicity and predictability over aggressive consistency guarantees.

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
