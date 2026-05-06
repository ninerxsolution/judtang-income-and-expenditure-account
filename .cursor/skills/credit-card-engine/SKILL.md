---
name: credit-card-engine
description: Credit card engine business logic for Judtang — outstanding calculation, statement cycles, payment flow, available credit, interest, and debit card linked bank account. Use when working with CREDIT_CARD accounts, PAYMENT/INTEREST transactions, statement closing, credit card APIs, or balance snapshot logic for card accounts.
---

# Credit Card Engine

A `CREDIT_CARD` account in Judtang is a **liability system**, not just a negative-balance account.

## Transaction types for credit cards

| Type | Purpose |
|------|---------|
| `EXPENSE` | Charge to card (increases outstanding) |
| `PAYMENT` | Pay card bill (reduces outstanding) |
| `INTEREST` | Interest charge applied by the system |
| `ADJUSTMENT` | Manual balance correction |
| `INCOME` | Credit/refund to card |

`TransactionStatus`: `PENDING` → `POSTED` → (optionally) `VOID`  
Only `POSTED` (non-VOID) rows are included in outstanding calculations.

## Core formulas

```
outstanding = sum(EXPENSE + INTEREST) - sum(PAYMENT + ADJUSTMENT + INCOME)
              [POSTED only, exclude VOID]

availableCredit = creditLimit - currentOutstanding - sum(PENDING amounts)
```

## Payment flow

When recording a payment (`POST /api/credit-card/[id]/payment`):
1. Creates a `PAYMENT` transaction on the card
2. Allocates to oldest unpaid statement first
3. Updates `paidAmount`; marks `isPaid` when fully paid
4. Reduces `currentOutstanding`, increases `availableCredit`
5. If `fromAccountId` provided: also creates an `EXPENSE` on the source account (same amount + date) — both rows written atomically in `prisma.$transaction`

## Statement closing

`POST /api/credit-card/[id]/close-statement`:
1. Collects `POSTED` EXPENSE/INTEREST in the billing period
2. Creates `CreditCardStatement` row
3. Assigns transactions to the statement via `statementId`
4. Cannot close twice for the same period

## Interest (v1.1)

`POST /api/credit-card/[id]/apply-interest`:
- Formula: `outstanding × (annualRate% / 100) / 365 × days` (rounded to 2 dp)
- Creates `INTEREST` transaction, updates `interestCalculatedUntil`, calls `recomputeOutstanding`
- Skips if `outstanding ≤ 0` or no calculable period; returns `{ applied: false }`
- Logs `CREDIT_CARD_INTEREST_APPLIED` to activity log

## FinancialAccount fields (CREDIT_CARD only)

| Field | Description |
|-------|-------------|
| `creditLimit` | Total credit limit |
| `statementClosingDay` | Day of month the statement closes (1–31) |
| `dueDay` | Payment due day (1–31) |
| `currentOutstanding` | Denormalized real-time outstanding |
| `availableCredit` | Denormalized available credit |
| `interestRate` | Annual interest rate (%) |
| `cardAccountType` | `credit` / `debit` / `prepaid` / `other` |
| `cardNetwork` | `visa` / `master` / `jcb` / `amex` / `unionpay` / `truemoney` / `other` |
| `linkedAccountId` | For debit cards: linked bank account |

## Debit card + linked bank

Debit `CREDIT_CARD` rows with `linkedAccountId` share a **combined chronological ledger** with the linked bank account for balance snapshot purposes. Any `isAccountIncomplete` check must include `linkedAccountId` in the Prisma `select`.

## Validation rules

- Payment cannot exceed outstanding
- Statement cannot close twice for same period
- `fromAccountId` must not be a CREDIT_CARD account and must not be incomplete
- Card must have: bank, account number, credit limit, interest rate, card type — or `isAccountIncomplete` returns true

## APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/credit-card/[id]` | GET | Dashboard data (outstanding, available, statement, utilization) |
| `/api/credit-card/[id]/close-statement` | POST | Close statement |
| `/api/credit-card/[id]/payment` | POST | Record payment |
| `/api/credit-card/[id]/apply-interest` | POST | Apply interest (v1.1) |
| `/api/credit-card/[id]/import-statement` | POST | Import CSV statement |

## Key files

| File | Purpose |
|------|---------|
| `lib/credit-card/outstanding.ts` | `getCurrentOutstanding`, `recomputeOutstanding` |
| `lib/credit-card/statement.ts` | Statement period helpers |
| `app/api/credit-card/[id]/` | Credit card API routes |
| `components/dashboard/credit-card-payment-dialog.tsx` | Payment UI |
