---
name: multi-currency-support
description: Multi-currency business rules for Judtang — THB as base currency, exchangeRate definition, cross-currency transfers, baseAmount, budget math, and export display. Use when working with foreign currency transactions, transfers between currencies, budgets, summaries, or PDF/export features.
---

# Multi-Currency Support

## Base currency: THB only

- Dashboard summaries, budgets, and spending efficiency all use **THB only**
- No user-facing change of base currency
- Non-THB transactions are converted to approximate THB for dashboard math

## exchangeRate definition

`exchangeRate` on a transaction row = **THB per 1 unit of that row's currency**

```ts
// Examples:
// USD transaction: exchangeRate = ~36 (36 THB per 1 USD)
// THB transaction: exchangeRate = 1
```

Use `1` when the transaction leg is already THB.

## Transfers

| Transfer type | Structure |
|---------------|-----------|
| Same currency | Single `TRANSFER` row |
| Cross-currency | Two rows with the same `transferGroupId` |

Edit and delete must apply to the **whole transfer group**.

Credit card PAYMENT (phase 1): users enter amounts in THB. No cross-currency payment flow required yet.

## baseAmount (THB value at posting time)

- `baseAmount` = THB equivalent stored at posting time (not estimated)
- Use `baseAmount` for accurate historical THB values
- When `baseAmount` is null (older rows): use `amount * exchangeRate` as an estimate

**Rollout pattern for new columns:**
1. Add field as nullable first (additive schema)
2. App falls back when null
3. Verify on staging/prod
4. Backfill existing rows
5. Tighten to NOT NULL

## Budgets

- Budgets are **THB-only**
- Non-THB activity: convert to approximate THB using `exchangeRate`
- FX fallback: 32 THB per 1 USD when rate is unavailable
- Budget at exactly 100% of limit = `full` (not `over`); `over` = strictly above limit

## Export / PDF display

Show primary amount in the **account's currency** with **THB in parentheses**:
```
฿ 1,200  (THB 1,200)         ← THB account, exact
$ 35.00  (≈ THB 1,260)       ← foreign currency, approximate
```

Use `≈` / approximate wording when THB comes from `exchangeRate` estimate, not from stored `baseAmount`.

## Key files

| File | Purpose |
|------|---------|
| `lib/currency.ts` | Currency formatting helpers |
| `lib/exchange-rate.ts` | FX rate lookup + fallback logic |
| `prisma/schema.prisma` | `exchangeRate`, `baseAmount`, `transferGroupId` fields |
