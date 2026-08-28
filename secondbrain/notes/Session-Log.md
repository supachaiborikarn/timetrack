---
tags:
  - secondbrain
  - session-log
updated: 2026-08-28
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

## 2026-08-27 — Enabled Customer Feedback public feature for launch preparation

Goal:

Enable the public Customer Feedback QR surface requested by the owner while preserving the existing production safety guards for printing and employee public-profile consent.

Changes and current production state:

- Local `.env`: changed `CUSTOMER_FEEDBACK_PUBLIC_ENABLED` from `false` to `true`.
- Vercel Production: changed `CUSTOMER_FEEDBACK_PUBLIC_ENABLED` to `true` and deployed production `dpl_J3MQZRy7FuDiPSzGnz4t6cngKgvf`; the `timetrack-lake.vercel.app` alias now serves the enabled public surface.
- Production database check found 48 EMPLOYEE production QRs and 4 STATION production QRs; all remain inactive with `needsReprint=true`.
- The four active stations all have `publicEmergencyPhone` configured.
- Only 1 of 48 EMPLOYEE QRs currently has `publicProfileApprovedAt`; therefore employee QRs were deliberately not bulk-activated and consent was not fabricated.
- Four station QR PDF files already exist under `output/pdf/station-feedback/`, but the database still has no `MARK_PRINTED` confirmation; the print guard remains intact.

Decision:

- Public feature flag may be enabled independently, but a QR must still pass its own activation guard. Do not bypass `needsReprint` or employee public-profile approval to make a QR active.

Verification:

- Queried production QR status and station emergency-phone readiness through Prisma using the configured production database.
- Confirmed local feature flag changed to `true`.
- Confirmed Vercel accepted the production environment-variable override.
- Vercel deployment `dpl_J3MQZRy7FuDiPSzGnz4t6cngKgvf` reached Ready and was aliased to `timetrack-lake.vercel.app`.
- Production smoke test: `GET https://timetrack-lake.vercel.app/f` returned HTTP 200 with the Thai “เสียงลูกค้า” form.

Follow-up / risk:

- To make station QR signs usable by customers, physically print the current QR PDFs, record print success through the normal admin flow, then activate the intended station QRs.
- EMPLOYEE QRs require public-profile acknowledgement for each employee before activation; 47 are still missing it at this check.
- No QR activation state was forged or bypassed in this session.


## 2026-08-28 — Added A4 landscape Customer Feedback QR poster

Goal:

Add a print format suitable for an acrylic/frame sign placed in front of a car, while preserving the existing compact QR badge format and all QR activation/print guards.

Implementation:

- Added `src/lib/customer-feedback/print-poster.ts` with a dedicated A4 landscape (297×210 mm) poster template.
- Poster uses a large high-resolution SVG QR (~105 mm on paper), large Thai call-to-action, station/employee public label, fallback 8-character manual code, manual-entry URL, QR version, and a clear TEST watermark for test QRs.
- Updated `src/components/customer-feedback/admin/qr-codes-tab.tsx` so authorized users can choose **A4 แนวนอน** or the existing **ป้ายเล็ก** from each printable QR row.
- A4 printing still uses the existing `reveal` action and `MARK_PRINTED` confirmation flow; no activation guard is bypassed.
- Added `src/lib/__tests__/customer-feedback-print-poster.test.ts`.
- Generated a non-production demo render under `output/previews/customer-feedback-a4-landscape-sample.html` and `.png`; the demo QR/token is intentionally invalid and marked as a test/sample.

Verification:

- New poster unit tests: 2/2 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint on changed files: passed.
- `npm run build`: compile and TypeScript passed, then hit the pre-existing unrelated `/apply/status` prerender `useState` null failure already documented in the runbook.

Risk / follow-up:

- Printing A4 or compact format both count as printing the current QR version only after the admin confirms the print/save succeeded.
- Employee QR public-profile acknowledgement remains mandatory before either print action is shown.

Git:

- Feature commit: `093e2f6` — `Add A4 landscape customer feedback QR poster`
