# Reusability Analysis: สิ่งที่หยิบยกไปใช้กับระบบอื่นได้

เอกสารนี้วิเคราะห์ภาพรวมโปรเจกต์ Judtang เพื่อระบุ **feature**, **rule**, และ **structure** ที่สามารถนำไปใช้สร้างระบบอื่นหรือขึ้นโครงสร้างโปรเจกต์ใหม่ได้ โดยไม่ผูกติดกับ domain การเงินโดยตรง

---

## 1. Features ที่นำไปใช้ซ้ำได้ (Reusable Features)

### 1.1 Core — ใช้ได้กับระบบใดก็ได้

| Feature | คำอธิบาย | ระดับการ reuse |
|---------|----------|-----------------|
| **Authentication** | NextAuth (Credentials + Google OAuth), Remember Me, Forgot/Reset password, Email verification | สูงมาก |
| **Session Management** | UserSession table, list/revoke sessions, touch/heartbeat, lastActiveAt | สูงมาก |
| **Activity Log** | Audit trail ใน DB (userId, action, entityType, entityId, details, createdAt) | สูงมาก |
| **Route Protection** | Proxy redirect สำหรับ path ที่ต้อง login (เช่น `/dashboard`) | สูงมาก |
| **User Profile** | Profile page, change name, change password, sessions block | สูง |
| **Public Landing Page** | Navbar (theme, language, releases), Hero, Core Value, Feature Grid, CTA, Footer | สูง |
| **Privacy Policy / Terms** | Public pages `/privacy`, `/terms` พร้อม PDPA/GDPR-ready | สูง |
| **Help & Feedback** | User submit report (bug/feature request), Admin backoffice, rate limit, Turnstile | สูง |
| **Announcement Popup** | Config-driven modal, Thai/English, "don't show again today" | สูง |
| **In-App Notifications** | Notification panel, read/unread, mark all | สูง |

### 1.2 UI/UX Layer — ใช้ได้กับระบบใดก็ได้

| Feature | คำอธิบาย | ระดับการ reuse |
|---------|----------|-----------------|
| **Dashboard Layout** | Sidebar (collapsible), mobile bottom nav, dialog nav on small screen | สูงมาก |
| **Theme (Light/Dark/System)** | next-themes, theme toggle | สูงมาก |
| **i18n (Thai/English)** | Dictionary-based, cookie + localStorage, `useTranslation` | สูงมาก |
| **Cookie Consent Banner** | Consent ก่อนโหลด analytics (Vercel Analytics, Speed Insights) | สูง |
| **Responsive Hooks** | `useIsMobile`, `useIsSmallScreen`, `useIsDesktopOrLarger` | สูงมาก |
| **Dialog Form Pattern** | Fullscreen on mobile สำหรับ form หลายฟิลด์ | สูง |
| **DateRangePicker** | Component เดียวสำหรับ from+to date | สูง |
| **DatePicker / Calendar** | Buddhist year (พ.ศ.) สำหรับ th | สูง (ถ้าระบบต้องใช้ปี พ.ศ.) |
| **RowSelect / AccountCombobox** | Select style สม่ำเสมอในแถว | สูง |
| **Skeleton Loading** | Static structure เหมือน content, Skeleton เฉพาะ dynamic values | สูง |

### 1.3 Domain-Specific — ต้องปรับให้เข้ากับ domain ใหม่

| Feature | คำอธิบาย | วิธี reuse |
|---------|----------|------------|
| **Transaction CRUD** | รายรับรายจ่าย | ปรับเป็น entity หลักของ domain ใหม่ (เช่น Task, Order) |
| **Calendar View** | Day/Month/Year view, backdated entry | ปรับเป็น calendar ของ entity อื่น |
| **Import/Export CSV** | Data Tools | ปรับ schema ของ CSV ให้ตรงกับ entity ใหม่ |
| **Recurring Templates** | WEEKLY, MONTHLY, YEARLY | ปรับเป็น recurring ของ entity อื่น |
| **Budget Management** | Templates, category budgets | ปรับเป็น budget ของ domain ใหม่ |
| **Transfers** | โอนระหว่างบัญชี | ปรับเป็น transfer ของ entity อื่น |
| **Slip OCR** | อัปโหลด slip → draft transaction | ต้องเปลี่ยน model สำหรับ OCR ใหม่ |
| **Credit Card Engine** | รอบบิล, ดอกเบี้ย, ชำระบัตร | เฉพาะ domain การเงิน |

---

## 2. Rules ที่นำไปใช้ซ้ำได้ (Reusable Rules)

### 2.1 ใช้ได้กับโปรเจกต์ใดก็ได้

| Rule | เนื้อหาโดยย่อ | ไฟล์ |
|------|----------------|------|
| **ui-shadcn-base** | ใช้ shadcn/ui เป็น base, ตรวจ shadcn.io ก่อนสร้าง component | `ui-shadcn-base.mdc` |
| **icons-lucide-react** | ใช้ Lucide Icons เท่านั้น | `icons-lucide-react.mdc` |
| **typescript-strict-typing** | ห้าม `any`, กำหนด type ครบ, ใช้ `read_lints` หลังแก้ | `typescript-strict-typing.mdc` |
| **reuse-and-check-references** | ทำ shared component/function, แก้ที่เดียว, เช็ค reference ก่อนแก้ | `reuse-and-check-references.mdc` |
| **agent-learn-from-fixes** | สร้าง rule เมื่อแก้ bug ได้ | `agent-learn-from-fixes.mdc` |
| **dialog-mobile-fullscreen-form** | Dialog form หลายฟิลด์ = fullscreen บนมือถือ | `dialog-mobile-fullscreen-form.mdc` |
| **skeleton-static-structure** | Skeleton ต้องมี static structure เหมือน content | `skeleton-static-structure.mdc` |
| **select-dropdown-consistent-style** | ใช้ RowSelect / component เดียวกันในแถว | `select-dropdown-consistent-style.mdc` |
| **docs-project-documentation** | docs/ เป็นแหล่งรวมเอกสาร, ใช้ INDEX.md | `docs-project-documentation.mdc` |
| **docs-changelog** | แก้ docs/ ต้องอัปเดต PRD_CHANGE_LOG | `docs-changelog.mdc` |

### 2.2 ใช้ได้เมื่อมีเงื่อนไข

| Rule | เงื่อนไข | ไฟล์ |
|------|----------|------|
| **date-range-use-date-range-picker** | เมื่อมี from+to date | `date-range-use-date-range-picker.mdc` |
| **date-time-year-display** | เมื่อต้องแสดงปี พ.ศ./ค.ศ. | `date-time-year-display.mdc` |
| **terminal-windows-powershell** | เมื่อ dev บน Windows | `terminal-windows-powershell.mdc` |
| **build-script-do-not-trigger-prisma-migrate** | เมื่อมี Prisma migrate ใน build script | `build-script-do-not-trigger-prisma-migrate.mdc` |

### 2.3 เฉพาะ Prisma/DB

| Rule | เนื้อหาโดยย่อ | ไฟล์ |
|------|----------------|------|
| **prisma-no-migrate** | ห้ามรัน migrate เอง | `prisma-no-migrate.mdc` |
| **prisma-no-migration-file** | ห้ามสร้าง migration.sql เอง | `prisma-no-migration-file.mdc` |
| **prisma-no-table-map** | (เฉพาะ Prisma) | `prisma-no-table-map.mdc` |
| **prisma-migration-case** | (เฉพาะ Prisma) | `prisma-migration-case.mdc` |

### 2.4 เฉพาะ domain การเงิน

| Rule | เนื้อหาโดยย่อ | ไฟล์ |
|------|----------------|------|
| **transaction-occurred-at-datetime** | occurredAt ต้องมี date+time | `transaction-occurred-at-datetime.mdc` |
| **slip-ocr-engine-fallback** | (เฉพาะ Slip OCR) | `slip-ocr-engine-fallback.mdc` |

---

## 3. Structure ที่นำไปใช้ซ้ำได้ (Reusable Structure)

### 3.1 โครงสร้างโปรเจกต์ (Project Structure)

```
app/
  (auth)/           # sign-in, register, forgot-password, reset-password, verify-email
  (dashboard)/      # protected routes, layout with sidebar + mobile nav
  layout.tsx         # root layout, providers
  page.tsx           # public landing
  releases/         # public changelog
  privacy/          # public privacy policy
  terms/            # public terms

components/
  auth/             # sign-in-form, register-form, forgot-password-form, reset-password-form
  common/           # cookie-consent-banner
  dashboard/        # sidebar, mobile-bottom-nav, app-sidebar
  landing/          # navbar, hero, core-value, feature-grid, footer
  providers/        # i18n-provider, theme
  ui/               # shadcn components

hooks/
  use-mobile.ts     # useIsMobile, useIsSmallScreen, useIsDesktopOrLarger
  use-i18n.ts       # useTranslation, language

lib/
  auth.ts
  activity-log.ts
  validation.ts
  email.ts
  turnstile.ts
  cache.ts
  encryption.ts     # ถ้าต้อง encrypt sensitive data

i18n/
  config.ts
  dictionaries/
  index.ts
```

### 3.2 โครงสร้างเอกสาร (docs/)

```
docs/
  INDEX.md              # แผนที่เอกสาร
  PRD.md                # Source of truth
  PRD_CHANGE_LOG.md     # Changelog ของ docs
  RULE.md               # กฎ docs

  structure/            # สถาปัตยกรรม, เทคนิค
    product-overview.md
    technical-stack.md
    testing-strategy.md
    dashboard-responsive-ui.md
    ui-component-icon-guidelines.md
    date-time-year-display.md
    required_lib.md

  core/                 # ความสามารถข้ามระบบ
    authentication-authorization.md
    activity-log.md
    logging-strategy.md
    caching-strategy.md
    environment-config-strategy.md

  feature/              # ฟีเจอร์ตาม domain
    public-landing-page.md
    help-feedback.md
    privacy-policy.md
    terms-and-conditions.md
    ...
```

### 3.3 Technical Stack ที่นำไปใช้ได้

| หมวด | เทคโนโลยี | หมายเหตุ |
|------|-----------|----------|
| Framework | Next.js | App Router |
| Auth | NextAuth | Credentials + OAuth |
| DB | MySQL (Prisma) | หรือ PostgreSQL, SQLite |
| UI | shadcn/ui + Tailwind | new-york style |
| Icons | lucide-react | |
| Theme | next-themes | Light/Dark/System |
| i18n | Custom dictionary | en, th (ขยายได้) |
| Logging | Winston | File-based, JSON |
| Testing | Jest + Supertest | |
| Bot protection | Cloudflare Turnstile | ส skip บน localhost |

---

## 4. สรุป: สิ่งที่ควรหยิบไปใช้ก่อน

### สำหรับการขึ้นโครงสร้างระบบใหม่

1. **Auth + Session + Activity Log** — พื้นฐานความปลอดภัยและ audit
2. **Dashboard Layout** — Sidebar, mobile nav, responsive hooks
3. **i18n + Theme** — พร้อมภาษาและธีม
4. **docs/ structure** — INDEX, structure/core/feature, PRD_CHANGE_LOG
5. **Rules ที่ใช้ได้ทั่วไป** — ui-shadcn, icons, typescript, reuse, dialog-mobile, skeleton

### สำหรับการขยาย domain

| Domain ใหม่ | ควรหยิบจาก Judtang |
|-------------|---------------------|
| Task/Project Management | Auth, Activity Log, Dashboard Layout, CRUD pattern, Calendar (ปรับ), Import/Export |
| E-commerce / Order | Auth, Session, Activity Log, Help & Feedback, Admin backoffice pattern |
| CRM / Contact | Auth, Activity Log, RowSelect, DateRangePicker, Dialog form pattern |
| Inventory / Stock | Auth, Activity Log, Import/Export CSV, Recurring pattern |

---

## 5. สิ่งที่ต้องปรับเมื่อนำไปใช้

| สิ่งที่นำไป | สิ่งที่ต้องปรับ |
|-------------|-----------------|
| Activity Log | เปลี่ยน entityType, action, details format ให้ตรงกับ domain |
| Help & Feedback | เปลี่ยน category (BUG, FEATURE_REQUEST ฯลฯ) ตามความต้องการ |
| Landing Page | เปลี่ยนเนื้อหา Hero, Core Value, Feature Grid |
| PRD | เปลี่ยน scope, feature list, data model |
| Prisma schema | ลบ/เพิ่ม model ตาม domain ใหม่ |

---

*เอกสารนี้สร้างจากภาพรวมโปรเจกต์ Judtang ณ วันที่วิเคราะห์ — ใช้เป็นแนวทางในการ reuse ไม่ใช่ข้อกำหนดตายตัว*
