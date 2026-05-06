---
name: new-feature-checklist
description: End-to-end checklist for adding a new feature to Judtang — API route, i18n, activity log, docs update, cache, tests, and TypeScript. Use at the start of implementing any new feature, or before saying a feature is complete.
---

# New Feature Checklist

Use this checklist when implementing any new user-facing feature in Judtang.

## 1. Data model (if new fields or tables)

- [ ] Edit `prisma/schema.prisma` only — never create `migration.sql` manually
- [ ] Tell user to run `npm run db:push` to sync
- [ ] Run `npx prisma generate` after schema change, restart dev server
- [ ] Add fields as **nullable first** if rolling out on production with existing data
- [ ] If adding to transaction list response: bump `TRANSACTIONS_LIST_CACHE_VERSION`

## 2. API route

- [ ] Auth check at top: `getServerSession` → 401 if no session
- [ ] Validate entity ownership: `where: { id, userId }` — never trust userId from body
- [ ] Validate input; return descriptive 400 errors
- [ ] Call `revalidateTag(...)` after mutations — see `api-route-patterns` skill for which tags
- [ ] Call `createActivityLog` after successful write — see `activity-log` skill for action names
- [ ] GET routes: use module-level `unstable_cache` with relevant tags
- [ ] No `any` types

## 3. UI / Components

- [ ] All UI strings added to **both** `i18n/dictionaries/th.ts` and `en.ts`
- [ ] Used `useI18n()` in client components — no hardcoded strings
- [ ] Year display uses `formatYearForDisplay(year, language)` — not raw Gregorian
- [ ] Dialog with multi-field form: fullscreen on mobile (see `form-dialog-patterns` skill)
- [ ] Date range input: use `DateRangePicker`, not two separate DatePickers
- [ ] Select/dropdown: use `RowSelect` or `AccountCombobox`, not native `<select>` or shadcn Select
- [ ] New top-level section: add to both sidebar nav AND mobile bottom nav
- [ ] Skeleton loading state: static structure (labels, icons) shown; only dynamic values use `<Skeleton />`

## 4. occurredAt (if feature creates transactions)

- [ ] Send full ISO datetime from frontend (date + current time), not date-only string
- [ ] Backend uses `parseOccurredAt(body.occurredAt)` from `lib/date-range`

## 5. Documentation

- [ ] Created or updated `docs/feature/<feature-name>.md`
- [ ] Updated `docs/INDEX.md` with link and summary
- [ ] Added entry to `docs/PRD_CHANGE_LOG.md` (format: `DD/MM/YYYY`)
- [ ] If new activity log event: updated `docs/core/activity-log.md`
- [ ] If new env var: updated `docs/core/environment-config-strategy.md`

## 6. Verification

- [ ] `npm run lint` passes
- [ ] `ReadLints` on all edited files — no new errors
- [ ] If transaction/API code changed: verified with real payload shape (not only mocked Jest tests)
- [ ] Manual test in browser (or DevTools Network replay) for the happy path
- [ ] Edge cases tested: empty state, validation errors, loading state

## 7. Multi-currency (if feature shows amounts)

- [ ] Dashboard/budget amounts in THB only
- [ ] `exchangeRate` = THB per 1 unit of the row's currency (use 1 for THB rows)
- [ ] Export/PDF: primary amount in account currency + `≈ THB` in parentheses when estimated

## Quick reference — skills to load for specific tasks

| Task | Skill |
|------|-------|
| Schema / Prisma changes | `prisma-schema-changes` |
| Transaction create/update/balance | `transaction-features` |
| Dialog form UI | `form-dialog-patterns` |
| Credit card logic | `credit-card-engine` |
| i18n / translation keys | `i18n-localization` |
| Activity log events | `activity-log` |
| API route structure | `api-route-patterns` |
| Docs update | `docs-update-workflow` |
| Mobile/responsive layout | `responsive-ui-patterns` |
| Slip OCR | `slip-ocr-pipeline` |
| Date/year display | `date-time-handling` |
| Multi-currency amounts | `multi-currency-support` |
| Claiming fix is done | `verification-and-testing` |
