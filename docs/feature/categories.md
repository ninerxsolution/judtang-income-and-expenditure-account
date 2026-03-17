# Transaction Categories

Feature นี้จัดการหมวดหมู่สำหรับรายการรายรับรายจ่าย (transactions) แบ่งเป็น default categories (อ่านอย่างเดียว) และ custom categories (CRUD ได้)

## 1. Overview

- **Default categories:** หมวดหมู่เริ่มต้นที่ระบบสร้างให้ — ไม่สามารถแก้ไขหรือลบได้
- **Custom categories:** หมวดหมู่ที่ผู้ใช้สร้าง — CRUD ได้
- หน้า Settings: `/dashboard/settings` มี section Categories

## 2. Data Model

### 2.1 Category

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | CUID |
| `name` | String | ชื่อหมวดหมู่ |
| `isDefault` | Boolean | หมวดหมู่ค่าเริ่มต้น (แก้/ลบไม่ได้) |
| `userId` | String | เจ้าของ |
| `createdAt` | DateTime | สร้างเมื่อ |

### 2.2 Default Category Names

รายการค่าเริ่มต้น (เก็บใน `lib/categories.ts`):

- เงินเดือน, อาหาร, ค่าที่พัก, ค่าน้ำค่าไฟ, ค่าอินเทอร์เน็ต, ช้อปปิ้ง, ค่าอื่นๆ

## 3. API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List categories (ensure defaults ก่อน list) |
| POST | /api/categories | Create custom category |
| PATCH | /api/categories/[id] | Update (reject ถ้า isDefault) |
| DELETE | /api/categories/[id] | Delete (reject ถ้า isDefault) |

## 4. UI

- **Default section:** แสดงรายการ read-only พร้อม badge "ค่าเริ่มต้น" และไอคอน Lock
- **Custom section:** แสดงรายการพร้อมปุ่ม Edit, Delete
- **Add form:** Input + ปุ่ม Add (inline)
- **Edit:** CategoryFormDialog
- **Delete:** AlertDialog ยืนยันก่อนลบ

## 5. ensureUserHasDefaultCategories

- เรียกเมื่อ: GET /api/categories, หลัง register
- สร้าง default categories ที่ยังไม่มีให้ user
- อัปเดต categories ที่ชื่อตรงกับ default list ให้ `isDefault = true`
