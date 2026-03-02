# Required Libraries

**Updated:** 14/02/2026

**Source:** Complements [technical-stack.md](./technical-stack.md); exact versions in `package.json`.

---

This document lists required libraries and tools for the project. Use it for onboarding and code generation; keep in sync with `package.json` and PRD.

---

## Runtime / Application

| Purpose       | Library / stack | Note                    |
|---------------|------------------|-------------------------|
| Framework     | Next.js          | See PRD §11             |
| Auth          | NextAuth + @auth/prisma-adapter | Email + Password, Google OAuth; DB session via Prisma Adapter |
| Database      | Prisma           | ORM for MySQL; @prisma/client + prisma (dev). User data, Activity Log |
| Logging (file)| Winston          | Structured JSON, date-based dirs |
| Analytics     | @vercel/analytics | Vercel Web Analytics for anonymous page views |

---

## UI

| Purpose    | Library     | Note                          |
|------------|-------------|-------------------------------|
| Components | shadcn/ui   | Primary source; see UI guidelines |
| Icons      | lucide-react| Only icon library; see UI guidelines |

---

## Development & Test

| Purpose   | Library / tool | Note              |
|-----------|-----------------|-------------------|
| Language  | TypeScript      |                   |
| Testing   | Jest + Supertest| Auth & domain; see testing-strategy.md |
| Lint      | ESLint (Next)   |                   |

---

## Version policy

- **Runtime:** Prefer versions pinned in `package.json`; align major versions with PRD/technical-stack.
- **New libs:** Document here and in technical-stack (or PRD) when adding; update `package.json` and this file together.
