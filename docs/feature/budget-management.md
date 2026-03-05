# Budget Management

Feature นี้จัดการงบประมาณรายเดือน (global และต่อหมวดหมู่) พร้อม template สำหรับใช้ซ้ำ และการแสดงความคืบหน้า (progress) ตามรายจ่ายจริงจาก Transaction

## 1. Overview

- **Budget Template:** คอนฟิกที่ใช้ซ้ำได้ (ชื่อ, งบรวม optional, งบต่อหมวด) นำไปใช้กับเดือนใดก็ได้
- **Budget Month:** งบของเดือนใดเดือนหนึ่ง (ปี + เดือน) มีงบรวม (totalBudget) และรายการงบต่อหมวด (BudgetCategory)
- **Category Budget:** งบต่อหมวดในเดือนนั้น (limitAmount) คำนวณความคืบหน้าจาก Transaction type=EXPENSE, categoryId, occurredAt ในเดือน
- **Enforcement:** แบบ soft — แสดงสถานะและสีเท่านั้น ไม่บล็อกการบันทึกรายการ
- **UI:** Settings → Budget (`/dashboard/settings/budget`), การ์ดสรุปงบบน Dashboard home

## 2. Data Model

### 2.1 BudgetTemplate

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| userId | String | เจ้าของ |
| name | String | ชื่อเทมเพลต |
| isActive | Boolean | ใช้งานอยู่ |
| totalBudget | Decimal? | งบรวม (optional) |
| createdAt, updatedAt | DateTime | |

### 2.2 BudgetTemplateCategory

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| templateId | String | FK BudgetTemplate |
| categoryId | String? | FK Category (SetNull เมื่อ category ถูกลบ) |
| limitAmount | Decimal | งบสูงสุดต่อหมวด |
| createdAt | DateTime | |

Unique: (templateId, categoryId).

### 2.3 BudgetMonth

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| userId | String | เจ้าของ |
| year | Int | ปี (พ.ศ. หรือ ค.ศ. ตามระบบ) |
| month | Int | 1–12 |
| totalBudget | Decimal? | งบรวมของเดือน |
| createdAt, updatedAt | DateTime | |

Unique: (userId, year, month).

### 2.4 BudgetCategory

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| budgetMonthId | String | FK BudgetMonth |
| categoryId | String? | FK Category (SetNull เมื่อ category ถูกลบ) |
| limitAmount | Decimal | งบสูงสุดต่อหมวดในเดือนนี้ |
| createdAt | DateTime | |

Unique: (budgetMonthId, categoryId).

## 3. Progress Calculation

- **สูตร:** progress = total_spent / budget_limit
- **รายจ่ายที่นับ:** Transaction.type = EXPENSE, occurredAt อยู่ในเดือน (calendar month server timezone)
- **รายจ่ายต่อหมวด:** กรองตาม categoryId; รายการไม่มีหมวด (categoryId null) นับเข้าเฉพาะงบรวม
- **ตัวชี้สถานะ (PRD §6):** &lt;70% Normal, 70–90% Warning, &gt;90% Critical, &gt;100% Over Budget

## 4. APIs

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/budget-templates | รายการเทมเพลตของ user (พร้อม category limits) |
| POST | /api/budget-templates | สร้างเทมเพลต (name, isActive, totalBudget?, categoryLimits[]) |
| GET | /api/budget-templates/[id] | เทมเพลตเดียว |
| PATCH | /api/budget-templates/[id] | แก้ไขเทมเพลต |
| DELETE | /api/budget-templates/[id] | ลบเทมเพลต |
| GET | /api/budgets?year=&month= | งบเดือนที่เลือก พร้อม totalSpent, totalProgress, totalIndicator, categoryBudgets (พร้อม spent, progress, indicator) |
| POST | /api/budgets/apply-template | Body: { templateId, year, month }. สร้าง/อัปเดต BudgetMonth และ BudgetCategory จากเทมเพลต |
| PATCH | /api/budgets/month | Body: { year, month, totalBudget }. Upsert งบรวมของเดือน |
| POST | /api/budgets/categories | Body: { budgetMonthId, categoryId, limitAmount }. เพิ่ม/อัปเดตงบหมวด |
| PATCH | /api/budgets/categories/[id] | Body: { limitAmount }. แก้ไขงบหมวด |
| DELETE | /api/budgets/categories/[id] | ลบงบหมวด |

ทุก endpoint ต้อง authenticated; ข้อมูลงบเป็น user-scoped. มี Activity Log (BUDGET_TEMPLATE_*, BUDGET_MONTH_*, BUDGET_CATEGORY_*).

## 5. UI

- **Settings → Budget** (`/dashboard/settings/budget`): เลือกปี/เดือน, งบรวม (input + บันทึก), รายการงบต่อหมวด (progress bar, สีตาม indicator), ปุ่มใช้เทมเพลต, เพิ่มงบหมวด (dialog เลือกหมวด + จำนวน), ลบงบหมวด
- **Template management:** สร้าง/รายการ/แก้ไข/ลบเทมเพลต — Templates section แสดงรายการเทมเพลต (ชื่อ, งบรวมถ้ามี, จำนวนหมวด), ปุ่ม Add template, Create/Edit template dialog (ชื่อ, งบรวม optional, รายการหมวด+จำนวน, Add row / ลบแถว), Delete template (AlertDialog ยืนยัน)
- **Edit category budget:** แก้ไขงบต่อหมวดของเดือนที่เลือก — ปุ่ม Edit (ไอคอนดินสอ) ในแต่ละแถวงบหมวด เปิด dialog แก้ Limit (฿); บันทึกผ่าน PATCH /api/budgets/categories/[id]
- **Dashboard home:** การ์ดสรุปงบเดือนปัจจุบัน (ใช้ไป/งบรวม, %, progress bar, สี); ถ้าไม่มีงบ แสดงปุ่ม "ตั้งงบเดือนนี้" ไปยังหน้างบ

## 6. Edge Cases

- **แก้งบกลางเดือน:** คำนวณ progress ใหม่ทันที
- **หมวดถูกลบ:** BudgetCategory.categoryId เป็น null; แถวงบยังอยู่ (แสดง "Category removed" หรือซ่อนได้)
- **รายการไม่มีหมวด:** นับเข้าเฉพาะงบรวม ไม่เข้าแถวงบต่อหมวด

## 7. Out of Scope (Initial)

Alerts/notifications, carry-over, forecast, shared budgets, AI, bank integrations, push notifications (per PRD §15).
