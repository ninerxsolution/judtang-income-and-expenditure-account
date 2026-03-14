# Documentation Index

**Source of truth:** [PRD.md](./PRD.md)

This index maps the PRD to split documents for maintainability, future expansion, and code generation.

---

## structure/

Architectural and technical conventions.

| Document | Responsibility |
|----------|----------------|
| [product-overview.md](./structure/product-overview.md) | What the product is, purpose, problems, non-goals, success criteria, target users |
| [technical-stack.md](./structure/technical-stack.md) | Initial technology choices |
| [testing-strategy.md](./structure/testing-strategy.md) | Initial testing scope, tools, focus areas |
| [mvp-boundary.md](./structure/mvp-boundary.md) | MVP in-scope and out-of-scope |
| [open-questions.md](./structure/open-questions.md) | Items to be defined |
| [ui-component-icon-guidelines.md](./structure/ui-component-icon-guidelines.md) | shadcn/ui and Lucide usage |
| [date-time-year-display.md](./structure/date-time-year-display.md) | Year display พ.ศ./ค.ศ., formatYearForDisplay, date components |
| [dashboard-responsive-ui.md](./structure/dashboard-responsive-ui.md) | Responsive sidebar, mobile bottom nav, breakpoints, hooks |
| [required_lib.md](./structure/required_lib.md) | Required libraries and tools (runtime, UI, dev/test) |

---

## core/

Cross-cutting system capabilities.

| Document | Responsibility |
|----------|----------------|
| [authentication-authorization.md](./core/authentication-authorization.md) | NextAuth, user storage, credentials |
| [logging-strategy.md](./core/logging-strategy.md) | Activity log vs system log, file-based logging |
| [activity-log.md](./core/activity-log.md) | Business-level audit events |
| [caching-strategy.md](./core/caching-strategy.md) | Application-level cache (Next.js) |
| [environment-config-strategy.md](./core/environment-config-strategy.md) | Environment variables, .env, /config (optional), Next.js server vs client |

---

## feature/

User-facing domain features. **Public Landing Page** (/, /releases) is documented in [feature/public-landing-page.md](./feature/public-landing-page.md). This solution keeps **Authentication** and **Activity Log** as core scope; **Income & Expense** (transactions, calendar, import/export, Data Tools) are implemented and documented in [PRD.md](./PRD.md) §18. **Financial Accounts** (บัญชี, บัตรเครดิต, incomplete validation) are documented in [feature/financial-accounts.md](./feature/financial-accounts.md). **Credit Card Engine** is documented in [feature/credit-card-engine.md](./feature/credit-card-engine.md). **Transaction Categories** (default/custom, CRUD in settings) are documented in [feature/categories.md](./feature/categories.md). **Budget Management** (templates, monthly and category budgets, progress indicators) is documented in [feature/budget-management.md](./feature/budget-management.md). **Transfers** between accounts are documented in [feature/transfers.md](./feature/transfers.md). **Privacy Policy** (/privacy, public, PDPA/GDPR-ready) is documented in [feature/privacy-policy.md](./feature/privacy-policy.md). **Terms & Conditions** (/terms, public) is documented in [feature/terms-and-conditions.md](./feature/terms-and-conditions.md). **Help & Feedback** (report submission, admin backoffice) is documented in [feature/help-feedback.md](./feature/help-feedback.md). **Recurring Transactions** (templates, due by month, confirm as transaction) is documented in [feature/recurring-transactions.md](./feature/recurring-transactions.md). **Slip OCR** (upload bank slips → draft transactions) is documented in [feature/slip-ocr.md](./feature/slip-ocr.md). **In-App Notifications** (notification panel for events and alerts, read/unread, mark all) is documented in [feature/notifications.md](./feature/notifications.md). See [PRD.md](./PRD.md) §7–§8 and [core/](./core/) for Auth and Activity Log.
