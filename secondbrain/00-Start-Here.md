---
tags:
  - secondbrain
  - timetrack
updated: 2026-08-27
---

# timetrack — Start Here

## Current state

`timetrack` is the HR / attendance / payroll system for the station businesses. The application is built with Next.js, TypeScript, Prisma, and Vitest.

Latest important payroll change:

- Commit `7f37013` — `Add station-based OT and early leave rules`
- Pushed to `origin/main` on 2026-08-26.
- New rules take effect from `2026-08-26` onward.

## Read first for payroll work

- [[notes/Decisions]]
- [[notes/Architecture]]
- [[notes/Runbook]]
- [[notes/Session-Log]]

## Current payroll rule snapshot

- วัชรเกียรติ (`WKO`) / พงษ์อนันต์ (`PAP`) and related gas branches: threshold 10.5 hours.
- ศุภชัย (`SPC`) and related gas branch: threshold 11 hours.
- Work above threshold: OT is the excess hours × 35 THB/hour.
- Work below threshold on a completed shift: flat 50 THB early-leave deduction.
- Exactly at threshold: no OT and no early-leave deduction.
- Incomplete shifts are not charged the early-leave deduction.
- HR manual OT override continues to win over automatic OT calculation.

## Verification state after latest payroll change

- Targeted payroll tests: 19/19 passed.
- Full test suite: 355/355 passed.
- TypeScript check passed.
- Production build compiled and TypeScript passed, then failed during unrelated prerendering on `/feedback/privacy` and `/apply/status` (`useState` null issue).

## Working convention

For meaningful changes, update Second Brain in the same session and include the resulting notes in Git so future sessions can resume from repository state rather than chat history.
