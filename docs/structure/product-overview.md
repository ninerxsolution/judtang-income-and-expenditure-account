# Product Overview

**Updated:** product-overview (02/03/2026)

**Source:** PRD §1–6

---

## 1. Overview

**Judtang Financial Engine** provides **user authentication** (sign-in, registration, sessions) and an **Activity Log** for auditing critical events. It is built on Next.js with NextAuth and a MySQL database, and is intended as a reusable base for solutions that need login and audit trails.

The product includes:

- **Public Landing Page** (`/`) — Product overview, core value, feature grid, entry points (Login, Get Started). Theme and language switchers. User-friendly content in Thai and English.
- **Public Releases Page** (`/releases`) — Changelog for unauthenticated users.
- **Income & Expense tracking** — Multi-account support, credit card management, calendar view, import/export. See [PRD.md](../PRD.md) §18 and [feature/](../feature/).

---

## 2. Purpose (Short)

To enable secure sign-in and registration, session management, and a reliable audit trail (Activity Log) for critical user and session events.

---

## 3. Core Problems

- Users need a single, secure way to sign in (credentials and/or OAuth).
- Critical actions (e.g. login, logout, profile changes) must be auditable.
- Session and active-user visibility support security and support workflows.

---

## 4. Non-goals

- This is not a full workflow or project-management product in this scope.
- Advanced analytics, real-time collaboration, and deep dashboards are out of scope for this baseline.

---

## 5. Success Criteria

- Users can register and sign in (Email + Password and/or Google).
- Session listing and revoke work as specified.
- Activity Log records critical events and is viewable by the user.
- Authentication and session behavior are stable and predictable.

---

## 6. Target Users

- **General users** — People who want to manage personal income and expenses, including credit cards and multiple accounts.
- **Developers and teams** — Who need a shared login and activity-log baseline.
- Any solution that will add new features on top of Auth and Activity Log.
