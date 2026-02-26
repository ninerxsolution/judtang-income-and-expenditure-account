# PRD / Docs Changelog

All notable changes to docs (PRD and split documents) are recorded here.  
**Rule:** Any edit under `docs/` must add an entry here. See [RULE.md](./RULE.md).

---

## 26/02/2026

- docs/PRD.md — §18.4: Transaction CRUD changed from full-page to modal/dialog. List merged into `/dashboard/transactions` (removed `/list` route). Create/Edit use TransactionFormDialog; Delete uses TransactionDeleteDialog. Calendar Add/Edit/Delete open modals in-page.
- docs/PRD_CHANGE_LOG.md — Changelog entry for transaction modal UX.
- docs/PRD.md — §18: Added 18.3.8 Single Transaction (GET/PATCH/DELETE /api/transactions/[id]), 18.3.9 Summary (GET /api/transactions/summary); List API 18.3.2 extended with `type` query param; 18.4.1 New/Edit Transaction (edit mode with ?id=); 18.4.2 List filters (from, to, type), pagination, Edit/Delete per row; Calendar day modal Edit/Delete; Dashboard summary cards; Data Tools export filters (from, to, type). Implementation of missing income/expense features per plan.
- docs/PRD.md — §18: (earlier) Added 18.3.6 Export, 18.3.7 Import, 18.4.4 Data Tools to match implementation.
- docs/core/activity-log.md — entityType extended with `transaction`; actions extended with TRANSACTION_CREATED, TRANSACTION_UPDATED, TRANSACTION_DELETED, TRANSACTION_EXPORT, TRANSACTION_IMPORT; details format for export/import; UI path corrected to /dashboard/settings/activity-log (via Settings).
- docs/INDEX.md — feature section updated to mention Income & Expense (PRD §18).
- docs/structure/mvp-boundary.md — Note added that current implementation includes Income & Expense + Data Tools (PRD §18), not MVP must-have.
- docs/PRD_CHANGE_LOG.md — Changelog entry for docs sync and §18 feature updates.

---

## 24/02/2026

- docs/feature/organization-management.md, docs/feature/project-management.md, docs/feature/task-management.md, docs/feature/data-center.md, docs/feature/note-management.md, docs/feature/conclusion.md — Removed (feature docs out of scope).
- docs/prd_summary_for_commu/summary_app_prd_pwp.md — Removed; folder prd_summary_for_commu removed.
- docs/INDEX.md — Feature section updated: only Authentication and Activity Log in scope; no separate feature docs for current scope.
- docs/PRD.md — Scoped to Authentication and Activity Log: §1–§6 rewritten; §7 only Activity Log (§7.1); §12 Open Questions and §13 MVP Boundary updated.
- docs/structure/product-overview.md — Aligned with Auth + Activity Log scope.
- docs/structure/mvp-boundary.md — MVP Must Have: Auth, Activity Log, System Log; Org/Project/Task moved to Out of Scope.
- docs/structure/open-questions.md — Updated to current scope (dashboard layout, future integrations).
- docs/core/activity-log.md — entityType and actions limited to user and session; examples updated.
- docs/PRD_CHANGE_LOG.md — Changelog entry for docs clean (Auth + Activity Log only).
 - docs/PRD.md — Added §18 Income & Expense Transactions & Calendar (data model, APIs, and UI behaviour) to document the current income/expense + calendar implementation.
 - docs/structure/product-overview.md — Noted the presence of a lightweight Income & Expense tracker with calendar view in the current implementation.
 - docs/PRD_CHANGE_LOG.md — Changelog entry for income/expense calendar docs update.

---

## 22/02/2026

- prisma/seed.ts — Seed extended with Note and Conclusion: org-level notes (Acme, Beta), project-level notes (Website Revamp, Mobile App Pilot), task-level notes (Design new wireframes); conclusions on notes. Idempotent: skips when org/project already has notes.
- docs/feature/note-management.md — Note Management implementation: data model (Note), association with org/project/task, API (list/create under org, project, task; get/patch/delete note under org), UI (org/project/task notes pages, note detail page).
- docs/feature/conclusion.md — Conclusion implementation: data model (Conclusion, type enum NEW_TASK/MA/CR/KEY_DECISION), API under note (list/create/patch/delete), UI on note detail page.
- docs/core/activity-log.md — Activity Log: entityType note, conclusion; actions NOTE_CREATED, NOTE_UPDATED, NOTE_DELETED, CONCLUSION_CREATED, CONCLUSION_UPDATED, CONCLUSION_DELETED.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Note Management, Conclusion, and seed.

---

## 21/02/2026

- docs/core/activity-log.md — Activity Log implementation: data model (ActivityLog), action list, API GET /api/activity-log with filters, UI at /dashboard/activity-log (read-only list + filters). Emit from register, sign-in, org/project/task APIs.
- docs/core/activity-log.md — Richer Activity Log: details format (create/delete/restore/update with changes array), API returns userDisplayName (who), UI shows "By: …" and formatted details (Deleted/Restored, field from→to).
- docs/core/activity-log.md — UI: "By" and each detail item displayed on separate lines for readability.
- docs/core/activity-log.md — Activity Log for session revoke and user actions: entityType session, SESSION_REVOKED (details.scope), USER_PROFILE_UPDATED, USER_PASSWORD_CHANGED; emitted from /api/sessions DELETE, /api/users/me PATCH, /api/users/me/password PATCH.
- docs/core/activity-log.md — Activity Log for logout: USER_LOGGED_OUT; recorded via POST /api/auth/logout (client calls before signOut).
- docs/PRD_CHANGE_LOG.md — Changelog entry for Activity Log docs update.

---

## 14/02/2026

- docs/feature/project-management.md — Clarified implementation from PRD: Project fields (name, description, thumbnail image URL, start/end due dates, status); Project Management backend and dashboard-level behavior implemented for Org → Projects, including trash/restore semantics aligned with Organizations.
- docs/feature/organization-management.md — Updated: Key data to contact list (OrganizationContact, at least one), slug, delete behaviour (move to trash, restore, permanent delete); added API and UI summary.
- docs/PRD.md — Updated: §7.1 Organization Management; Key Data aligned with contact list, slug, trash; link to feature doc.
- docs/PRD_CHANGE_LOG.md — Changelog entry for Organization docs sync.
- docs/core/authentication-authorization.md — Added: Validation section (email format/length/normalize, password min 8 max 72); register and change-password use lib/validation.
- docs/core/authentication-authorization.md — Updated: Session revoke is soft delete (UserSession.revokedAt); list/touch filter by revokedAt null; /api/sessions DELETE sets revokedAt instead of deleting rows.
- docs/core/authentication-authorization.md — Added: /api/users/me (GET profile, PATCH name), /api/users/me/password (PATCH), User profile page (/dashboard/user) and dashboard nav.
- docs/structure/testing-strategy.md — Added: users/me and users/me/password API test coverage.
- docs/core/authentication-authorization.md — Updated: Session strategy (JWT + UserSession table), Session metadata (userAgent/ipAddress via touch + GET), /api/sessions APIs (GET, POST, DELETE), Route protection (JWT).
- docs/structure/testing-strategy.md — Added: Authentication unit tests coverage (register, sessions GET/POST/DELETE, auth callbacks).
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.
- docs/core/authentication-authorization.md — Added: Route protection (proxy.ts); Guard deferred.
- docs/core/authentication-authorization.md — Added: Session strategy (DB, Prisma Adapter), Active users (heartbeat/lastActiveAt), Session metadata (IP, userAgent, createdAt).
- docs/PRD.md — Updated: §8 Authentication; added Session, Active users & Session metadata bullets; link to core auth doc.
- docs/structure/required_lib.md — Updated: Auth row to include @auth/prisma-adapter for DB session.
- docs/prd_summary_for_commu/summary_app_prd_pwp.md — Updated: Authentication section; session storage, active users, session metadata.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.

---

## 03/02/2026

- docs/PRD.md — Updated: §17 MVP Boundary; removed startup validation; use .env only for initial phase; /config optional for later.
- docs/core/environment-config-strategy.md — Updated: removed Validation & Fail-fast Strategy; MVP Boundary aligned (no validation, /config excluded for initial phase).
- docs/INDEX.md — Updated: environment-config-strategy description (validation removed, /config optional).
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Updated: §11 Technical Stack; Database now specified as MySQL (Prisma ORM).
- docs/structure/technical-stack.md — Updated: Stack to use Prisma ORM for MySQL.
- docs/structure/required_lib.md — Updated: Database lib from MySQL to Prisma (@prisma/client, prisma dev).
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Added: §17 Environment Variables & Configuration Strategy (purpose, .env, /config, Next.js server/client, validation, version control, MVP).
- docs/core/environment-config-strategy.md — Added: split doc for environment & config strategy.
- docs/INDEX.md — Added: link to environment-config-strategy.md.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/structure/required_lib.md — Added: required libraries doc (runtime, UI, dev/test); complements technical-stack.
- docs/INDEX.md — Added: link to required_lib.md.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Reformatted: ใช้ Markdown ครบ (หัวข้อ ##/###/####, รายการ -, code block, ตาราง); §14 Cache, §15 UI Guidelines, §16 System Logging และหัวข้อ/รายการทั่วทั้งเอกสาร.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/PRD.md — Added: System Logging section (purpose, scope, storage, format, levels, security, tooling, MVP boundary).
- docs/core/logging-strategy.md — Synced: new System Logging content from PRD.
- docs/PRD_CHANGE_LOG.md — This entry.
- docs/structure/*.md, docs/core/*.md, docs/feature/*.md — **Updated:** ใช้เฉพาะวันที่ (DD/MM/YYYY), ลบเวลาในทุกเอกสารและใน RULE.
- docs/RULE.md, .cursor/rules/docs-changelog.mdc — Format ช่อง changelog เป็นวันที่อย่างเดียว.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.
- docs/RULE.md — Added: rule to update PRD_CHANGE_LOG whenever docs are edited.
- docs/PRD_CHANGE_LOG.md — Added: changelog file and this entry.
- .cursor/rules/docs-changelog.mdc — Added: Cursor rule for docs changelog (globs: docs/**).

<!-- Entries below, newest first by date -->
