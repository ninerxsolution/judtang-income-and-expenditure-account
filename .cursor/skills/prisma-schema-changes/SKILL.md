---
name: prisma-schema-changes
description: Prisma schema change workflow for this project — editing schema, syncing to DB, client regeneration, and avoiding forbidden migrate commands. Use when modifying prisma/schema.prisma, adding/removing model fields, seeing Unknown argument errors, or needing to sync schema to the database.
---

# Prisma Schema Changes

## Rules (non-negotiable)

- **Never** run `prisma migrate dev` or `prisma migrate deploy` autonomously
- **Never** create `prisma/migrations/*/migration.sql` files manually
- **Never** run `npm run build` to verify frontend — it secretly runs `prisma migrate deploy`

## Standard workflow

### 1. Edit schema only
Modify `prisma/schema.prisma` directly. Do not create migration folders or SQL files.

### 2. Sync to DB
Tell the user to run:
```
npm run db:push
```
`db:push` syncs schema to DB without migration files. Safe to re-run.

### 3. Regenerate client
After schema fields change, run:
```
npx prisma generate
```
Then restart the dev server (`npm run dev`) so the new client is loaded.

## `Unknown argument '<field>'` error

**Cause:** Prisma Client runtime is out of sync with schema (old client, not yet regenerated).

**Fix:**
1. `npx prisma generate`
2. Restart dev server
3. Not a DB data issue — check client/schema drift first

## Verify frontend compile (without touching DB)

Use these instead of `npm run build`:
```
npm run lint
npx next build   # only if build script has no migrate step
```
Always check `package.json` scripts before running any build/dev command.

## Key files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Single source of truth for schema |
| `prisma.config.ts` | Reads `DATABASE_URL` from `.env` |
| `npm run db:push` | Syncs schema to DB (no migration files) |
| `npm run db:seed` | Seeds demo data (anna@example.com / password) |

## MySQL/MariaDB casing note

On Linux servers, table names are case-sensitive. Migration SQL must use the same casing as existing tables (often PascalCase: `FinancialAccount`, `Transaction`). Case-only mismatches apply on Windows but fail on Linux.
