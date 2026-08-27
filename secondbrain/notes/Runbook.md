---
tags:
  - secondbrain
  - runbook
updated: 2026-08-27
---

# Runbook

## Repository

Project path:

`/Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack`

Main branch: `main`

Remote used in latest session: `origin/main`

## Before editing

1. Read root `AGENTS.md`.
2. Check `git status --short --branch`.
3. Preserve unrelated local changes.
4. Read [[Decisions]] before changing payroll/business rules.
5. Prefer shared calculation modules over API/UI-local formulas.

## Common verification

```bash
npm run test:run
npx tsc --noEmit
npm run build
```

For payroll-rule work, also run targeted tests around:

- `src/lib/__tests__/station-pay-rules.test.ts`
- `src/lib/__tests__/payroll-station-rules.test.ts`
- `src/lib/__tests__/payroll-calculation.test.ts`

## Known build issue as of 2026-08-26

Latest full build:

- Compilation passed.
- TypeScript passed.
- Static generation later failed on unrelated pages:
  - `/feedback/privacy`
  - `/apply/status`
- Failure seen: `TypeError: Cannot read properties of null (reading 'useState')` during prerender.

Do not attribute this existing prerender failure to station payroll changes unless new evidence shows otherwise.

## Mandatory Second Brain maintenance

Every project change must be logged before the work is considered complete.

For each change:

1. Add a dated section to [[Session-Log]] describing what changed and why.
2. Record important files/areas touched.
3. Record verification/test results, including skipped checks and why.
4. Record open risks/follow-ups.
5. Add commit hash once available.
6. Update [[Decisions]] for durable business/architecture decisions.
7. Update [[Architecture]] when flows/source-of-truth structure changes.
8. Update [[Backlog]] for unresolved work.
9. Update this Runbook when commands/operations/recovery workflow changes.
10. Update `00-Start-Here.md` when the important current state changes.

Before committing code/config/rules, verify the relevant Second Brain files are included in the same commit or explicitly follow immediately in the same session.
