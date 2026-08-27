---
tags:
  - secondbrain
  - session-log
updated: 2026-08-27
---

# Session Log

## 2026-08-26 — Station OT and early-leave payroll rules

Goal:

Implement station-specific OT calculation and a flat deduction when employees complete a day below the required hours.

Business rules implemented:

- วัชรเกียรติ (`WKO`) / พงษ์อนันต์ (`PAP`) and `PAP_GAS`: threshold 10.5h.
- ศุภชัย (`SPC`) and `SPC_GAS`: threshold 11h.
- Above threshold: excess hours × 35 THB/hour.
- Below threshold on completed shift: -50 THB flat.
- Exactly threshold: zero OT and zero early-leave deduction.
- No checkout/incomplete shift: no early-leave deduction.
- Fractional OT is proportional, e.g. 0.5h = 17.50 THB.
- HR OT override remains authoritative.

Implementation:

- Added shared rule module `src/lib/station-pay-rules.ts`.
- Integrated rule into `src/lib/payroll-calculation.ts`.
- `src/lib/payroll-service.ts` now supplies station code to payroll calculation.
- Added `earlyLeavePenalty` to daily/period calculation results.
- Updated Admin Payroll, employee daily payroll detail, Wallet, reports, exports, accounting output, and payroll finalization to use the shared result.
- Admin Attendance display now uses the station-rule OT hours for affected stations/effective dates instead of displaying the legacy 8-hour OT figure.
- Early-leave deduction is displayed separately from late penalty.
- New rules are effective from `2026-08-26` to avoid changing historical payroll periods.

Tests added:

- `src/lib/__tests__/station-pay-rules.test.ts`
- `src/lib/__tests__/payroll-station-rules.test.ts`

Verification:

- Targeted payroll tests: 19/19 passed.
- Full Vitest suite: 355/355 passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: compile and TypeScript passed, then unrelated prerender failure occurred on `/feedback/privacy` and `/apply/status` with `useState` null.

Git:

- Commit: `7f37013`
- Message: `Add station-based OT and early leave rules`
- Pushed: `main -> origin/main`

## 2026-08-27 — Created timetrack Second Brain

Created persistent project memory under `secondbrain/` based on the established Second Brain pattern used by other local projects.

Captured:

- Project overview and station codes.
- Payroll architecture and source-of-truth flow.
- Durable OT/early-leave business decisions.
- Runbook and verification workflow.
- Known build issue and follow-up backlog.
- Full retrospective log of the 2026-08-26 payroll change.

Git:

- Commit: `edda4b7`
- Message: `Add timetrack second brain`
- Pushed: `main -> origin/main`

## 2026-08-27 — Made Second Brain logging mandatory

User established a permanent project rule: **any project change must be recorded in Second Brain every time**.

Implementation:

- Added the rule to root `AGENTS.md` so AI agents encounter it as a project-level instruction.
- Added a concise reminder to `CLAUDE.md`.
- Strengthened `secondbrain/README.md`, `00-Start-Here.md`, and `notes/Runbook.md` from “meaningful changes” to **every change**.
- Defined the minimum required log content: what/why, important files, decisions, verification, risks/follow-ups, and commit hash when available.
- Defined which durable notes must also be updated when applicable: Decisions, Architecture, Runbook, Backlog, and Start Here.
- Explicitly states that a code/config/business-rule change without a Second Brain update is incomplete work.

Verification:

- Documentation/instruction-only change; no application test suite required.
- Git diff/status reviewed before commit.
