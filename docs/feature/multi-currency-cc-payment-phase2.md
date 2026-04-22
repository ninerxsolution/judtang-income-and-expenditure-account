# Multi-currency — Credit Card Cross-Currency PAYMENT (Phase 2 scope)

**Status:** Scope document. **Not implemented.** Create a separate implementation plan before starting work.

Phase 1 ships credit-card PAYMENT as THB-only. Card currency is locked to THB in the UI and the payment route takes a single `amount` field with no FX. This document captures what Phase 2 needs to add, so a future plan can be written quickly without re-deriving the scope.

---

## Phase 1 (current) — recap

Locked paths that must be revisited:

- `components/dashboard/financial-account-form-dialog.tsx` — when `accountType === "CREDIT_CARD"`, currency selector is disabled with message `accounts.currencyCardLockedTHB`.
- `components/dashboard/credit-card-payment-dialog.tsx` — single `amount` field, implied THB, no FX inputs.
- `app/api/credit-card/[id]/payment/route.ts` — no `currency` / `exchangeRate` / `baseAmount` handling; creates a single `PAYMENT` transaction on the linked debit source.
- `lib/credit-card/post-transaction.ts` (and related) — assumes THB throughout.

No `transferGroupId` is set on PAYMENT rows today. Settlement FX (e.g. Visa/Mastercard mid-rate) is done outside the app by the user.

## Phase 2 — goal

Let users hold a **non-THB credit card** (typically USD) and pay it from a **THB funding account** in one click, with the app modelling both legs correctly so statements, budgets, and net worth stay consistent.

## Scope (what must change)

### Schema / data

- `FinancialAccount.currency` for `CREDIT_CARD`: unlock to allow `USD` (and future codes).
- `Transaction` already has `currency`, `exchangeRate`, `baseAmount`, `transferGroupId`, `transferLeg` — no new columns expected. Reuse the cross-currency transfer pattern.
- Decide: PAYMENT remains `TransactionType = PAYMENT`, but when the debit source currency differs from the card currency, write **two rows** sharing a `transferGroupId` (OUT leg on funding account in its own currency, IN leg on the card in card currency), mirroring `createCrossCurrencyTransfer`. Both legs carry matching `baseAmount` (THB) so the pair is net-zero in THB.

### API

- `app/api/credit-card/[id]/payment/route.ts`:
  - Accept `currency`, optional `exchangeRate` (or user-entered amounts on both sides plus a derived rate), plus `amountCardCcy` / `amountFundingCcy`.
  - When funding.currency === card.currency → keep today's single-row behaviour.
  - When they differ → create pair rows via a new helper (`createCrossCurrencyCardPayment`) that reuses the existing validation and base-amount assertions from `lib/currency.ts` (`assertTransferPairBaseBalanced`, `computeBaseAmountThb`).
  - Continue to update card outstanding / statement logic from the card-side leg; funding-side leg just reduces the funding account balance.
- Consider a `/api/fx/suggest?currency=USD` call from the dialog for rate hints (already exists).

### UI

- `credit-card-payment-dialog.tsx`:
  - Show funding account picker (already exists) and display its currency.
  - If funding.currency !== card.currency, reveal the same "cross-currency" block used by transfer dialog (amount-from, amount-to, bank rate, preview of THB on both sides).
  - Use `lib/fx-display.ts` helpers for the `≈ THB` parenthesis.
- Unlock currency selector on card creation (`financial-account-form-dialog.tsx`). Keep the card currency immutable once the card has transactions (follow existing rule from debit account).
- Remove / soften the `accounts.currencyCardLockedTHB` message where appropriate.

### i18n

- New keys under `transactions.creditCardPayment.*`: `crossCurrencySection`, `amountFromFunding`, `amountToCard`, `bankRateLabel`, `bankRateHint`, `previewFundingThb`, `previewCardThb`, etc. Mirror `transactions.form.crossCurrency*` naming for consistency.

### Tests

- Extend `lib/__tests__/currency-cross-transfer.test.ts` with PAYMENT pair cases, or add `lib/__tests__/credit-card-cross-currency-payment.test.ts`.
- API tests: funding.THB → card.USD, funding.USD → card.USD (same ccy, no pair), and failure case where card currency differs from provided leg currency.
- Update existing credit-card tests that assume PAYMENT is a single row.

### Docs

- Update `docs/feature/credit-card-engine.md` and `docs/feature/transfers.md` to cross-link the shared cross-currency pair pattern.
- Add a PRD change-log entry on the day Phase 2 ships.

## Open questions (answer in the Phase 2 plan)

1. Should statement generation show both legs, or collapse to the card-side leg with a THB footnote?
2. Does the budget tracker count credit-card PAYMENT at all? (Today: no, PAYMENT is balance transfer.) Confirm Phase 2 keeps the same behaviour so foreign cards do not inflate or shrink expense budgets.
3. UX: do we allow the user to edit either "funding amount" or "card amount" first, with the other being derived? (Recommended: yes, same as cross-currency transfer form.)
4. Rounding: THB base amount is always `roundMoney2`; confirm the funding-side leg rounds the same way when the funding currency is non-THB (e.g. future AUD funding).
5. Do we need a per-card default preferred funding currency for quicker payment?

## Out of scope for Phase 2

- Cross-currency refunds or reversals beyond the PAYMENT flow.
- Multi-leg (3+ currency) settlements.
- Auto-fetching Visa / Mastercard mid-market rates; keep the `/api/fx/suggest` fallback (`DEFAULT_THB_PER_USD = 32`).
- Changing base currency away from THB (product intent: THB is the only base).

## Prerequisites before starting Phase 2

1. Phase 1 backfill must be completed on **staging and prod** (`Transaction.baseAmount IS NULL = 0`).
2. Step 2.5 (tighten `baseAmount` to `NOT NULL`) is not a hard blocker but makes pair-sum assertions simpler.
3. Smoke-verify Phase 1 cross-currency transfer works end-to-end in production; Phase 2 reuses the same infrastructure.

## Suggested plan structure (when ready to implement)

One `.plan.md` with 5 todos:

1. Schema / helper: reuse cross-currency transfer helpers, add `createCrossCurrencyCardPayment` in `lib/credit-card/`.
2. API: update `app/api/credit-card/[id]/payment/route.ts` + tests.
3. UI: extend `credit-card-payment-dialog.tsx` + i18n keys.
4. Unlock card currency in `financial-account-form-dialog.tsx` + update existing guards.
5. Docs: update `credit-card-engine.md` + `transfers.md` + `PRD_CHANGE_LOG.md`.
