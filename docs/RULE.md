# Docs Changelog Rule

When you **create or modify any file** under `docs/`, you **must** update `docs/PRD_CHANGE_LOG.md` in the same change set.

## What to add

Append one entry to `PRD_CHANGE_LOG.md` with:

1. **Date** — use format `DD/MM/YYYY`
2. **List of files changed** — paths relative to repo root (e.g. `docs/feature/task-management.md`)
3. **Brief description** — what was done (e.g. "Added Priority field", "Split PRD into structure/core/feature")

## Example entry

```markdown
## 03/02/2026

- docs/feature/task-management.md — Added field "Priority".
- docs/PRD_CHANGE_LOG.md — Changelog entry for this edit.
```

## Exceptions

- **Only editing `docs/PRD_CHANGE_LOG.md` itself** (e.g. fixing a typo in an existing entry): no need to add another entry for that edit.
- **Creating or editing `docs/RULE.md`**: still add an entry to `PRD_CHANGE_LOG.md` (this file is under `docs/`).

Source of truth for product docs remains [PRD.md](./PRD.md). This rule keeps the changelog in sync with doc changes.
