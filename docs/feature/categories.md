# Transaction Categories

Feature นี้จัดการหมวดหมู่สำหรับรายการรายรับรายจ่าย (transactions) แบ่งเป็น default categories (อ่านอย่างเดียว) และ custom categories (CRUD ได้) รองรับชื่อภาษาไทยและภาษาอังกฤษ (nameEn) สำหรับการแสดงผลตาม locale

## 1. Overview

- **Default categories:** หมวดหมู่เริ่มต้นที่ระบบสร้างให้ — ไม่สามารถแก้ไขหรือลบได้
- **Custom categories:** หมวดหมู่ที่ผู้ใช้สร้าง — CRUD ได้
- **Bilingual display:** ชื่อหมวดหมู่แสดงตาม locale (th/en) — ใช้ `nameEn` เมื่อมี หรือ fallback จาก `DEFAULT_CATEGORY_TRANSLATIONS` สำหรับ default categories
- หน้า Settings: `/dashboard/settings` มี section Categories

## 2. Data Model

### 2.1 Category

| Field | Type | Description |
|-------|------|-------------|
| `id` | String | CUID |
| `name` | String | ชื่อหมวดหมู่ (ภาษาไทย) |
| `nameEn` | String? | ชื่อภาษาอังกฤษ (optional) |
| `isDefault` | Boolean | หมวดหมู่ค่าเริ่มต้น (แก้/ลบไม่ได้) |
| `userId` | String | เจ้าของ |
| `createdAt` | DateTime | สร้างเมื่อ |

### 2.2 Default Category Names

รายการค่าเริ่มต้น (เก็บใน `lib/categories.ts`):

- เงินเดือน, อาหาร, ค่าที่พัก, ค่าน้ำค่าไฟ, ค่าอินเทอร์เน็ต, ค่าสมัครสมาชิก, ช้อปปิ้ง, อื่นๆ

### 2.3 Display Name (Bilingual)

- ใช้ `getCategoryDisplayName(name, locale, nameEn)` จาก `lib/categories-display.ts`
- **locale = "en":** ถ้ามี `nameEn` ใช้ `nameEn`; ถ้าไม่มีและเป็น default category ใช้ `DEFAULT_CATEGORY_TRANSLATIONS[name]`; มิฉะนั้นใช้ `name`
- **locale = "th":** ใช้ `name` เสมอ

## 3. API

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List categories (ensure defaults ก่อน list) — คืน `name`, `nameEn` |
| POST | /api/categories | Create custom category — body: `{ name, nameEn? }` |
| PATCH | /api/categories/[id] | Update (reject ถ้า isDefault) — body: `{ name, nameEn? }` |
| DELETE | /api/categories/[id] | Delete (reject ถ้า isDefault) |

## 4. UI

- **Default section:** แสดงรายการ read-only พร้อม badge "ค่าเริ่มต้น" และไอคอน Lock
- **Custom section:** แสดงรายการพร้อมปุ่ม Edit, Delete
- **Add form:** Input ชื่อ (required) + Input ชื่อภาษาอังกฤษ (optional) + ปุ่ม Add (inline)
- **Edit:** CategoryFormDialog — ฟิลด์ name และ nameEn
- **Delete:** AlertDialog ยืนยันก่อนลบ
- **Display:** ทุกจุดที่แสดงชื่อหมวดหมู่ใช้ `getCategoryDisplayName` ตาม locale ปัจจุบัน

## 5. ensureUserHasDefaultCategories

- เรียกเมื่อ: GET /api/categories, หลัง register
- สร้าง default categories ที่ยังไม่มีให้ user
- อัปเดต categories ที่ชื่อตรงกับ default list ให้ `isDefault = true`
- Default categories ที่สร้างจาก ensure ไม่มี `nameEn` ใน DB — การแสดงผลภาษาอังกฤษใช้ `DEFAULT_CATEGORY_TRANSLATIONS` ใน `lib/categories-display.ts`
