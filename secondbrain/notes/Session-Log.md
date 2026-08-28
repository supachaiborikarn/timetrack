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

Deployment:

- `main` pushed through `a62761b`.
- Vercel CLI 59.9.1 rejected the session with `Not authorized`; retrying with the previously working 59.7.0 client authenticated successfully, uploaded the production candidate, and started remote build at `timetrack-6khxsd8ww-benzs-projects-2423502c.vercel.app`.
- At the final check in this session, the Vercel remote build was still compiling; production alias readiness was therefore not yet claimed.

## 2026-08-28 — Rebranded Customer Feedback A4 posters to Caltex and emphasized employee name

Goal:

Correct the A4 customer-feedback sign branding to Caltex and make employee/person QR signs clearly identify the individual being evaluated.

Implementation:

- Reworked `src/lib/customer-feedback/print-poster.ts` to use a Caltex red/navy/white print system with a Caltex lockup and the brand line `ENJOY THE JOURNEY`.
- Added explicit `targetType` to the poster input so EMPLOYEE and STATION signs render different wording/hierarchy.
- EMPLOYEE posters now use `ช่วยประเมินการบริการของฉัน` and make `publicLabel` the largest element on the page (25 mm type), followed by public position/station context.
- STATION posters use `ช่วยประเมินการบริการของเรา` and keep the station label prominent but smaller than employee names.
- Kept the large real SVG QR, 8-character fallback code, test watermark, reveal audit flow, print confirmation and `MARK_PRINTED` guard unchanged. No database rows or QR activation state were changed.
- Generated a real-template sample render at `output/previews/customer-feedback-a4-caltex-employee.html` and `.png` using a non-production demo token/code.

Verification:

- Poster unit tests: 3/3 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for poster/test/admin QR files: passed.

Decision:

- Customer Feedback A4 signs use Caltex as the master brand with `ENJOY THE JOURNEY`. Employee signs prioritize the employee public name; station signs prioritize station identity with collective wording.

Risk / follow-up:

- The embedded print lockup is a print-safe vector/CSS representation so the sign does not depend on an external image URL. If an approved official Caltex artwork asset is supplied later, it can replace the embedded lockup without changing QR behavior.

Git:

- Feature commit: `ea0bbdf` — `Brand customer feedback A4 signs for Caltex`

## 2026-08-28 — Matched the approved A4 mockup in the real print template

Goal:

Replace the earlier generic Caltex A4 layout with the user-approved visual structure while keeping all QR and employee/station data dynamic.

Implementation:

- Reworked `src/lib/customer-feedback/print-poster.ts` to mirror the approved mockup structure: yellow `เสียงลูกค้า` header, oversized employee public name, dark information pill, quick privacy/time facts, three benefit cards, a large bordered QR card, fallback 8-character code, and a branded footer.
- Preserved Caltex identity and `ENJOY THE JOURNEY` in the footer rather than using the mockup's placeholder station branding.
- Added explicit `publicPosition`, `stationLabel`, and `placementLabel` poster inputs so employee position/station and station placement are rendered from real QR-row data instead of flattened copy.
- Updated `src/components/customer-feedback/admin/qr-codes-tab.tsx` to pass those real values into the A4 template.
- Added responsive employee-name size classes so long public labels shrink before overflowing the A4 layout.
- QR SVG, manual URL/code, TEST watermark, reveal audit, print confirmation and `MARK_PRINTED` behavior remain unchanged. No QR activation, consent, or database state was bypassed.
- Generated a real-template preview at `output/previews/customer-feedback-a4-approved-employee.html` and `.png` using an intentionally invalid demo token/code.

Verification:

- Poster unit tests: 4/4 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for poster/test/admin QR files: passed.

Deployment:

- Feature pushed to `origin/main` in commit `5d76452` (`Match customer feedback A4 mockup`).
- Production deployment uploaded to `timetrack-lgph825zk-benzs-projects-2423502c.vercel.app` (Vercel inspect id `B5rNVa1TvAAPW6gLiU48WiL1oGH1`).
- Durable deploy task: `5ac61143-a981-4de5-8d0b-180cf6ef1d7a`. At the final allowed check in this turn Vercel was still `Building`; production readiness was not claimed.
## 2026-08-28 — Corrected A4 print-preview mismatch and footer clipping

Observed from real Chrome print preview:

- The deployed A4 sign still looked materially flatter/generic compared with the approved yellow/navy mockup.
- The right QR card extended into the footer, causing the fallback-code area to be partially covered in print preview.

Implementation:

- Rebuilt `src/lib/customer-feedback/print-poster.ts` around the approved composition: yellow speech-banner header, oversized employee name, italic service question, navy position/station pill, quick facts, three icon benefit cards, improvement note, rounded right-side QR card, `หรือ` divider, fallback instructions and a large 8-character code box.
- Kept Caltex + `ENJOY THE JOURNEY` in a yellow wave footer and kept all variable content as live HTML/SVG rather than a raster mockup.
- Added explicit `positionLabel` and `stationLabel` poster inputs and passed real employee/station values from `qr-codes-tab.tsx`.
- Reserved the bottom 22 mm of the A4 sheet for the footer and capped the QR card at 155 mm so the QR/manual-code card cannot be covered by the footer.
- QR SVG, manual code/URL, TEST watermark, reveal auditing, print confirmation, `MARK_PRINTED`, activation guards and employee public-profile acknowledgement remain unchanged. No QR/database activation state was altered.
- Generated a new real-template preview at `output/previews/customer-feedback-a4-mockup-v2.html` and `.png`.

Verification:

- Poster unit tests: 5/5 passed, including a regression test for footer/manual-code clipping.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for poster/test/admin QR files: passed.
- Headless Chrome rendered the new real-template preview successfully.

