# Help & Feedback

**Product:** Judtang Financial Engine  
**Feature:** User Feedback & Admin Backoffice  
**Version:** 1.0  
**Routes:** `/dashboard/settings/feedback`, `/admin/reports`

---

## 1. Overview

A structured in-app feedback system that allows users to submit bug reports and feature requests, with an internal admin backoffice to manage and review submissions.

---

## 2. User-Facing Feature

### 2.1 Navigation

- **Location:** Settings → Help & Feedback
- **Route:** `/dashboard/settings/feedback`
- **Access:** Authenticated users only

### 2.2 Report Form

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Category | Select | Yes | BUG, CALCULATION_ISSUE, DATA_MISMATCH, UI_ISSUE, FEATURE_REQUEST, OTHER |
| Title | Text | Yes | 5–200 characters |
| Description | Textarea | Yes | 10–5000 characters |
| Screenshots | File[] | No | Max 3 images, 2MB each, JPEG/PNG/WebP |

### 2.3 Auto-Captured Metadata

Backend automatically collects: userId, email, route (current page), app version, browser/user-agent, timestamp, IP address.

### 2.4 Anti-Spam

- **Cloudflare Turnstile** — Human verification on the form (skipped on localhost)
- **Rate limiting** — Max 5 reports per user per hour

---

## 3. Data Model

### Report

- `id`, `userId`, `category`, `title`, `description`
- `route`, `appVersion`, `browserInfo`, `ipAddress`
- `status` (OPEN | IN_REVIEW | RESOLVED | CLOSED)
- `imagePaths` (JSON array of stored paths)
- `createdAt`, `updatedAt`

### User Role

- `User.role` added: USER | ADMIN (default: USER)

---

## 4. Admin Backoffice

### 4.1 Routes

- `/admin` — Redirects to `/admin/reports`
- `/admin/reports` — Paginated list, filter by status, search by title/email
- `/admin/reports/[id]` — Detail view, status update, image preview

### 4.2 Access Control

- All `/admin/*` routes require authentication and `role === ADMIN`
- Non-admin users are redirected to `/dashboard`

### 4.3 Root Admin Seeder

- Environment: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- When `ADMIN_EMAIL` and `ADMIN_PASSWORD` are set, seed creates one ADMIN user
- Skips if admin already exists

---

## 5. Email Notification

- On new report: email sent to `ADMIN_REPORT_EMAIL`
- Includes: title, category, user email, description, link to admin detail page

---

## 6. File Storage

- **Path:** `storage/report/image/` (gitignored)
- **Filename:** `{reportId}_{uuid}.{ext}`
- **Serving:** `GET /api/reports/[id]/image/[filename]` (admin only)

---

## 7. APIs

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | /api/reports | User | Create report |
| GET | /api/reports | Admin | List reports (paginated, filter, search) |
| GET | /api/reports/[id] | Admin | Get report detail |
| PATCH | /api/reports/[id] | Admin | Update status |
| GET | /api/reports/[id]/image/[filename] | Admin | Serve report image |

---

## 8. Environment Variables

| Variable | Purpose |
|----------|---------|
| ADMIN_EMAIL | Root admin email for seeder |
| ADMIN_PASSWORD | Root admin password for seeder |
| ADMIN_REPORT_EMAIL | Recipient of report notification emails |
