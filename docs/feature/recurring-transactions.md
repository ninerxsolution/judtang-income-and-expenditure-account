# Recurring Transactions

Feature สำหรับ template รายการรายรับ/รายจ่ายซ้ำ (รายสัปดาห์ รายเดือน รายปี) และการยืนยันเป็น transaction จริงเมื่อถึงกำหนด

## 1. Overview

- **Recurring Transaction** = template รายการที่เกิดซ้ำตามความถี่ (WEEKLY, MONTHLY, YEARLY)
- รองรับเฉพาะ type **INCOME** และ **EXPENSE**
- แต่ละ template มี: ชื่อ, จำนวนเงิน, หมวดหมู่ (optional), บัญชี (optional), ความถี่, วันในเดือน (dayOfMonth สำหรับ MONTHLY/YEARLY), เดือนในปี (monthOfYear สำหรับ YEARLY เท่านั้น), startDate, endDate (optional), isActive
- ผู้ใช้ดูรายการที่ "due" ในเดือนที่เลือก และกด "confirm" เพื่อสร้าง Transaction จริงจาก template (ผูกกับ template ผ่าน `recurringTransactionId`) หรือ **ผูกรายการ INCOME/EXPENSE ที่บันทึกมือแล้วในเดือนเดียวกัน** แทนการสร้างแถวใหม่

## 2. Data Model

### 2.1 RecurringTransaction

| Field | Type | Description |
|-------|------|--------------|
| id | String | CUID |
| userId | String | เจ้าของ |
| name | String | ชื่อ template |
| type | TransactionType | INCOME หรือ EXPENSE |
| amount | Decimal | จำนวนเงิน |
| categoryId | String? | FK Category (SetNull เมื่อ category ถูกลบ) |
| financialAccountId | String? | FK FinancialAccount (SetNull เมื่อบัญชีถูกลบ) |
| frequency | RecurringFrequency | WEEKLY, MONTHLY, YEARLY |
| dayOfMonth | Int? | 1–31 ใช้กับ MONTHLY และ YEARLY |
| monthOfYear | Int? | 1–12 ใช้กับ YEARLY เท่านั้น |
| startDate | DateTime | วันที่เริ่มนับ |
| endDate | DateTime? | วันที่สิ้นสุด (optional) |
| isActive | Boolean | เปิด/ปิด template |
| note | String? | หมายเหตุ |
| createdAt, updatedAt | DateTime | |

### 2.2 RecurringFrequency (enum)

- **WEEKLY** — ทุกสัปดาห์
- **MONTHLY** — ทุกเดือน (อาจใช้ dayOfMonth)
- **YEARLY** — ทุกปี (ใช้ dayOfMonth + monthOfYear)

### 2.3 Transaction.recurringTransactionId

- เมื่อผู้ใช้ "confirm" การชำระ/บันทึกจาก template ระบบสร้าง Transaction จริงและใส่ `recurringTransactionId` ชี้กลับไปที่ RecurringTransaction **หรือ** อัปเดตรายการที่มีอยู่แล้วให้มี `recurringTransactionId` (โหมด "ใช้รายการที่มีอยู่")
- ใช้ตรวจว่าในเดือนนั้นเคยบันทึกจาก template นี้แล้วหรือยัง (isPaid)

## 3. APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/recurring-transactions | รายการ template ทั้งหมดของ user |
| GET | /api/recurring-transactions?dueYear=YYYY&dueMonth=M | รายการที่ due ในปี/เดือนที่กำหนด (พร้อม isPaid ต่อ template) |
| POST | /api/recurring-transactions | สร้าง template (name, type, amount, categoryId?, financialAccountId?, frequency, dayOfMonth?, monthOfYear?, startDate, endDate?, note?) |
| GET | /api/recurring-transactions/[id] | ดึง template เดียว |
| PATCH | /api/recurring-transactions/[id] | แก้ไข template |
| DELETE | /api/recurring-transactions/[id] | ลบ template |
| GET | /api/recurring-transactions/[id]/link-candidates?dueYear=YYYY&dueMonth=M | รายการ Transaction ที่โพสต์แล้วในเดือนนั้น ประเภทเดียวกับ template ยังไม่มี recurringTransactionId และไม่ใช่แถว transfer (transferGroupId null). Query เสริม: `q`/`search`, `onDate=YYYY-MM-DD`, `limit` (1–50), `timezone` (IANA — ใช้กับขอบวันของ `onDate` และการแสดงวันที่ใน picker; default `Asia/Bangkok`) |
| POST | /api/recurring-transactions/[id]/confirm | สร้างหรือผูก Transaction: body ต้องมี `dueYear`, `dueMonth` (1–12), `amount`, `occurredAt`, `financialAccountId`, optional `categoryId`, `note`, optional `linkTransactionId` (เมื่อส่ง = ผูกแถวนั้นแทนการสร้างใหม่) |

ทุก endpoint ต้อง authenticated; ข้อมูลเป็น user-scoped.

## 4. Logic

- **getCalendarMonthBounds(year, month):** คืน `periodStart` / `periodEnd` ตามปฏิทินใน timezone ของ runtime (ใช้ร่วมกับ due list, link-candidates, และการตรวจ `occurredAt` ตอน confirm)
- **getDueRecurringTransactions(userId, year, month):** คืน template ที่ isActive, startDate ≤ สิ้นเดือน, endDate เป็น null หรือ ≥ ต้นเดือน; สำหรับ YEARLY กรอง monthOfYear = month; แต่ละรายการมี flag `isPaid` จากการตรวจว่ามี Transaction ในช่วงนั้นที่ผูก recurringTransactionId กับ template นี้หรือไม่
- **listRecurringLinkCandidates:** รายการ POSTED ประเภทเดียวกับ template ในเดือนนั้น ที่ `recurringTransactionId` เป็น null และ `transferGroupId` เป็น null; ถ้ามี `onDate` จะกรอง `occurredAt` เป็นช่วงวันนั้นใน `timezone` (default `Asia/Bangkok`)
- **confirmRecurringTransaction:** ต้องมี `dueYear`/`dueMonth` และ `occurredAt` อยู่ในช่วงเดือนนั้น; ถ้ามีแถวผูก template นี้ในเดือนนั้นแล้วจะ throw (กัน double confirm); ถ้ามี `linkTransactionId` ให้ `updateTransaction` ตั้งฟิลด์และ `recurringTransactionId` (Activity Log TRANSACTION_UPDATED + `source: "recurring-link"`); ไม่เช่นนั้นให้ `create` แถวใหม่ (TRANSACTION_CREATED + `source: "recurring"`)

## 5. UI

- **Route:** `/dashboard/recurring`
- **Components:** หน้ารายการ template และรายการ due ในเดือนที่เลือก; RecurringDueWidget, RecurringConfirmDialog (ยืนยันเป็น transaction หรือโหมดผูกรายการเดิม), RecurringTransactionFormDialog (สร้าง/แก้ template)
- **Confirm dialog:** สลับโหมด "สร้างรายการใหม่" / "ใช้รายการที่มีอยู่"; โหมดผูกโหลด candidates จาก `GET .../link-candidates` ตาม `dueYear`/`dueMonth` เดียวกับหน้า due; เลือกรายการแล้ว prefill ฟอร์ม (แก้ก่อนบันทึกได้)
- **Recurring list (mobile):** การ์ดรายการในหน้า `/dashboard/recurring` จัดเป็น 2 แถวบนจอเล็ก โดยแถวบนแสดงสถานะ + ข้อมูลรายการ และแถวล่างแสดงจำนวนเงิน + ปุ่ม action เพื่อไม่ให้ข้อความและปุ่มอัดในบรรทัดเดียว
- **Confirm dialog date picker:** ใน `RecurringConfirmDialog` ช่องวันที่จ่ายใช้ปุ่มวันที่แบบ inline calendar trigger เช่นเดียวกับ transaction dialog แทน `input[type="date"]`
- **Edit dialog active state:** ใน `RecurringTransactionFormDialog` (โหมดแก้ไข) ฟิลด์ `isActive` ใช้ toggle-style switch แทน checkbox
- **Confirm action button:** ปุ่ม `บันทึกการจ่าย` ในการ์ด recurring ใช้ solid green style เพื่อเน้น action หลักให้ชัดเจนขึ้น
- **Action menu:** ปุ่มบันทึกการจ่ายและแก้ไขรวมอยู่ในเมนู dropdown (⋯) แทนปุ่มแยก กดแล้วเลือก "บันทึกการจ่าย" หรือ "แก้ไข"
- **Tab "ทั้งหมด":** แสดง **รายจ่ายต่อเดือนเฉลี่ย** ด้านบนรายการ — คำนวณจากรายการ EXPENSE ที่ isActive เท่านั้น แปลงเป็นรายเดือนตามความถี่ (WEEKLY × 52/12, MONTHLY × 1, YEARLY ÷ 12)

## 6. Activity Log

- RECURRING_TRANSACTION_CREATED — เมื่อสร้าง template
- RECURRING_TRANSACTION_UPDATED — เมื่อแก้ไข template
- RECURRING_TRANSACTION_DELETED — เมื่อลบ template
- ตอน confirm แบบสร้างใหม่: TRANSACTION_CREATED พร้อม details รวม source: "recurring", recurringId, name
- ตอน confirm แบบผูกรายการเดิม: TRANSACTION_UPDATED (ผ่าน `updateTransaction`) พร้อม details รวม source: "recurring-link", recurringId, recurringName
