---
name: docs-update-workflow
description: Documentation update workflow for Judtang — when and how to update docs/, which file to edit for each type of change, and the required PRD_CHANGE_LOG.md entry. Use when adding a new feature, changing existing behavior, updating architecture decisions, or modifying any file under docs/.
---

# Docs Update Workflow

## Rule: always update PRD_CHANGE_LOG.md

Any time you **create or modify** a file under `docs/`, you must add an entry to `docs/PRD_CHANGE_LOG.md` in the same change.

```markdown
## 06/05/2026

- docs/feature/my-feature.md — Added new feature spec.
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.
```

Format: `DD/MM/YYYY` date, list of files changed with brief description.  
Exception: editing only `PRD_CHANGE_LOG.md` itself does not require a new entry.

## Which file to update

| Change type | File to update |
|-------------|---------------|
| New feature | Create `docs/feature/<feature-name>.md`, update `docs/INDEX.md` summary |
| Existing feature behavior change | Edit the relevant `docs/feature/<name>.md` |
| Architecture / tech stack change | `docs/structure/technical-stack.md` |
| New API route or changed API contract | Relevant feature doc + `docs/structure/project-status.md` if needed |
| New environment variable | `docs/core/environment-config-strategy.md` |
| Auth flow change | `docs/core/authentication-authorization.md` |
| Cache strategy change | `docs/core/caching-strategy.md` |
| Activity log new event | `docs/core/activity-log.md` |
| UI component convention change | `docs/structure/ui-component-icon-guidelines.md` |
| Date/time display change | `docs/structure/date-time-year-display.md` |
| Responsive layout change | `docs/structure/dashboard-responsive-ui.md` |

## Feature doc structure (new feature)

```markdown
# Feature Name

## Overview
[What it does, why it exists]

## Data Model
[New fields or tables if any]

## Core Logic
[Business rules, formulas, constraints]

## APIs
| Endpoint | Method | Purpose |

## UI / UX
[Key components, flows]

## Validation Rules
[What's allowed / rejected]

## Out of Scope (v1)
[Explicitly deferred items]
```

## Updating INDEX.md

When adding a new feature doc, append it to the feature list in `docs/INDEX.md`:

```markdown
**My Feature** (brief description) is documented in [feature/my-feature.md](./feature/my-feature.md).
```

## PRD.md

`docs/PRD.md` is the source of truth and master document. Feature docs are split-outs for maintainability. Major new features should be summarized in PRD.md §18 (or the relevant section) and expanded in the feature doc.

## Checklist when adding a new feature

- [ ] Created `docs/feature/<feature-name>.md`
- [ ] Updated `docs/INDEX.md` with link and summary
- [ ] Added entry to `docs/PRD_CHANGE_LOG.md`
- [ ] Updated `docs/PRD.md` if the feature changes a major section
