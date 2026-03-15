# Technical Stack

**Updated:** technical-stack (02/03/2026)

**Source:** PRD §11

---

## Stack

- Framework: Next.js
- Authentication: NextAuth
- Database: MySQL (Prisma ORM)
- Analytics: Vercel Web Analytics (`@vercel/analytics/next`), Vercel Speed Insights (`@vercel/speed-insights/next`); loaded conditionally only after user consents via cookie banner
- Logging: Winston (file-based)
- Testing: Jest + Supertest
- Theme: next-themes (Light / Dark / System)
- i18n: Custom dictionary-based (en, th); cookie + localStorage
