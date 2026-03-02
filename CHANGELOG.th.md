# Changelog (TH)

รูปแบบ: `# vMAJOR.MINOR.PATCH - YYYY-MM-DD` จากนั้น `## Section` (Added, Changed, Fixed, Removed, Breaking, Migration).

---

# v0.1.0 - 2026-02-03

## Added

- เอกสาร PRD และเอกสารย่อย (structure/, core/, feature/).
- แนวทาง environment variables และ configuration (.env, /config แบบเสริม, ขอบเขต MVP).
- กลยุทธ์ System Logging (เขียนลงไฟล์, Winston, JSON format).
- เอกสาร required_lib และ technical stack (Next.js, NextAuth, MySQL/Prisma).
- กติกา docs changelog: PRD_CHANGE_LOG.md; Cursor rule สำหรับ docs/**.

## Changed

- ปรับรูปแบบ PRD ให้ใช้ Markdown เต็มรูปแบบ.
- ขอบเขต MVP: Environment & config — ไม่ทำ startup validation; ใช้ .env เป็นหลักช่วงแรก.

---

# v0.2.0 - 2026-02-14

## Added

- Session strategy: JWT + UserSession table (Prisma Adapter); session metadata (userAgent, ipAddress via touch).
- Active users: heartbeat, lastActiveAt; session list และ revoke (GET/POST/DELETE /api/sessions).
- User profile: GET/PATCH /api/users/me (name); PATCH /api/users/me/password; หน้า profile (/dashboard/me) และ dashboard nav.
- Route protection (proxy); session revoke เป็น soft delete (UserSession.revokedAt).
- Validation: รูปแบบ email/ความยาว/normalize, รหัสผ่านขั้นต่ำ 8 สูงสุด 72 (register, change-password); lib/validation.
- Testing strategy: users/me และ users/me/password API tests; auth unit tests.

## Changed

- Session revoke: list/touch กรองด้วย revokedAt null; DELETE ตั้ง revokedAt แทนการลบแถว.

---

# v0.3.0 - 2026-02-21

## Added

- Activity Log: data model (ActivityLog), รายการ action, API GET /api/activity-log พร้อม filters.
- Activity Log UI ที่ /dashboard/settings/activity-log (รายการอ่านอย่างเดียว + filters).
- Emit จาก register, sign-in, org/project/task APIs; รูปแบบ details (create/delete/restore/update พร้อม changes array).
- API คืน userDisplayName; UI แสดง "By: …" และ details ที่จัดรูปแบบ.
- Entity types และ actions: user, session; SESSION_REVOKED, USER_PROFILE_UPDATED, USER_PASSWORD_CHANGED, USER_LOGGED_OUT.
- Emit จาก /api/sessions DELETE, /api/users/me PATCH, /api/users/me/password PATCH; USER_LOGGED_OUT ผ่าน POST /api/auth/logout.

---

# v0.4.0 - 2026-02-24

## Added

- PRD §18 Income & Expense: data model (Transaction), APIs, พฤติกรรม UI (transactions, calendar, data tools).
- Product overview: lightweight Income & Expense tracker พร้อม calendar view เอกสารแล้ว.

## Changed

- Scope: Auth + Activity Log เท่านั้น; Organization/Project/Task/Note/Conclusion ย้ายออกจาก scope.
- MVP Boundary: Auth, Activity Log, System Log อยู่ใน scope; Org/Project/Task อยู่นอก scope.
- INDEX.md feature section: เฉพาะ Authentication และ Activity Log; Income & Expense ระบุใน PRD §18.

## Removed

- Feature docs: organization-management, project-management, task-management, data-center, note-management, conclusion; โฟลเดอร์ prd_summary_for_commu.

---

# v0.5.0 - 2026-02-26

## Added

- Transaction CRUD ผ่าน modal/dialog; list รวมเข้ากับ /dashboard/transactions (ลบ route /list).
- Create/Edit: TransactionFormDialog; Delete: TransactionDeleteDialog; calendar day modal Add/Edit/Delete ในหน้า.
- APIs: GET/PATCH/DELETE /api/transactions/[id]; GET /api/transactions/summary; list API ขยายด้วย `type` query param.
- List filters (from, to, type), pagination, Edit/Delete ต่อแถว; Data Tools export filters (from, to, type).
- Dashboard summary cards; calendar day modal Edit/Delete.
- Activity Log: entityType transaction; TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED, TRANSACTION_EXPORT, TRANSACTION_IMPORT.
- Activity Log UI path: /dashboard/settings/activity-log (ผ่าน Settings).

---

# v0.6.0 - 2026-02-26

## Added

- Forgot password: POST /api/auth/forgot-password; SMTP config, token storage; หน้า /forgot-password.
- Reset password: POST /api/auth/reset-password; หน้า /reset-password; ความปลอดภัยและ token handling.
- Activity Log: USER_PASSWORD_RESET_REQUESTED (เอกสารแล้ว).

---

# v0.7.0 - 2026-02-26

## Added

- Email verification: soft policy, flow, token storage; GET /api/auth/verify-email, POST /api/auth/resend-verification.
- หน้า /verify-email; หน้า profile แสดงสถานะ verification และปุ่ม resend.
- /api/users/me คืน emailVerified; register ส่ง verification email; Google OAuth ตั้ง emailVerified.
- Activity Log: USER_EMAIL_VERIFIED.

---

# v0.8.0 - 2026-03-01

## Added

- Credit Card Engine: data model (Transaction status/postedDate/statementId, CreditCardStatement), core logic (outstanding, available credit, expense/payment flow, statement closing).
- FinancialAccount สำหรับ CREDIT_CARD: creditLimit, statementClosingDay, dueDay, currentOutstanding, availableCredit, interestRate, interestCalculatedUntil, cardType, bankName, accountNumber.
- Thai banks dropdown; accountNumber/bank number แสดงแบบ masked บนหน้ารายการบัญชีและ credit card payment dialog.
- interestRate (%) และ cardType (credit, debit, visa, master, jcb, amex, unionpay, truemoney, other).
- Payment API และ validation (incomplete account, from-account); recordPayment พร้อม fromAccountId (EXPENSE บน from-account).

## Changed

- FinancialAccount schema: bankName, accountNumber, interestRate, cardType; isAccountIncomplete checks.

## Migration

- รัน prisma migrate deploy ถ้า schema เปลี่ยน.

---

# v0.9.0 - 2026-03-01

## Added

- Transaction Categories: default/custom, isDefault, CRUD ใน settings; ensureUserHasDefaultCategories.
- Activity Log: FINANCIAL_ACCOUNT_CREATED, FINANCIAL_ACCOUNT_UPDATED, FINANCIAL_ACCOUNT_DISABLED; entityType financialAccount.
- Activity Log: TRANSACTION_UPDATED details พร้อม `changes` array (field, from, to) สำหรับ type, amount, category, date, account.
- หน้า Activity log: financialAccount entity type, actions, formatDetails สำหรับ transaction update และ account changes.
- Financial Accounts: isHidden บน FinancialAccount; ซ่อน/แสดง default account ใน UI; DELETE endpoint (soft/hard delete).
- Activity Log: FINANCIAL_ACCOUNT_DELETED; เมนู delete + AlertDialog บนหน้ารายการบัญชี.
- Transaction form: กรอง isHidden ออกจาก account dropdown.

## Changed

- ensureUserHasDefaultFinancialAccount และ getDefaultFinancialAccount กรองด้วย isHidden.
- GET /api/financial-accounts คืน isHidden, transactionCount; กรอง isActive.

## Migration

- รัน prisma migrate deploy สำหรับ isHidden.

---

# v0.10.0 - 2026-03-01

## Added

- ประเภท Transaction TRANSFER ระหว่างบัญชี: transferAccountId และ transferAccount relation บน Transaction.
- getAccountBalance รวม TRANSFER (out -amount, in +amount).
- createTransaction, updateTransaction, listTransactionsByUser รองรับ transferAccountId; list ใช้ OR สำหรับ account filter.
- POST /api/transactions ตรวจและรับ transferAccountId สำหรับ TRANSFER; GET/PATCH คืน transferAccountId, transferAccount.
- Export/import กรองตาม account รวม transferAccountId (OR); CSV import รองรับ TRANSFER และ transferAccountId.
- Transaction form: ประเภท TRANSFER, dropdown from/to account; หน้า transactions: filter TRANSFER, badge, แสดงผล.

## Migration

- รัน prisma migrate deploy สำหรับ transferAccountId.

---

# v0.11.0 - 2026-03-02

## Added

- Application-level cache: lib/cache.ts (revalidate 45s, cacheKey helper, re-export unstable_cache).
- unstable_cache บน GET: transactions (list, summary, calendar-summary, month-summary, year-summary), financial-accounts, categories, users/me.
- Cache invalidation: revalidateTag จาก next/cache; tags บน cached routes.
- revalidateTag("transactions") บน transactions POST, PATCH, DELETE, import; credit-card payment.
- revalidateTag บน financial-accounts create, update, delete, disable, restore; categories create, update, delete; users/me PATCH.
- docs/core/caching-strategy.md: ส่วน implementation และ invalidation.

---

# v1.0.0 - 2026-03-02

## Added

- หน้า Release Notes / Patch Note ที่ /dashboard/settings/patch-note (CHANGELOG.md เป็น single source of truth).
- lib/changelog.ts: parseChangelog, getChangelogVersions (อ่านตอน build); react-markdown + remark-gfm สำหรับ render.
- ส่วน Breaking และ Migration แยกสไตล์ชัดเจน; empty state เมื่อไม่มีไฟล์หรือไม่มี versions.
- ลิงก์ Settings ไป patch notes; i18n: settings.information.patchNote, settings.patchNote.title/empty/noReleases (en/th).
- Breadcrumb labels สำหรับ settings และ patch-note.

---

# v1.1.0 - 2026-03-02

## Added

- หน้า Public Product Landing ที่ `/`: Navbar, Hero, Core Value, Feature Grid, Engine, CTA, Footer.
- หน้า Releases ที่ `/releases` (changelog สำหรับผู้ใช้ที่ยังไม่ล็อกอิน).
- Theme switcher ใน navbar (สว่าง / มืด / ตามระบบ).
- Language switcher ใน navbar (ไทย / English).
- Landing components: landing-navbar, landing-hero, landing-core-value, landing-feature-grid, landing-engine, landing-cta, landing-footer.
- i18n: home.nav, home.hero, home.coreValue, home.features, home.engine, home.cta, home.footer (theme, language, เนื้อหาเข้าใจง่าย).

## Changed

- หน้าแรกเปลี่ยนจาก card ธรรมดาเป็น landing page เต็มรูปแบบ.
- เนื้อหา landing ทั้งหมดแปลเป็นภาษาที่เข้าใจง่าย (ไม่ใช้ศัพท์เทคนิค) สำหรับผู้ใช้ทั่วไป.

---

# v1.2.0 - 2026-03-02

## Added

- Dashboard Performance Optimization: ลดจำนวน HTTP requests บนหน้า Dashboard.
- GET /api/dashboard/init: Batch API รวม user, summary, appInfo, recentTransactions ใน response เดียว.
- DashboardDataContext + DashboardDataProvider: share ข้อมูลระหว่าง sidebar กับหน้า dashboard.
- TransactionsList รองรับ prop `initialData` เพื่อใช้ข้อมูลจาก context โดยไม่ fetch ซ้ำ.

## Changed

- AppSidebar ใช้ useDashboardData() แทน fetch แยก (users/me, summary, app-info).
- Dashboard page ใช้ useDashboardData() แทน fetch summary เอง.
- revalidateTag("dashboard-init") ใน mutation routes (transactions, financial-accounts, credit-card payment, users/me).
- TransactionsCalendar เรียก refreshDashboard() หลัง create/update/delete transaction.
- docs/core/caching-strategy.md: เพิ่ม dashboard-init route และ tag.

---