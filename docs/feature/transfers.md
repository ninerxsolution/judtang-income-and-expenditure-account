# Transfers Between Accounts

Feature สำหรับโอนเงินระหว่างบัญชีของตัวเอง (เช่น จากบัญชีเงินเดือนไปบัญชีเงินใช้)

## 1. Overview

- **TRANSFER** = โอนเงินจากบัญชีหนึ่งไปอีกบัญชี (ของตัวเอง)
- ใช้ single transaction พร้อม `transferAccountId` (บัญชีปลายทาง)
- `financialAccountId` = บัญชีต้นทาง (โอนออก)
- `transferAccountId` = บัญชีปลายทาง (โอนเข้า)

## 2. Data Model

| Field | Description |
|-------|-------------|
| `financialAccountId` | บัญชีต้นทาง (โอนออก) |
| `transferAccountId` | บัญชีปลายทาง (โอนเข้า) — ใช้เมื่อ type=TRANSFER เท่านั้น |

## 3. Balance Logic

- บัญชีต้นทาง: `-amount` (ลดยอด)
- บัญชีปลายทาง: `+amount` (เพิ่มยอด)

## 4. Validation

- `transferAccountId` ต้องมีเมื่อ type=TRANSFER
- บัญชีต้นทางและปลายทางต้องต่างกัน
- ไม่รองรับ CREDIT_CARD (ห้ามโอนเข้า/ออกบัตรเครดิต)

## 5. UI

- Form: ปุ่ม TRANSFER, dropdown "จากบัญชี" และ "ไปบัญชี"
- List: badge สีฟ้า, แสดง "จากบัญชี → ไปบัญชี"
- Filter: รองรับ type=TRANSFER

## 6. API

- POST /api/transactions: รับ `transferAccountId` เมื่อ type=TRANSFER
- GET /api/transactions: ส่ง `transferAccountId`, `transferAccount` กลับ
- PATCH /api/transactions/[id]: รองรับ `transferAccountId`

## 7. Import/Export

- CSV: คอลัมน์ `transferAccountId` (optional สำหรับ TRANSFER)
- Export: รวม TRANSFER เมื่อ filter by account (ต้นทางหรือปลายทาง)
