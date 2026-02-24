# Product Requirements Document (PRD)
## Project: Authentication & Activity Log (scoped solution)

**This document is the authoritative source.** This solution keeps only **Authentication** and **Activity Log** from a larger codebase; other features will be rebuilt as needed. Split documents for maintainability and code generation are in [structure/](structure/), [core/](core/), and [feature/](feature/). See [INDEX.md](INDEX.md) for the mapping.

---

## 1. Overview

This system provides **user authentication** (sign-in, registration, sessions) and an **Activity Log** for auditing critical events.  
It is built on Next.js with NextAuth and a MySQL database, and is intended as a reusable base for solutions that need login and audit trails.

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

- Developers and teams who need a shared login and activity-log baseline.
- Any solution that will add new features on top of Auth and Activity Log.

---

## 7. Feature Scope

### 7.1 Activity Log

Records critical system events for auditing and tracking purposes. See [activity-log.md](core/activity-log.md) for full spec.

**Examples**

- User registered / logged in
- User logged out / session revoked
- Profile or password updated

---

## 8. Authentication & Authorization

### Authentication

- Uses **NextAuth**
- Supports:
  - Email + Password (Credentials)
  - Google OAuth

### User Master

- Stored in MySQL
- Passwords are stored as hashes only
- Google-authenticated users do not have passwords

### Session

- Sessions are stored in the database (Prisma Adapter); see core doc for detail.

### Active Users & Session Metadata

- Active users: supported via heartbeat / lastActiveAt; total users via User table count.
- Per-session metadata (login time, IP, device/User-Agent) is supported; see [core/authentication-authorization.md](core/authentication-authorization.md).

---

## 9. Logging Strategy

### Activity Log (Database)

- Used for business-level events
- Records who did what, where, and when

### System Log (File-based)

- Used for errors, exceptions, and integration failures
- Stored as files within the project
- Uses structured logging (JSON format)

---

## 10. Testing Strategy (Initial)

### Scope

- Focus on Authentication and Core Domain logic
- UI testing is out of scope in the initial phase

### Tools

- Jest
- Supertest
- MySQL test schema

### Focus Areas

- Authentication flow behavior
- User creation and account merging
- Activity log emission
- Error-path logging

---

## 11. Technical Stack (Initial)

- Framework: Next.js
- Authentication: NextAuth
- Database: MySQL (Prisma ORM)
- Logging: Winston (file-based)
- Testing: Jest + Supertest

---

## 12. Open Questions / To Be Defined

- Dashboard overview layout (post-login)
- Future integration with external tools (if any)

---

## 13. MVP Boundary

**MVP Must Have**

- Authentication (Email + Google)
- Activity Log for critical events
- System Log at error level

**MVP Out of Scope**

- Organization / Project / Task management (to be rebuilt as needed)
- Advanced analytics
- Real-time notifications
- Third-party integrations

---

## 14. Cache

### Caching Strategy (Level 1 – Application-Level Cache)

#### Objective

Reduce direct database access and connection pressure on the shared MariaDB instance by leveraging Next.js built-in caching mechanisms.  
This approach aims to improve perceived performance and system stability for an internal tool with low to moderate traffic, without introducing additional infrastructure.

#### Scope

This caching strategy applies to read-only and read-heavy operations only, such as:

- Dashboard summaries
- Task or workflow listings
- Project or pipeline overviews
- Reference or configuration data

Write operations (create/update/delete) are explicitly excluded from caching.

#### Caching Approach

The system will use Next.js application-level caching, including:

- Server Component cache
- `fetch()` cache with revalidate
- React `cache()` utility for database queries

Caching is performed in-memory per deployment instance, managed automatically by the Next.js runtime.

#### Cache Duration

- Default revalidation interval: 30–60 seconds
- Cache duration may vary depending on data volatility
- No long-lived or permanent cache entries are used

This ensures data remains reasonably fresh while significantly reducing redundant database queries.

#### Cache Invalidation

- Cached data is automatically invalidated based on the configured revalidation interval
- Manual cache invalidation is not implemented at this level
- Write operations rely on short cache TTLs rather than explicit invalidation logic
- This design favors simplicity and predictability over aggressive consistency guarantees.

#### Non-Goals

The following are intentionally out of scope for this level of caching:

- Distributed cache (e.g., Redis)
- Per-user or personalized cache
- Complex cache invalidation rules
- Real-time data synchronization
- High-availability or multi-region cache consistency

#### Rationale

Given the system constraints (serverless frontend, shared database, internal usage), application-level caching provides the highest return on investment with minimal operational complexity.

This strategy:

- Reduces database connection churn
- Lowers average response time
- Avoids additional infrastructure dependencies
- Aligns with the expected traffic profile of an internal workflow tool

---

## 15. UI Component & Icon Guidelines

### UI Components

- The project should prioritize using **shadcn/ui** as the primary source for reusable UI components.
- Before creating any custom component, developers should first evaluate whether an existing shadcn component can be used or adapted.
- Custom UI components should only be introduced when requirements cannot be reasonably fulfilled by shadcn/ui.

### Icons

- All icons used in the application must come from **lucide-react** (Lucide Icons).
- Mixing icon libraries is discouraged to ensure visual consistency across the system.
- Custom SVG icons should be avoided unless absolutely necessary and must follow the same visual style as Lucide.

---

## 16. System Logging

### Purpose

System Logging is intended to capture technical and operational events that are not visible from the UI, to support debugging, incident investigation, and system reliability during development and production.

This logging mechanism is not intended for business analytics or user-facing activity tracking.

### Scope

System logs are used to record:

- Application errors and exceptions
- Authentication and authorization failures
- Database connection or query errors
- External integration failures (e.g., OAuth providers)
- Unexpected runtime behavior

Business-level events (e.g., user and session actions) are recorded in the Activity Log (database).

### Log Storage Strategy

- Logs are stored as files within the project environment.
- Directory structure is date-based for easy navigation and rotation:

```
/logs
  /YYYY
    /MM
      /DD
        app.log
        error.log
```

- Logs must not be committed to version control.
- Log files are environment-specific (local / staging / production).

### Log Format

- Logs must be written in structured JSON format.
- Each log entry should include sufficient context for debugging.

**Required fields**

- `timestamp`
- `level` (error, warn, info)
- `service` / `module`
- `action`
- `message`

**Optional fields**

- `requestId`
- `userId` (internal identifier only)
- `errorCode`
- `stackTrace` (error-level only)

### Log Levels

| Level   | Use |
|--------|-----|
| **error** | Unhandled exceptions; authentication failures; database or integration failures |
| **warn**  | Recoverable or degraded behavior |
| **info**  | Minimal operational information (non-noisy) |

### Security & Data Safety

Logs must never contain:

- Passwords
- Access tokens
- Refresh tokens
- Raw OAuth payloads

Personally identifiable or sensitive data must be avoided or masked.

### Tooling (Initial)

- Logging library: Winston
- File-based transports only
- Date-based rotation
- No centralized logging, tracing, or external log aggregation is required in the MVP phase.

### MVP Boundary (System Logging)

**Included**

- Error-level system logging
- File-based storage with date-based structure
- Structured JSON logs

**Excluded**

- Real-time log streaming
- Log analytics dashboard
- External log aggregation services

---

## 17. Environment Variables & Configuration Strategy

### Purpose

This document defines how environment variables and configuration files are used within the system, with the goal of balancing security, maintainability, and developer productivity.

The system prioritizes clear separation between:

- environment-specific values
- application behavior and decisions

### Core Principle

- **Environment variables** store raw values.
- **Configuration files** define system behavior.
- Environment variables must not contain business logic or decision-making rules.

### Environment Variables (.env)

#### Responsibilities

Environment variables are used exclusively for:

- Secrets and credentials
- Environment-specific values
- Infrastructure-related configuration

#### Examples

```
APP_ENV=development
APP_NAME=Personal Workflow Pipeline

DATABASE_URL=mysql://...
NEXTAUTH_SECRET=...

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

LOG_LEVEL=info
LOG_PATH=logs
```

#### What Must NOT Be Stored in .env

- Feature toggles
- Business rules
- Conditional logic
- Behavior switches

**Invalid examples**

```
ENABLE_TASK_MANAGEMENT=true
USE_ADVANCED_LOGGING=false
```

Such decisions must be expressed in configuration files instead.

### Configuration Files (/config)

#### Responsibilities

- Configuration files interpret values from environment variables.
- They define application behavior.
- They act as the single source of truth for system decisions.
- Configuration files are version-controlled and safe to edit for behavior changes.

#### Recommended Structure

```
/config
  app.config.ts
  auth.config.ts
  log.config.ts
```

#### Example: Application Configuration

```ts
export const appConfig = {
  env: process.env.APP_ENV ?? 'development',
  name: process.env.APP_NAME ?? 'PWP',

  features: {
    activityLog: true,
    systemLog: true,
  },
}
```

#### Example: Logging Configuration

```ts
export const logConfig = {
  level: process.env.LOG_LEVEL ?? 'info',
  basePath: process.env.LOG_PATH ?? 'logs',

  format: 'json',
  rotateByDate: true,
}
```

### Server vs Client Environment Variables (Next.js)

#### Server-only Variables

- Must **NOT** use the `NEXT_PUBLIC_` prefix.
- Accessible only in server-side code.
- Used for secrets and internal configuration.

#### Client-exposed Variables

- Must use the `NEXT_PUBLIC_` prefix.
- Should contain non-sensitive values only.
- Usage should be minimized.

### Version Control Rules

- `.env` files must never be committed to version control.
- `.env.example` must be provided and kept up to date.

**Example**

```
DATABASE_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Design Rationale

This strategy allows:

- Fast behavior changes via config files
- Safe handling of secrets
- Clear boundaries between infrastructure and business logic
- Future migration to other environments or platforms without refactoring core logic

### MVP Boundary (Environment & Config)

**Included**

- `.env` for secrets and environment values (no startup validation; use values directly as needed)

**Excluded (for initial phase)**

- Startup validation of environment variables
- Config files (/config) for system behavior — may be introduced later
- Runtime environment mutation
- Dynamic remote configuration services
