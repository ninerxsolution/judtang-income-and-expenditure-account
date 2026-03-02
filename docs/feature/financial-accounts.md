# Financial Accounts

Feature นี้จัดการบัญชีการเงิน (ธนาคาร กระเป๋าเงิน เงินสด บัตรเครดิต) และการตรวจสอบความสมบูรณ์ของบัญชี

## 1. Overview

ระบบรองรับ:

- ประเภทบัญชีหลายแบบ (BANK, CREDIT_CARD, WALLET, CASH, OTHER)
- ธนาคารไทย (dropdown ค้นหาได้)
- เลขบัญชี/เลขบัตร (masked display, eye toggle สำหรับโหมด FULL)
- **เข้ารหัสข้อมูล** — เลขบัญชีเต็มเข้ารหัสด้วย AES-256-GCM ก่อนเก็บ
- **โหมดเก็บข้อมูล** — บัญชีธนาคาร/กระเป๋าเงินเลือกเก็บเลขเต็ม (เข้ารหัส) หรือแค่ 4 ตัวท้าย
- **บัตรเครดิต** — กรอกเฉพาะเลข 4 ตัวท้าย ไม่เก็บเลขเต็ม
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
| `isHidden` | Boolean | ซ่อนจาก UI (สำหรับบัญชีหลัก) |
| `lastCheckedAt` | DateTime? | ตรวจสอบล่าสุด |
| `bankName` | String? | ชื่อธนาคาร (id จาก Thai banks หรือ custom) |
| `accountNumber` | String? @db.Text | ciphertext (FULL) หรือ plain last 4 (LAST_4_ONLY) |
| `accountNumberMode` | String? | "FULL" \| "LAST_4_ONLY" (BANK, WALLET เท่านั้น) |
| `creditLimit` | Decimal? | วงเงินเครดิต (CREDIT_CARD) |
| `statementClosingDay` | Int? | วันปิดบิล (1–31) |
| `dueDay` | Int? | วันครบกำหนดชำระ (1–31) |
| `interestRate` | Decimal? | อัตราดอกเบี้ย (%) |
| `cardType` | String? | ประเภทบัตร (credit, debit, visa, master, jcb, amex, etc.) |

### 2.2 Account Number Storage Rules

| ประเภท | accountNumberMode | เก็บใน accountNumber |
|--------|-------------------|----------------------|
| BANK | FULL | ciphertext (AES-256-GCM) |
| BANK | LAST_4_ONLY | เลข 4 ตัวท้าย (plain) |
| CREDIT_CARD | (implicit) | เลข 4 ตัวท้าย (plain) |
| WALLET | FULL \| LAST_4_ONLY | เหมือน BANK |

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
- **โหมดเก็บเลขบัญชี (BANK, WALLET):** เลือก "เก็บเลขเต็ม (เข้ารหัส)" หรือ "เก็บแค่ 4 ตัวท้าย"
  - FULL: กรอกเลขเต็ม (สูงสุด 12 หลัก) — เข้ารหัสก่อนเก็บ
  - LAST_4_ONLY: กรอกเฉพาะ 4 ตัวท้าย
- **บัตรเครดิต:** กรอกเฉพาะเลข 4 ตัวท้าย (ไม่เก็บเลขเต็ม)
- **หน้ารายการ:** แสดง masked (****1234) พร้อมปุ่ม eye เพื่อเปิด/ซ่อนเลขเต็ม — **เฉพาะโหมด FULL**

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
| `GET /api/financial-accounts` | List active accounts; returns `isIncomplete`, `isHidden`, `transactionCount` |
| `POST /api/financial-accounts` | Create account |
| `GET /api/financial-accounts/[id]` | Get single account |
| `PATCH /api/financial-accounts/[id]` | Update account (supports `isHidden`) |
| `DELETE /api/financial-accounts/[id]` | Delete account (hard delete if no transactions; soft delete/disable if has transactions) |

## 6. Hide/Show Default Account

บัญชีหลัก (default) สามารถซ่อนได้ เพื่อให้ผู้ใช้ที่ใช้บัญชีจริงไม่เห็นบัญชีหลักในรายการ

- **ซ่อน:** ใช้เมนู dropdown บนการ์ดบัญชีหลัก → "ซ่อนบัญชีหลัก"
- **แสดง:** เมื่อซ่อนแล้ว จะแสดงแถบ "บัญชีหลักถูกซ่อน" พร้อมปุ่ม "แสดง"
- **ผลลัพธ์:** บัญชีที่ซ่อนจะไม่แสดงในหน้ารายการบัญชีและฟอร์มธุรกรรม แต่ API ยังใช้บัญชีหลักเป็น default เมื่อไม่ระบุบัญชี (ถ้าไม่มีบัญชีที่แสดงอีก)

## 7. Delete Account

- **บัญชีหลัก:** ห้ามลบ
- **บัญชีที่มีธุรกรรม:** ปิดการใช้งาน (soft delete) — ซ่อนจากรายการ
- **บัญชีที่ไม่มีธุรกรรม:** ลบถาวร (hard delete)
- **ยืนยันการลบ:** ใช้รหัสสุ่ม 6 ตัวทุกกรณี — แสดงรหัสให้ผู้ใช้กรอกกลับมาเพื่อยืนยัน

## 8. Encryption

- **Algorithm:** AES-256-GCM (Node.js crypto)
- **Key:** `ENCRYPTION_KEY` (32 bytes, base64) ใน `.env`
- **Scope:** เลขบัญชีเต็ม (โหมด FULL) เท่านั้น — LAST_4 และ CREDIT_CARD เก็บ plain
- **lib/encryption.ts:** `encrypt()`, `decrypt()`, `isEncrypted()`
- **lib/account-number.ts:** `processAccountNumberForStorage()`, `getAccountNumberForMasking()`, `getFullAccountNumber()`

## 9. Related

- [Credit Card Engine](./credit-card-engine.md) — สำหรับ CREDIT_CARD (payment, statement, outstanding)
- [Environment Config](../core/environment-config-strategy.md) — ENCRYPTION_KEY
- PRD §18 — Income & Expense Transactions
