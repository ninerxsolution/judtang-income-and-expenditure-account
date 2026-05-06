---
name: verification-and-testing
description: Verification and testing workflow for Judtang — when npm test passing is NOT enough, how to verify real API paths, transaction list cache versioning, and lint checks. Use when claiming a fix is verified, after changing transaction/API code, or before saying "it works".
---

# Verification & Testing

## Jest passing ≠ UI/API path verified

`__tests__/api/*.test.ts` often mocks `@/lib/transactions` or Prisma. **All tests can pass while the browser's PATCH/POST still returns 500.**

**After changing transaction create / update / snapshot code**, also verify with at least one of:
- A test that runs **real helper logic** (pure functions in `lib/` without mocks)
- Hitting the route with the **same JSON body shape** the UI sends (use DevTools Network replay)
- Checking that `null` fields (e.g. `categoryId: null`) and ISO datetime fields match exactly

Never say "fixed and verified" citing only `npm test` when the changed code is behind a mock.

## Transaction list cache — bump version when shape changes

When adding, removing, or renaming fields on `GET /api/transactions` response:

1. Open `app/api/transactions/route.ts`
2. Bump `TRANSACTIONS_LIST_CACHE_VERSION` (e.g. `snap-v1` → `snap-v2`)
3. This invalidates stale cache entries so new fields appear immediately after deploy

If the column shows "—" in UI but DB has the value populated: stale cache is the first suspect.

## ReadLints after editing

After any substantive code change, run `ReadLints` on edited files before finishing. Fix introduced lints before declaring done.

## TypeScript — no `any`

- Use `unknown` when type is uncertain, not `any`
- Define types for all parameters, return values, and variables

## Pre-flight checklist before "done"

- [ ] `npm run lint` passes
- [ ] `ReadLints` on edited files shows no new errors
- [ ] If transaction/API code changed: verified with real payload, not only mocked tests
- [ ] If list response shape changed: `TRANSACTIONS_LIST_CACHE_VERSION` bumped
- [ ] No `any` types introduced

## Key references

| File | Purpose |
|------|---------|
| `app/api/transactions/route.ts` | `TRANSACTIONS_LIST_CACHE_VERSION` |
| `lib/transfer-group-patch-utils.ts` | Transfer group PATCH regression helpers |
| `__tests__/api/transactions.test.ts` | Mocked suite — complements, does not replace, real-path checks |
