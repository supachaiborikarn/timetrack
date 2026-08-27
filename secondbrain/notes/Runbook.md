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

1. Check `git status --short --branch`.
2. Preserve unrelated local changes.
3. Read [[Decisions]] before changing payroll/business rules.
4. Prefer shared calculation modules over API/UI-local formulas.

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

## Second Brain maintenance

After meaningful work:

- Add a dated section to [[Session-Log]].
- Update [[Decisions]] for durable business/architecture decisions.
- Update [[Backlog]] for unresolved work.
- Include commit hash and verification results when available.
