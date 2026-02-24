# Testing Strategy (Initial)

**Updated:** 14/02/2026

**Source:** PRD §10

---

## Scope

- Focus on Authentication and Core Domain logic
- UI testing is out of scope in the initial phase

## Tools

- Jest
- Supertest
- MySQL test schema

## Focus Areas

- Authentication flow behavior
- User creation and account merging
- Activity log emission
- Error-path logging

## Authentication unit tests

- **__tests__/app/api/auth/register.test.ts** — POST /api/auth/register (validation, duplicate email, create user, error handling).
- **__tests__/app/api/sessions.test.ts** — GET (list sessions), POST (touch current session), DELETE (revoke one / all / others).
- **__tests__/app/api/users/me.test.ts** — GET /api/users/me (401, 404, 200 with hasPassword), PATCH /api/users/me (401, 400 invalid JSON, 200 update name).
- **__tests__/app/api/users/me/password.test.ts** — PATCH /api/users/me/password (401, 400 missing/short password, 400 OAuth user, 401 wrong current, 200 success).
- **__tests__/auth/auth.test.ts** — Credentials authorize, jwt callback (create/validate UserSession), session callback.
