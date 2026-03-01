# Credit Card Engine

Feature นี้ยกระดับ `CREDIT_CARD` จาก "account ติดลบ" ให้เป็น liability system ที่อิง statement cycle จริง

## 1. Overview

ระบบรองรับ:

- Transaction lifecycle (pending → posted)
- Billing cycle (statement)
- Payment allocation
- Outstanding tracking
- Credit limit management
- Reconciliation readiness

## 2. Goals

1. แสดงยอดหนี้ค้าง (real-time outstanding)
2. แสดงยอดตามรอบบิล (statement balance)
3. รองรับ partial payment
4. คำนวณ available credit
5. รองรับดอกเบี้ย (future extensibility)
6. รองรับ reconciliation กับ statement import

## 3. Data Model

### 3.1 FinancialAccount (CREDIT_CARD)

Fields เพิ่มเติมสำหรับ CREDIT_CARD:

- `creditLimit` — วงเงินเครดิต
- `statementClosingDay` — วันปิดบิล (1–31)
- `dueDay` — วันครบกำหนดชำระ (1–31)
- `currentOutstanding` — ยอดค้างชำระ (denormalized)
- `availableCredit` — วงเงินคงเหลือ
- `interestRate` — อัตราดอกเบี้ย (%) (ใช้แล้ว)
- `interestCalculatedUntil` — สำหรับ v1.1
- `cardType` — ประเภทบัตร (credit, debit, visa, master, jcb, amex, etc.)
- `bankName` — ชื่อธนาคาร (จาก Thai banks dropdown)
- `accountNumber` — เลขบัตรเครดิต (masked เมื่อแสดง)

### 3.2 Transaction

- **TransactionType:** INCOME, EXPENSE, TRANSFER, PAYMENT, INTEREST, ADJUSTMENT
- **TransactionStatus:** PENDING, POSTED, VOID
- **Fields:** `status`, `postedDate`, `statementId` (FK to CreditCardStatement)

### 3.3 CreditCardStatement

- `accountId`, `periodStart`, `periodEnd`, `closingDate`, `dueDate`
- `statementBalance`, `minimumPayment`, `paidAmount`
- `isClosed`, `isPaid`

## 4. Core Logic

### 4.1 Outstanding

- `outstanding = sum(EXPENSE + INTEREST) - sum(PAYMENT + ADJUSTMENT + INCOME)`
- Only POSTED, exclude VOID

### 4.2 Available Credit

- `availableCredit = creditLimit - currentOutstanding - sum(PENDING amounts)`

### 4.3 Expense Flow

1. Create Transaction (type = EXPENSE, status = PENDING or POSTED)
2. Increase `currentOutstanding`, reduce `availableCredit`

### 4.4 Payment Flow

1. Create PAYMENT transaction via `recordPayment`
2. Allocate to oldest unpaid statement first
3. Update `paidAmount`, mark `isPaid` when fully paid
4. Reduce `currentOutstanding`, increase `availableCredit`
5. **fromAccountId:** เมื่อระบุบัญชีต้นทาง (เช่น บัญชีธนาคาร) — สร้าง EXPENSE บนบัญชีนั้น (จำนวนและวันที่เดียวกัน) เพื่อลดยอด; ทั้ง PAYMENT และ EXPENSE อยู่ใน `prisma.$transaction` (atomic)

### 4.5 Statement Closing

1. Collect POSTED EXPENSE/INTEREST in period
2. Create CreditCardStatement
3. Assign transactions to statement

## 5. APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/credit-card/[id]` | Dashboard data (limit, outstanding, available, statement, due date, utilization) |
| `POST /api/credit-card/[id]/close-statement` | Close statement for given closing date |
| `POST /api/credit-card/[id]/payment` | Record payment; body: `amount`, `occurredAt`, `fromAccountId?`, `note?` |
| `POST /api/credit-card/[id]/apply-interest` | (v1.1) Apply interest |
| `POST /api/credit-card/[id]/import-statement` | Import CSV, return matched/missing/duplicates/unmatched |

## 6. Validation Rules

- Payment cannot exceed outstanding
- Statement cannot close twice for same period
- Due date must be after closing date
- Credit card account must not be incomplete (bank, account number, credit limit, interest rate, card type)
- When `fromAccountId` provided: from-account must exist, belong to user, not be CREDIT_CARD, and must not be incomplete

## 7. Out of Scope (v1)

- Interest calculation (v1.1)
- Automatic bank sync
- Multi-currency
- Installment plans
- Grace period modeling
