---
tags:
  - secondbrain
  - timetrack
updated: 2026-08-28
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

Customer Feedback QR launch state (checked 2026-08-29):

- Admin feature and public feature are enabled; production public form is `https://timetrack-lake.vercel.app/f`.
- Production has 48 EMPLOYEE production QRs: 1 active, 47 still `needsReprint=true`, and 2 have public-profile acknowledgement recorded.
- Production has 4 STATION production QRs: all 4 inactive and all 4 still `needsReprint=true`.
- Do not bulk-activate or bypass `needsReprint` / employee public-profile acknowledgement.
- EMPLOYEE lifecycle: public-profile acknowledgement immediately activates the current QR version while leaving `needsReprint=true` until a real print/save-PDF is confirmed. Opening the print action (`reveal`) also self-heals an already-approved inactive employee QR before returning the QR, so scanning from print preview works immediately. `MARK_PRINTED` then records the real print and clears `needsReprint`.
- STATION lifecycle is unchanged: confirmed print only clears `needsReprint`; activation remains a separate manual action.
- Admin QR Codes supports a dedicated **A4 landscape** print format for front-of-car/acrylic signs while keeping the compact badge format. The real print template follows the final approved Caltex reference: official Caltex lock-up, white/red/deep-teal composition, oversized red employee public name, handwritten-style question, position/station rows, three-column information band, elevated QR card with Caltex centre mark, eight separate fallback-code cells, red/teal bottom sweep and Techron treatment. QR/name/position/station/code remain dynamic.
- Employee Customer Feedback registry version is `employee-v2`: new employee QR visits ask seven service-behavior questions (appearance, vehicle guidance, greeting, order repeat, special-service offer, thanks, front-of-car sign) with `YES | NO | UNSURE`; existing `employee-v1` visits remain valid and continue to submit under their original version.

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
