# Account Lifecycle (Deactivate & Restore)

Feature สำหรับการระงับบัญชีผู้ใช้ (deactivate) พร้อม grace period ก่อนลบถาวร และการกู้คืนบัญชี (restore) ภายในช่วง grace period

## 1. Overview

- **No cron jobs** — lifecycle ใช้ timestamp-based evaluation ระหว่างการทำงานของระบบ (login, signup, JWT refresh)
- **Lifecycle:** ACTIVE → SUSPENDED (grace period) → LOGICALLY DELETED
- ผู้ใช้สามารถ deactivate บัญชีได้จาก Settings → Privacy
- ภายใน grace period (default 30 วัน) สามารถ restore ได้ผ่านหน้า /restore-account
- หลัง grace period: บัญชีถือว่าถูกลบ (logically deleted), อีเมลเดิมนำกลับมาใช้ได้

## 2. Data Model

### 2.1 UserStatus (enum)

- **ACTIVE** — บัญชีใช้งานได้
- **SUSPENDED** — ระงับแล้ว อยู่ใน grace period
- **DELETED** — ลบถาวรแล้ว

### 2.2 User (fields เพิ่ม)

| Field | Type | Description |
|-------|------|-------------|
| status | UserStatus | สถานะบัญชี (default ACTIVE) |
| suspendedAt | DateTime? | วันที่ระงับ |
| deleteAfter | DateTime? | วันที่กำหนดลบ (suspendedAt + grace period) |
| deletedAt | DateTime? | วันที่ลบจริง |

### 2.3 UserDeletionRequest

| Field | Type | Description |
|-------|------|-------------|
| id | String | CUID |
| userId | String | FK User |
| reason | String? | เหตุผล (optional) |
| requestedAt | DateTime | วันที่ขอระงับ |
| deleteAfter | DateTime | วันที่กำหนดลบ |
| cancelledAt | DateTime? | วันที่ยกเลิก (เมื่อ restore) |

## 3. Logic

### 3.1 resolveUserStatus(user)

- ถ้า `status === SUSPENDED` และ `now() > deleteAfter` → return **DELETED**
- มิฉะนั้น return `user.status`

### 3.2 finalizeDeletion(userId)

- อัปเดต User: status=DELETED, deletedAt=now, email=mutate, suspendedAt=null, deleteAfter=null
- Revoke ทุก UserSession
- Mutate email: `deleted_<userId>_<originalEmail>`
- Log ACCOUNT_DELETED

### 3.3 Triggers

- **Login (Credentials):** หลัง verify password → resolveUserStatus; ถ้า DELETED → finalize แล้ว return null; ถ้า SUSPENDED → return null
- **Login (Google):** ก่อน update emailVerified → resolveUserStatus; ถ้า SUSPENDED/DELETED → return false
- **JWT callback:** เมื่อ validate session → resolveUserStatus; ถ้า SUSPENDED/DELETED → revoke session, clear token
- **Signup:** ถ้ามี user เดิมด้วย email เดียวกัน → resolveUserStatus; ACTIVE → 409; SUSPENDED (ใน grace) → 409; SUSPENDED (เลย grace) หรือ DELETED → finalize แล้วสร้าง user ใหม่ได้

## 4. APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/users/me/deactivate | ระงับบัญชี (body: reason?) — ต้อง authenticated, ACTIVE |
| POST | /api/auth/restore-account | กู้คืนบัญชี (body: email, password) — public |

## 5. UI

- **Settings → Privacy:** ปุ่ม "Deactivate account" พร้อม confirmation dialog (reason optional)
- **/restore-account:** ฟอร์ม email + password สำหรับกู้คืนบัญชีที่ถูกระงับ
- **Sign-in page:** ลิงก์ "Restore a deactivated account?" และ banner เมื่อ redirect มาจาก deactivate

## 6. Activity Log

- **ACCOUNT_DEACTIVATE** — เมื่อผู้ใช้กด deactivate (details: reason?)
- **ACCOUNT_RESTORE** — เมื่อกู้คืนสำเร็จ (details: restoredBy: "user")
- **ACCOUNT_DELETED** — เมื่อ finalize deletion

## 7. Environment

- `ACCOUNT_GRACE_PERIOD_DAYS` (optional, default 30)
