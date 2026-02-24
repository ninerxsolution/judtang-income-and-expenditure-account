# Logging Strategy

**Updated:** logging-strategy (03/02/2026)

**Source:** PRD §9, System Logging

---

## Activity Log (Database)

- Used for business-level events
- Records who did what, where, and when

## System Log (File-based)

- Used for errors, exceptions, and integration failures
- Stored as files within the project
- Uses structured logging (JSON format)

---

## System Logging (Detailed)

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

Business-level events (e.g., task updates, status changes) are out of scope and should be recorded in the Activity Log (database).

### Log Storage Strategy

- Logs are stored as files within the project environment
- Directory structure is date-based for easy navigation and rotation

```
/logs
  /YYYY
    /MM
      /DD
        app.log
        error.log
```

- Logs must not be committed to version control
- Log files are environment-specific (local / staging / production)

### Log Format

- Logs must be written in structured JSON format
- Each log entry should include sufficient context for debugging

**Required fields**

- timestamp
- level (error, warn, info)
- service / module
- action
- message

**Optional fields**

- requestId
- userId (internal identifier only)
- errorCode
- stackTrace (error-level only)

### Log Levels

- **error** — Unhandled exceptions; authentication failures; database or integration failures
- **warn** — Recoverable or degraded behavior
- **info** — Minimal operational information (non-noisy)

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
