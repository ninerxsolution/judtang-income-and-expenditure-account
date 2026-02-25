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

User-facing domain features. This solution keeps **Authentication** and **Activity Log** as core scope; **Income & Expense** (transactions, calendar, import/export, Data Tools) are implemented and documented in [PRD.md](./PRD.md) §18. No separate feature docs under feature/ for the current scope — see [PRD.md](./PRD.md) §7–§8 and [core/](./core/) for Auth and Activity Log.
