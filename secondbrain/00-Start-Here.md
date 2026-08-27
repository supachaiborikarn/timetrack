---
tags:
  - secondbrain
  - timetrack
updated: 2026-08-27
---

# timetrack — Start Here

## Mandatory project-memory rule

**Every change to this project must be recorded in Second Brain in the same session.**

At minimum add a dated entry to [[notes/Session-Log]]. Also update [[notes/Decisions]], [[notes/Architecture]], [[notes/Runbook]], [[notes/Backlog]], or this page whenever the corresponding durable state changes.

If code/config/business rules change but Second Brain is not updated, the work is not complete.

## Current state

`timetrack` is the HR / attendance / payroll system for the station businesses. The application is built with Next.js, TypeScript, Prisma, and Vitest.

Latest important payroll change:

- Commit `7f37013` — `Add station-based OT and early leave rules`
- Pushed to `origin/main` on 2026-08-26.
- New rules take effect from `2026-08-26` onward.

Customer Feedback QR launch state (checked 2026-08-27):

- Admin feature and public feature are enabled. Vercel production deployment `dpl_J3MQZRy7FuDiPSzGnz4t6cngKgvf` is Ready, aliased to `timetrack-lake.vercel.app`, and `/f` returns HTTP 200.
- Production database currently has 48 EMPLOYEE production QRs and 4 STATION production QRs, all inactive with `needsReprint=true`.
- All four active stations have a public emergency phone configured.
- Only 1 of 48 employee QRs currently has public-profile approval, so employee QRs must not be bulk-activated yet.
- Station QR PDFs exist under `output/pdf/station-feedback/`, but print success still has to be recorded through the normal flow before activation.
- Do not bypass `needsReprint` or employee public-profile acknowledgement merely to make a QR active.

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

For **every** project change, update Second Brain in the same session and include the resulting notes in Git so future sessions can resume from repository state rather than chat history.
