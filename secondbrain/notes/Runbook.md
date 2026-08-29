---
tags:
  - secondbrain
  - runbook
updated: 2026-08-28
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


## Customer Feedback QR printing

From Admin → เสียงลูกค้า → QR Codes, printable rows offer two formats:

- `A4 แนวนอน` — 297×210 mm landscape poster for an acrylic/frame sign or a sign placed in front of a car.
- `ป้ายเล็ก` — preserves the original compact badge format.

Both formats call the same audited `reveal` API and show the current QR version. After the browser print/save-PDF dialog finishes, confirm success only if the current version was actually printed/saved; that confirmation records `MARK_PRINTED` and clears `needsReprint`. Do not mark printed merely to bypass activation.

For `EMPLOYEE` QR rows, recording public-profile acknowledgement immediately activates the current eligible QR version but intentionally leaves `needsReprint=true`. Opening `A4 แนวนอน` or `ป้ายเล็ก` (`reveal`) also activates an already-approved inactive employee QR before returning the token, so a QR scanned directly from print preview works. Only after the operator confirms a real print/save-PDF does `MARK_PRINTED` record print metadata and clear `needsReprint`. `STATION` QR rows do **not** auto-activate from acknowledgement/reveal/print; they keep the existing manual activation flow.

## Customer Feedback employee survey versions

- New EMPLOYEE resolves use `employee-v2`.
- `employee-v2` adds seven required service-behavior answers: neat appearance, vehicle guidance, greeting, order repeat, special-service offer, thanks, and front-of-car service sign. Values are stored as normalized `YES`, `NO`, or `UNSURE` answers under stable question keys.
- Keep `employee-v1` registered and accepted for already-open visits. Never coerce an old visit/token to v2 during submit or idempotent resolve reuse.
- STATION remains `station-v1`; incident remains `incident-v1`.
- Adding/changing a published behavior meaning requires a new survey version rather than silently reusing a published key.
