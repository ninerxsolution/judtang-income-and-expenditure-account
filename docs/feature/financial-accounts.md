# Financial Accounts

Feature นี้จัดการบัญชีการเงิน (ธนาคาร กระเป๋าเงิน เงินสด บัตรเครดิต) และการตรวจสอบความสมบูรณ์ของบัญชี

## 1. Overview

ระบบรองรับ:

- ประเภทบัญชีหลายแบบ (BANK, CREDIT_CARD, WALLET, CASH, OTHER)
- ธนาคารไทย (dropdown ค้นหาได้)
- เลขบัญชี/เลขบัตร (masked display, eye toggle)
- การตรวจสอบบัญชีไม่สมบูรณ์ (incomplete) — ไม่สามารถใช้งานได้จนกว่าจะกรอกครบ
- แยก section บัญชีกับบัตรเครดิตในหน้ารายการ

## 2. Data Model

### 2.1 FinancialAccount

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | CUID |
| `name` | String | ชื่อบัญชี |
| `type` | AccountType | BANK, CREDIT_CARD, WALLET, CASH, OTHER |
| `initialBalance` | Decimal | ยอดเริ่มต้น |
| `isActive` | Boolean | ใช้งานอยู่หรือไม่ |
| `isDefault` | Boolean | บัญชีหลัก |
| `lastCheckedAt` | DateTime? | ตรวจสอบล่าสุด |
| `bankName` | String? | ชื่อธนาคาร (id จาก Thai banks หรือ custom) |
| `accountNumber` | String? | เลขบัญชีหรือเลขบัตร (เก็บ digits only) |
| `creditLimit` | Decimal? | วงเงินเครดิต (CREDIT_CARD) |
| `statementClosingDay` | Int? | วันปิดบิล (1–31) |
| `dueDay` | Int? | วันครบกำหนดชำระ (1–31) |
| `interestRate` | Decimal? | อัตราดอกเบี้ย (%) |
| `cardType` | String? | ประเภทบัตร (credit, debit, visa, master, jcb, amex, etc.) |

### 2.2 AccountType

- **BANK** — บัญชีธนาคาร
- **CREDIT_CARD** — บัตรเครดิต
- **WALLET** — กระเป๋าเงิน (TrueMoney, PromptPay, etc.)
- **CASH** — เงินสด
- **OTHER** — อื่นๆ

## 3. Incomplete Account

บัญชีที่ไม่สมบูรณ์ (incomplete) — ไม่สามารถใช้งานได้จนกว่าจะกรอกครบ

### 3.1 isAccountIncomplete

ฟังก์ชันใน `lib/financial-accounts.ts`:

- **BANK, WALLET, CREDIT_CARD:** ต้องมี `bankName` และ `accountNumber` (อย่างน้อย 4 หลัก)
- **CREDIT_CARD เพิ่ม:** ต้องมี `creditLimit` (≥ 0), `interestRate` (≥ 0), `cardType`
- **CASH, OTHER:** ไม่ถือว่า incomplete

### 3.2 Behavior เมื่อบัญชี incomplete

- หน้ารายการบัญชี: แสดง warning banner (ring สีแดง, ไอคอน AlertTriangle)
- ปุ่มชำระบัตร / ปิดบิล: disabled
- ฟอร์มรายการ (transaction): ไม่แสดงใน dropdown เลือกบัญชี
- ฟอร์มชำระบัตร: ไม่แสดงใน dropdown "จากบัญชี"
- API: POST /api/transactions และ recordPayment จะ reject

## 4. UI

### 4.1 Bank & Account Number

- **ธนาคาร:** dropdown ค้นหาได้ (Thai banks + "อื่นๆ")
- **เลขบัญชี/เลขบัตร:** input แสดง format (บัญชี: 123-4-56789-0, บัตร: 1234 5678 9012 3456)
- **หน้ารายการ:** แสดง masked (****1234) พร้อมปุ่ม eye เพื่อเปิด/ซ่อนเลขเต็ม

### 4.2 Account Sections

หน้ารายการบัญชี (`/dashboard/accounts`) แยกเป็น 2 section:

| Section | รายการ | แสดงเมื่อ |
|---------|--------|-----------|
| บัญชี (sectionAccounts) | BANK, WALLET, CASH, OTHER | มีบัญชีประเภทนี้ |
| บัตรเครดิต (sectionCreditCards) | CREDIT_CARD | มีบัตรเครดิต |

### 4.3 Credit Card Details

รายละเอียดบัตรเครดิต (วงเงิน, วงเงินคงเหลือ, ยอดบิล, ครบกำหนด, การใช้เครดิต, ดอกเบี้ย, ประเภทบัตร) แสดงแบบย่อ/ขยายได้ — กดปุ่ม "ดูรายละเอียด" เพื่อ expand/collapse พร้อม height transition

## 5. APIs

| Endpoint | Purpose |
|----------|---------|
| `GET /api/financial-accounts` | List accounts; returns `isIncomplete` |
| `POST /api/financial-accounts` | Create account |
| `GET /api/financial-accounts/[id]` | Get single account |
| `PATCH /api/financial-accounts/[id]` | Update account |

## 6. Related

- [Credit Card Engine](./credit-card-engine.md) — สำหรับ CREDIT_CARD (payment, statement, outstanding)
- PRD §18 — Income & Expense Transactions
