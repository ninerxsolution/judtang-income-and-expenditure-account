# Environment Variables & Configuration Strategy

**Updated:** environment-config-strategy (03/02/2026)

**Source:** PRD §17

---

## Purpose

This document defines how environment variables and configuration files are used within the system, with the goal of balancing security, maintainability, and developer productivity.

The system prioritizes clear separation between:

- environment-specific values
- application behavior and decisions

## Core Principle

- **Environment variables** store raw values.
- **Configuration files** define system behavior.
- Environment variables must not contain business logic or decision-making rules.

---

## Environment Variables (.env)

### Responsibilities

Environment variables are used exclusively for:

- Secrets and credentials
- Environment-specific values
- Infrastructure-related configuration

### Examples

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

### What Must NOT Be Stored in .env

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

---

## Configuration Files (/config)

### Responsibilities

- Configuration files interpret values from environment variables.
- They define application behavior.
- They act as the single source of truth for system decisions.
- Configuration files are version-controlled and safe to edit for behavior changes.

### Recommended Structure

```
/config
  app.config.ts
  auth.config.ts
  log.config.ts
```

### Example: Application Configuration

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

### Example: Logging Configuration

```ts
export const logConfig = {
  level: process.env.LOG_LEVEL ?? 'info',
  basePath: process.env.LOG_PATH ?? 'logs',

  format: 'json',
  rotateByDate: true,
}
```

---

## Server vs Client Environment Variables (Next.js)

### Server-only Variables

- Must **NOT** use the `NEXT_PUBLIC_` prefix.
- Accessible only in server-side code.
- Used for secrets and internal configuration.

### Client-exposed Variables

- Must use the `NEXT_PUBLIC_` prefix.
- Should contain non-sensitive values only.
- Usage should be minimized.

---

## Version Control Rules

- `.env` files must never be committed to version control.
- `.env.example` must be provided and kept up to date.

**Example**

```
DATABASE_URL=
NEXTAUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

---

## Design Rationale

This strategy allows:

- Fast behavior changes via config files
- Safe handling of secrets
- Clear boundaries between infrastructure and business logic
- Future migration to other environments or platforms without refactoring core logic

---

## MVP Boundary (Environment & Config)

**Included**

- `.env` for secrets and environment values (no startup validation; use values directly as needed)

**Excluded (for initial phase)**

- Startup validation of environment variables
- Config files (/config) for system behavior — may be introduced later
- Runtime environment mutation
- Dynamic remote configuration services
