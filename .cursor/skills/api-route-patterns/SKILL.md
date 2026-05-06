---
name: api-route-patterns
description: API route patterns for Judtang — standard structure for GET/POST/PATCH/DELETE handlers, auth check, cache invalidation with revalidateTag, activity log, and error responses. Use when creating a new API route, adding a new endpoint, or reviewing an existing route for missing steps.
---

# API Route Patterns

## Standard route structure

Every route handler follows this sequence:

```ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { revalidateTag } from "@/lib/cache"
import { createActivityLog } from "@/lib/activity-log"
import type { SessionWithId } from "@/types/session"

export async function POST(request: Request) {
  // 1. Auth check
  const session = (await getServerSession(authOptions)) as SessionWithId | null
  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const userId = session.user.id

  // 2. Parse and validate body
  const body = await request.json()
  // ... validate ...

  // 3. Business logic / DB operation
  const result = await doSomething(userId, body)

  // 4. Cache invalidation (mutations only)
  revalidateTag("transactions", "max")
  revalidateTag("financial-accounts", "max")

  // 5. Activity log
  await createActivityLog({ userId, action: "...", ... })

  // 6. Response
  return Response.json(result, { status: 201 })
}
```

## Auth check (required on every route)

```ts
const session = (await getServerSession(authOptions)) as SessionWithId | null
if (!session?.user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 })
```

Never skip auth check. Never trust userId from request body — always use `session.user.id`.

## Cache invalidation — revalidateTag

After any mutation, invalidate the relevant tags:

| Mutation type | Tags to invalidate |
|---------------|--------------------|
| Transaction create/update/delete/import | `"transactions"`, `"financial-accounts"`, `"dashboard-init"` |
| Financial account create/update/delete | `"financial-accounts"`, `"transactions"` |
| Credit card payment / close-statement | `"transactions"`, `"financial-accounts"` |
| Category create/update/delete | `"categories"` |
| User profile update | `"users-me"` |
| Budget create/update/delete | `"budgets"` |

```ts
import { revalidateTag } from "@/lib/cache"
revalidateTag("transactions", "max")
```

GET routes that use `unstable_cache` must **not** call revalidateTag — only mutation routes do.

## Cached GET routes

Wrap the DB query (not auth) in `unstable_cache` at **module scope**:

```ts
import { unstable_cache, CACHE_REVALIDATE_SECONDS } from "@/lib/cache"

const getCachedData = unstable_cache(
  async (userId: string, ...params) => {
    return prisma.something.findMany({ where: { userId } })
  },
  ["my-route-key"],
  { revalidate: CACHE_REVALIDATE_SECONDS, tags: ["transactions"] }
)

export async function GET(request: Request) {
  const session = ...  // auth first
  const data = await getCachedData(session.user.id, ...)
  return Response.json(data)
}
```

Client-side fetch of cached routes should use `{ cache: "no-store" }` to avoid browser HTTP cache.

## Error responses

```ts
// 400 Bad Request
return Response.json({ error: "Invalid amount" }, { status: 400 })

// 401 Unauthorized
return Response.json({ error: "Unauthorized" }, { status: 401 })

// 403 Forbidden (resource belongs to another user)
return Response.json({ error: "Forbidden" }, { status: 403 })

// 404 Not Found
return Response.json({ error: "Not found" }, { status: 404 })

// 500 Internal Server Error
return Response.json({ error: "Internal server error" }, { status: 500 })
```

Always check that a fetched entity belongs to the requesting user (`where: { id, userId }`) before operating on it.

## Route checklist

- [ ] Auth check at top (`getServerSession` + `session.user.id`)
- [ ] Entity ownership validated (userId in query)
- [ ] `revalidateTag` called after mutations
- [ ] `createActivityLog` called after successful write
- [ ] Error responses use correct HTTP status codes
- [ ] GET routes use module-level `unstable_cache` (not inline)
- [ ] TypeScript types defined — no `any`

## Key files

| File | Purpose |
|------|---------|
| `lib/auth.ts` | `authOptions` for NextAuth |
| `lib/cache.ts` | `unstable_cache`, `revalidateTag`, `CACHE_REVALIDATE_SECONDS` |
| `lib/activity-log.ts` | `createActivityLog` |
| `types/session.ts` | `SessionWithId` type |
| `docs/core/caching-strategy.md` | Full cache strategy |
