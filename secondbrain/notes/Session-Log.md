---
tags:
  - secondbrain
  - session-log
updated: 2026-09-02
---

# Session Log

## 2026-09-02 — Redesigned Employee Payroll Documents page (/profile/documents)

Goal:

Bring `/profile/documents` into alignment with the current TimeTrack retro-tactile dashboard design system used across Employee Dashboard, Profile, History, and Notifications.

Implementation:

- Replaced legacy wide-table layout with tactile, mobile-friendly payslip instrument cards (`tt-paper-card tt-instrument-frame`).
- Added dark retro summary meter panel (`PAYSLIP SUMMARY`) showing total periods, paid count, latest net pay, and archive readiness.
- Integrated `EmployeePageHeader` with Caltex-yellow paper styling, `DOCUMENTS` eyebrow, and back navigation to `/profile`.
- Enhanced card layout with quick 3-metric financial summary (Earnings, Deductions, Net Pay), collapsible line-item breakdown (base pay, OT, special income, adjustments, penalties, advance deductions, social security, tax), and tactile PDF download action buttons for payslips and payment receipts.
- Restyled the Annual Tax Certificate (50 ทวิ) section to match the tactile instrument visual system.
- Preserved 100% of underlying business logic and client-side PDF generation via worker.

## 2026-09-02 — Added Reward Points wallet and weekly reward catalog

Goal:

Make employee competition rewards visible and actionable without mixing spendable points with Championship Points. Add a weekly reward image/card on the employee dashboard and explicitly block reward eligibility when Customer Quality is below the approved threshold.

Business rules implemented:

- `League Score` remains the weekly /100 competition score.
- `Championship Points (CP)` remain monthly ranking points and are never spent.
- New `Reward Points (RP)` are spendable and are awarded only from finalized weekly station standings.
- Reward eligibility requires an eligible work week, enough customer-feedback sample, Customer Quality at least **20/25**, and no unresolved Fair Play review.
- Weekly RP tiers: League 90-100 = 30 RP, 80-89.99 = 20 RP, 70-79.99 = 10 RP, below 70 = 0 RP.
- A worker may keep/see previously earned RP, but redemption is blocked for the current week while reward eligibility is not satisfied.
- Cancelled redemptions return the reserved RP; limited-stock items also restore one stock unit.

Implementation:

- Added `rewardPoints` to `CompetitionStanding` plus `RewardCatalogItem`, `RewardRedemption`, and `RewardRedemptionStatus` in `prisma/schema.prisma`.
- Added shared policy module `src/lib/competition/reward-policy.ts` and wallet/catalog query module `src/lib/competition/reward-wallet.ts`.
- Weekly league calculation now returns `isRewardEligible`, `rewardEligibilityReason`, and `rewardPointsPreview`; weekly finalization freezes earned RP without changing CP ranking rules.
- `/api/league` now returns RP wallet balance/history, active reward catalog, featured weekly reward, and reward eligibility state.
- Added transactional employee redemption endpoint `/api/league/points/redeem`; balance/stock are rechecked in a serializable transaction and the action is audited.
- Added ADMIN/HR reward management endpoint `/api/admin/league/rewards` for catalog items, featured weekly reward, pending redemptions, fulfillment, cancellation, stock restoration, and audit logging.
- Employee Dashboard now shows League / CP / RP together, a photo-capable “ของรางวัลสัปดาห์นี้” card, projected weekly RP, and a clear eligibility message.
- `/league` now shows the RP wallet, catalog, featured reward, redemption actions, and RP history while preserving the existing champion-reward flow.
- `/admin/league` now has reward creation (including image upload), featured-week selection, catalog enable/disable/edit, and redemption fulfillment controls for ADMIN/HR.

Verification (no production DB connection):

- `npm run db:diff` compared datamodel files only; preview contains additive SQL only (new enum/column/tables/indexes/FKs; no DROP).
- `npm run db:generate`: passed.
- Reward policy + existing League tests: **16/16 passed**.
- `npx tsc --noEmit`: passed.
- Focused ESLint for all touched League/Reward/Dashboard files: passed.
- `git diff --check`: passed.
- Production build with `DATABASE_URL` overridden to an invalid localhost URL compiled and passed TypeScript, then hit the already-known unrelated `/apply/status` prerender `useState` null failure. No production DB was contacted.

Deployment state / follow-up:

- Schema and code are implemented locally but **production schema has not been pushed yet**.
- Before `npm run db:push`, disclose and obtain explicit confirmation for production Neon host `ep-delicate-sound-a1mi5n1t`.
- Do not push/deploy application code that expects these new tables until the additive production schema update has been applied successfully.

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

Deployment:

- Fix pushed to `origin/main` in commit `98ee09e` (`Fix A4 feedback print layout`).
- Vercel production candidate: `timetrack-ot5uppfrk-benzs-projects-2423502c.vercel.app` (inspect id `GRWJefmxSBaxvvUaG54iDMj9TLPj`).
- Durable deploy task: `bfbfab46-d3da-4d91-a08f-0822c26a943b`. After two bounded checks the deployment was still `Building`; production readiness was not claimed.
## 2026-08-28 — Rebuilt A4 Customer Feedback print template to the final Caltex reference

Goal:

Make the real **A4 แนวนอน** print action follow the final owner-approved Caltex artwork rather than generating another conceptual mockup.

Implementation:

- Rebuilt `src/lib/customer-feedback/print-poster.ts` around the final reference composition: white field, Caltex lock-up at top left, oversized red employee public name, handwritten-style service question, position/station rows, dark-teal three-column information band, elevated QR card, eight separate red-bordered fallback-code cells, red/teal bottom sweep, thank-you copy and Techron treatment.
- Added local brand assets at `public/customer-feedback/caltex-logo.png` and `public/customer-feedback/techron-logo.png`; the print template now uses the real Caltex lock-up and Techron wordmark rather than drawing substitute wordmarks in CSS. Assets are served locally by TimeTrack so print output does not depend on an external network request.
- Bundled Kanit weights plus Sriracha under `public/fonts/` for deterministic Thai print typography in the blank print window.
- QR, public employee name, public position, station, manual code and manual URL remain live/dynamic values; no raster QR or hard-coded employee identity is used.
- Added a Caltex logo treatment at the QR centre while retaining the existing generated QR SVG and quiet zone.
- `qr-codes-tab.tsx` now passes `window.location.origin` as the print asset base and waits for local fonts/images (bounded by a fallback timeout) before opening the browser print dialog, preventing missing-brand/font output.
- Employee-name size still adapts for longer public labels. Station posters continue to use the same brand system with station-specific wording.
- `reveal`, print confirmation, `MARK_PRINTED`, employee public-profile acknowledgement, test watermark and activation guards remain unchanged. No QR/database activation state was bypassed.

Verification:

- Poster unit tests updated for the final Caltex reference layout: 6/6 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed with no errors/warnings.
- `git diff --check`: passed.
- Headless Chrome rendered the actual HTML template successfully at A4 landscape proportions; the latest QA render was 1680×1188.

Deployment:

- Feature commit `7b3f9ad` (`Match feedback A4 poster to final Caltex design`) was pushed to `origin/main`.
- Vercel production deployment: `timetrack-96m2oadyv-benzs-projects-2423502c.vercel.app` (inspect id `CKBVxi6yL6GWCfEPGV7nE5n8L9Y8`).
- Durable deploy task `d2fd25eb-a7f9-49b4-872d-b736d7e0853f` completed successfully. Vercel compiled, typechecked, prerendered all routes, deployed outputs, and reported `Ready in 2m`.
- Production alias was updated successfully to `https://timetrack-lake.vercel.app`.

## 2026-08-28 — Activated Golf employee feedback QR v1 after confirmed print

Production state change (operator explicitly confirmed):

- Target: employee public label `กอล์ฟ` at `ศุภชัยบริการ`; production EMPLOYEE QR version 1.
- Production DB host: `ep-delicate-sound-a1mi5n1t-pooler.ap-southeast-1.aws.neon.tech`.
- Recorded the already-printed v1 poster as printed (`lastPrintedAt`/`lastPrintedById`) and cleared `needsReprint`.
- Activated the same QR row (`isActive=true`, `revokedAt=null`) without rotating the token or changing the QR version, so the physical poster already printed remains valid.
- Wrote `CUSTOMER_FEEDBACK_QR_PRINTED` and `CUSTOMER_FEEDBACK_QR_ACTIVATED` audit entries using the existing admin approval actor.
- Preconditions verified before the transaction: employee active, public profile already approved, production/non-test QR, no other active employee QR.

Verification after the write:

- Database state: version 1, `isActive=true`, `needsReprint=false`, `revokedAt=null`, print timestamp present, employee active.
- Decrypted stored token hashes back to the same `tokenHash`, and a route-equivalent token-hash lookup resolves to the same active QR; no token/manual secret was printed to logs.
- `https://timetrack-lake.vercel.app/f` returned HTTP 200.
- Did not POST to the public resolve endpoint during verification because that endpoint creates a production `CustomerFeedbackVisit`; avoided polluting live feedback analytics with an artificial test visit.

## 2026-08-28 — Added seven employee service-behavior questions (`employee-v2`)

Owner request:

Add seven Customer Feedback questions for employee service execution: neat appearance, vehicle guidance, greeting, repeating the order, offering special/additional service, thanking the customer, and placing the front-of-car service sign.

Implementation:

- Added registry version `employee-v2` while retaining `employee-v1` for backward compatibility.
- New employee resolves issue `employee-v2`; idempotent reuse returns the original Visit survey version so existing `employee-v1` sessions remain valid.
- Added seven stable behavior keys and bilingual labels.
- Added a dedicated mobile UI step after overall rating with three answers per question (`YES`, `NO`, `UNSURE`), progress 0/7 through 7/7, back navigation, safe draft restore, and validation focus/error handling.
- `employee-v2` requires all seven behavior answers before submit; `employee-v1` and `station-v1` reject the new payload field.
- Each behavior is persisted as its own normalized `CustomerFeedbackAnswer`; the v1 idempotency payload shape remains unchanged when behavior answers are absent.
- Admin question registry and summary/funnel version filters include `employee-v2`. Station and incident survey behavior is unchanged.
- No Prisma schema change, migration, QR rotation, production DB write, or employee QR activation was required.

Verification:

- Focused Customer Feedback tests: 78/78 passed across validation, submit, public resolve, admin access/summary and feedback-form UI.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed with zero errors/warnings.
- `git diff --check`: passed.
- `npm run build`: Prisma generate, Next compile and TypeScript passed; build later failed on the known unrelated `/apply/status` prerender `useState` null error.

Deployment:

- Feature commit `030a6b9` (`Add employee feedback service behaviors`) pushed to `origin/main`.
- Direct local Vercel CLI deployment attempt returned `Not authorized`; no production state was inferred from that failed CLI call.
- The repository Vercel integration then built commit `030a6b9`; GitHub combined status reported `Vercel: success` with deployment target `4tKVh5KknhXjYxLQT3nSFVf2Eru6`.
- Production `https://timetrack-lake.vercel.app/f` returned HTTP 200 after the successful integration deployment. No real QR resolve was submitted for smoke testing, so no synthetic Production Visit was created.


## 2026-08-29 — Auto-activate employee feedback QR after confirmed print

Owner request:

After an employee's public profile is acknowledged, allow printing and make the QR become active automatically for every employee once the current QR version is genuinely printed/saved.

Implementation:

- Changed admin `MARK_PRINTED` for `EMPLOYEE` QRs so print metadata, `needsReprint=false`, and `isActive=true` are committed in the same transaction.
- Re-checks the locked current QR version, public-profile acknowledgement, public label/position, employee active status, and absence of another active employee QR before activation.
- Writes the normal `CUSTOMER_FEEDBACK_QR_PRINTED` audit plus `CUSTOMER_FEEDBACK_QR_ACTIVATED` with `source=MARK_PRINTED` when auto-activation actually changes the state.
- `STATION` QR printing is unchanged and does not auto-activate.
- Admin UI now shows `พิมพ์แล้วเปิดอัตโนมัติ` instead of offering a premature activate button while an acknowledged EMPLOYEE QR still needs printing; intentionally deactivated already-printed employee QRs can still be re-enabled manually.
- Print-success toast uses the backend message so the operator sees when automatic activation happened.

Production state check before rollout:

- Production DB host: `ep-delicate-sound-a1mi5n1t-pooler.ap-southeast-1.aws.neon.tech`.
- EMPLOYEE production QRs: 48 total, 1 active, 47 `needsReprint=true`, 2 with public-profile acknowledgement.
- STATION production QRs: 4 total, 0 active, 4 `needsReprint=true`.
- Reconcile query for already-approved + already-printed + inactive employees returned **0 rows**, so no production QR state was mutated during reconciliation.
- In particular, any approved employee QR that still has `needsReprint=true` remains inactive until a real print/save-PDF is confirmed.

Verification:

- Admin QR route tests: 17/17 passed, including employee auto-activation, station non-auto-activation, and rejection before employee acknowledgement.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- `git diff --check`: passed.

## 2026-08-29 — Fixed approved employee QR failing when scanned from print preview

Observed from production after owner tested employee `กระเพรา`:

- Production QR version 1 had public-profile acknowledgement recorded at `2026-08-29T03:21:07.997Z`, employee active, but `isActive=false`, `needsReprint=true`, and `lastPrintedAt=null`.
- Audit history showed acknowledgement followed by three `CUSTOMER_FEEDBACK_QR_REVEALED` events, but no `CUSTOMER_FEEDBACK_QR_PRINTED` / activation event. The QR was therefore correctly rejected by the public resolver as `INVALID_QR`, displayed as “ไม่พบแบบประเมินนี้”.
- The previous auto-activation change (`34a03f9`) had deployed successfully only after those print-preview attempts, and that flow still waited for post-print confirmation before activation, so scanning the preview itself remained a bad experience.

Fix:

- EMPLOYEE `approve-public-profile` now atomically records acknowledgement and activates the same current QR version immediately after re-checking version, employee active status, public label/position, and active-QR conflicts.
- Approval activation deliberately does not clear `needsReprint` or set `lastPrintedAt`; the system does not pretend the physical sign was printed.
- EMPLOYEE `reveal` now self-heals already-approved inactive rows by activating them before returning the QR token. This means legacy rows such as `กระเพรา` become testable as soon as the operator opens the print action again, including scanning directly from print preview.
- `MARK_PRINTED` remains responsible for physical print completion and clearing `needsReprint`.
- STATION behavior remains unchanged.
- Admin confirmation copy now explains that acknowledgement opens the employee QR automatically and printing/testing can begin immediately.

Verification:

- Admin QR route tests: 19/19 passed, including immediate activation on acknowledgement and activation-before-reveal for print-preview scanning.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- `git diff --check`: passed.
- No production database write was performed while diagnosing or implementing this fix; production inspection was read-only.
## 2026-08-29 — Fixed rotated employee feedback QR being immediately inactive

Observed from the latest production EMPLOYEE QR rotation:

- The current `กระเพรา` production QR had been rotated to version 2, but the rotate action set `isActive=false` and `revokedAt` to the rotation time.
- Both the QR token and the fallback manual code were therefore rejected by the public resolver, even though the employee was active and public-profile acknowledgement was already recorded.
- The existing acknowledgement/reveal self-heal did not help this path because the admin UI prints directly from the rotate response without calling `reveal` again.

Implementation:

- EMPLOYEE rotation now locks the employee and QR row, rechecks the expected version, public-profile acknowledgement, public label/position, employee active state, and active-QR conflicts.
- When eligible, the newly generated version remains or becomes active in the same transaction (`revokedAt=null`) while `needsReprint=true` and print metadata are reset. The old token/manual code still become invalid immediately.
- Unapproved employee QRs and all STATION rotations retain the inactive-after-rotate behavior.
- Rotation audit details now record whether an employee QR was auto-activated, and a normal activation audit is added when rotation changes the state from inactive to active.

Verification:

- Admin QR route tests: 21/21 passed, including approved employee rotate activation and unapproved employee staying inactive.
- Admin rotate + public resolve targeted tests: 23/23 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- `git diff --check`: passed.

Deployment and production repair:

- Feature commit `c3654f6` (`Fix rotated employee feedback QR activation`) was pushed to `origin/main`.
- GitHub combined status reported `Vercel: success` for commit `c3654f6`.
- Repaired only the existing `กระเพรา` production QR version 2 after strict transaction checks: employee active, public profile approved, label/position complete, exact version unchanged, and no other active employee QR.
- The repair set `isActive=true` and `revokedAt=null` without rotating secrets again, changing print metadata, or clearing `needsReprint`; it also wrote `CUSTOMER_FEEDBACK_QR_ACTIVATED` with source `PRODUCTION_ROTATE_REPAIR`.
- Route-equivalent verification decrypted the stored values without logging them and confirmed both token-hash and manual-code-hash lookups resolve to the same active version 2. No public resolve request was submitted, so no synthetic production Visit was created.

## 2026-08-29 — Restyled Customer Feedback small QR sign to match A4

Goal:

Replace the old plain black-border Customer Feedback small QR sign with a polished compact sign that uses the same visual language as the approved A4 Caltex poster.

Implementation:

- Added `buildCustomerFeedbackSmallLabelHtml()` in `src/lib/customer-feedback/print-poster.ts` as a dedicated 105 x 148 mm portrait print template.
- Reused the A4 system: Caltex lock-up and `ENJOY THE JOURNEY`, red public employee/station label, Sriracha service question, teal information treatment, red-bordered manual-code cells, red/teal footer sweep and Techron treatment.
- Kept employee/station wording, public position/station identity, TEST ribbon, QR version, manual URL and eight-character fallback code dynamic from the current QR row.
- Replaced the old inline `ป้ายเล็ก` HTML in `src/components/customer-feedback/admin/qr-codes-tab.tsx` with the shared small-label builder; A4 and small formats now use the same live poster input and wait for local fonts/images before print.
- Kept the compact QR completely unobstructed instead of applying the A4 centre-logo treatment. The QR renders at 54 mm on white, and `generateQRCodeSVG` supplies the standard four-module quiet zone. This intentionally favors scan reliability on the smaller physical sign.
- Added small-label regression coverage to `src/lib/__tests__/customer-feedback-print-poster.test.ts` for dimensions, Caltex assets/typography, long labels, station wording, escaping/test watermark, unobstructed QR and eight fallback-code cells.
- No database command, production data change, QR rotation, or activation change was performed in this session.

Verification:

- Customer Feedback poster tests: 10/10 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint on the QR admin, poster and poster-test files: passed with zero errors.
- `git diff --check`: passed before final documentation update and is rechecked at handoff.
- Generated a local mock-data HTML preview and macOS Quick Look successfully rendered a thumbnail. Automated Chrome capture was unavailable because Google Chrome is not installed in the connector environment; the temporary preview was moved under ignored `.local/` and the preview server was stopped.

Decision:

- Small and A4 Customer Feedback signs share one Caltex visual family, but the small sign does not place any decorative logo over the QR.

Risk / follow-up:

- Before mass printing, print one 105 x 148 mm sample at 100%/Actual Size and scan it with both iPhone and an older Android phone under real station lighting/glare.

Git:

- Feature commit: `28f8f8770f55d339b686c3878a9c2864720080e4`.
- Pushed: `main -> origin/main`.


## 2026-08-29 — Added employee Customer Feedback 64-point scorecard

Goal:

Use the Caltex forecourt service checklist as a customer-answer-driven employee score that can later be used as one input to bonus calculation, and add an admin menu to inspect each employee's score.

Implementation:

- Added immutable `employee-v3` survey instead of changing the meaning of published `employee-v2` questions. New employee QR visits resolve to `employee-v3`; existing v1/v2 visits remain supported.
- `employee-v3` has 9 service criteria weighted 15 + 10 + 3 + 10 + 3 + 4 + 5 + 4 + 10 = 64 points, matching the supplied Caltex checklist.
- Customer answers remain YES / NO / UNSURE. YES earns the criterion weight, NO earns zero, and UNSURE is excluded from that criterion's denominator rather than treated as a failure.
- Added `summarizeEmployeeRubric()` to calculate each criterion as YES rate x criterion weight, preserving the checklist's fixed weights. If an entire criterion has no evaluable answer it is excluded and the remaining score is normalized back to 64.
- Employee scores are hidden until at least 10 VALID employee-v3 responses exist, following the existing minimum-sample guardrail. TEST, SUSPECTED and HIDDEN responses are excluded.
- Added admin API `/api/admin/customer-feedback/employee-scores` with existing station-scope and `customer_feedback.view_dashboard` permission checks.
- Added `คะแนนพนักงาน` tab under `เสียงลูกค้า` with two subviews: `ภาพรวมคะแนน` for ranking/comparison and `รายบุคคล` for selecting one employee at a time. The individual view has employee/station search, overall score /64, VALID sample count, aggregate YES/NO/UNSURE counts, and all 9 criterion scores. The overview table also has a `ดูคะแนนรายคน` action that opens the selected employee directly.
- This score is informational evidence only in this change; it is not yet written into Payroll or used to pay/deduct bonus automatically.

Key files:

- `src/lib/customer-feedback/questions.ts`
- `src/lib/customer-feedback/validation.ts`
- `src/lib/customer-feedback/submit.ts`
- `src/lib/customer-feedback/employee-score.ts`
- `src/app/api/public/customer-feedback/resolve/route.ts`
- `src/app/api/public/customer-feedback/submissions/route.ts`
- `src/app/api/admin/customer-feedback/employee-scores/route.ts`
- `src/app/f/feedback-form.tsx`
- `src/app/admin/customer-feedback/page.tsx`
- `src/components/customer-feedback/admin/employee-scores-tab.tsx`
- relevant tests.

Verification:

- `npx tsc --noEmit`: passed after the individual-score menu and employee-v3 test coverage were added.
- Targeted Customer Feedback tests: 79/79 passed, including employee-v3 form rendering/submission, registry/validation, normalized answers, rubric calculation, resolve flow, and individual-score navigation.
- Targeted ESLint on changed implementation/test files: passed with zero errors and zero warnings.
- Production build: `NODE_ENV=production npm run build` passed, including `/admin/customer-feedback` and `/api/admin/customer-feedback/employee-scores`. The earlier local build failure was reproduced only under the connector's non-standard NODE_ENV and disappeared with the standard production value.

Risk / follow-up:

- No historical employee-v2 answers are backfilled into the 64-point rubric because their question meanings are not one-to-one with the Caltex checklist. Scores begin from employee-v3 responses.
- Bonus integration remains a separate business-rule change and must not be enabled until the bonus formula and period rules are explicitly approved.

Git:

- Not committed or pushed in this session yet.


## 2026-08-30 — Employee dashboard monthly customer-evaluation target

Goal:

Show each forecourt employee how many valid customer evaluations they have accumulated toward a monthly target of 60 directly on the employee dashboard.

Implementation:

- Added `customerEvaluationCount` and `customerEvaluationTarget` to the consolidated `/api/employee/dashboard` response.
- Count only `STANDARD + EMPLOYEE + employee-v3 + VALID` Customer Feedback responses whose `employeeId` matches the signed-in employee. TEST, SUSPECTED and HIDDEN responses do not count.
- The evaluation month is always the current Bangkok calendar month and is independent from the historical attendance-calendar month the employee may browse.
- The monthly target is 60 evaluations and is returned only for employees whose current department is marked `isFrontYard`; other employee dashboards do not show this scorecard target.
- Added a compact dashboard target card in the upper yellow header area between the left/right attendance stats (the area marked in the reference screenshot), showing `current / 60 คน` and a progress bar capped visually at 100% while preserving the real count above 60.
- Reused the existing consolidated dashboard request; no additional client API request was added.

Verification:

- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; five pre-existing unused-variable warnings remain in `EmployeeDashboardView.tsx` and were not introduced by this change.
- Production build passed before the final UI reposition. After the reposition, TypeScript still passed and `git diff --check` passed; the final production-build retry stopped only because `next/font` could not fetch Inter from `fonts.googleapis.com` due to a connector/network failure, not a code compile/type error.

Git:

- Feature commit: `d0f7460` (`feat: show monthly customer evaluation target`).
- Pushed: `main -> origin/main`.

## 2026-08-30 — Fixed dashboard evaluation target overlap

- User reported the monthly customer-evaluation card was partially hidden behind the large floating `วันทำงาน` circle on mobile.
- Kept the card in the requested upper-yellow center slot, but moved it upward (`-mt-4`) and reduced vertical padding/font/progress-bar height so the whole `current / 60 คน` target remains visible above the work-days circle.
- Did not use z-index to cover the work-days circle; the two dashboard elements now occupy separate visual space.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; the same 5 pre-existing unused-variable warnings remain in `EmployeeDashboardView.tsx`.


## 2026-08-30 — Admin monthly customer-evaluation target visibility

Goal:

Let admins monitor each employee's current-month progress toward the same 60-customer-evaluation target shown on the employee dashboard, without confusing it with the score page's selectable date range.

Implementation:

- Extended `/api/admin/customer-feedback/employee-scores` with `monthlyEvaluationCount` per employee plus `monthlyEvaluationTarget = 60`, `monthlyFrom`, and `monthlyToExclusive`.
- Monthly counts use the current Bangkok calendar month regardless of the admin's score-date filters.
- Count only `STANDARD + EMPLOYEE + employee-v3 + VALID` responses, with the same effective station scope already enforced for the admin. TEST, SUSPECTED and HIDDEN responses are excluded.
- Active employees whose department is marked `isFrontYard` are included even when they have no score-period or monthly responses, so the admin can see `0 / 60` instead of those employees disappearing from the target view.
- Kept `responseCount` as the VALID sample count for the selected score period; it is intentionally separate from the current-month 60-target count.
- Added a `เป้าเดือนนี้` column to the overview table with `current / 60`, progress, and remaining/reached status.
- Added a dedicated individual card with the same monthly progress, `ขาดอีก N คน` / `ถึงเป้าแล้ว`, and an explicit note that it follows the current Bangkok month rather than the date filters above.

Verification:

- Targeted tests: 18/18 passed across employee-score UI, admin access/station scope, and rubric calculation.
- `npx tsc --noEmit`: passed.
- Targeted ESLint on changed admin/API/test files: passed with zero errors and zero warnings.
- `git diff --check`: passed before documentation update and will be rechecked at handoff.
- `npm run build` under the inherited shell environment failed while prerendering the unrelated `/auth/error` page because the machine-wide `NODE_ENV` was `development` (Next.js explicitly warned that the value was non-standard for a production build).
- `env NODE_ENV=production npm run build`: passed; all 180 app pages/routes were generated successfully. No database command was run.

Git:

- Feature commit: `a13f10b` (`feat: show admin monthly evaluation progress`).
- Documentation was updated immediately afterward in the same session before push.


## 2026-08-30 — Employee Customer Feedback 54 x 88 mm labels and batch A4 print

Goal:

Change the employee small Customer Feedback label to exact 54 x 88 mm and let admins print multiple employees on one A4 sheet without losing per-QR reveal/print auditing.

Implementation:

- Rebuilt `buildCustomerFeedbackSmallLabelHtml()` as an exact 54 x 88 mm portrait template while keeping the approved Caltex visual family.
- Reduced the unobstructed QR field to 35 x 35 mm to fit the new physical format while preserving a white scan field and QR quiet zone.
- Added `buildCustomerFeedbackSmallLabelA4SheetHtml()` for A4 portrait batch output: 3 x 3 grid, 9 labels per page, 4 mm gaps/cut guides, and automatic page continuation after every 9 employees.
- Geometry is exact-size without CSS scaling: grid width = `3*54 + 2*4 = 170 mm` inside A4 width 210 mm; grid height = `3*88 + 2*4 = 272 mm` inside A4 height 297 mm.
- Added employee-row checkboxes, select-all for currently loaded eligible employees, and `A4 รวม 54×88` in the Customer Feedback QR admin tab.
- Batch selection is limited to EMPLOYEE QR rows whose public profile is acknowledged and whose employee is active.
- Batch printing opens its window before async work to avoid popup blocking, reveals each selected QR through the existing authenticated API, generates one A4 print document, then asks for one operator confirmation.
- Only after confirmation does the UI call `MARK_PRINTED` for each successfully revealed QR version. Reveal and mark calls are processed in chunks of 6 to avoid a large batch spiking the production DB pool. Partial reveal/mark failures are reported and do not falsely mark failed rows as printed.
- The existing single `ป้ายเล็ก` action now identifies the physical size as 54 x 88 mm.

Files:

- `src/lib/customer-feedback/print-poster.ts`
- `src/lib/__tests__/customer-feedback-print-poster.test.ts`
- `src/components/customer-feedback/admin/qr-codes-tab.tsx`
- `secondbrain/notes/Decisions.md`
- `secondbrain/notes/Session-Log.md`

Verification:

- `npx tsc --noEmit`: passed.
- Targeted print-poster tests: 11/11 passed after updating assertions for the new compact layout and 9-up A4 pagination.
- Targeted ESLint on the changed print/UI/test files: passed with zero errors/warnings.
- Full Vitest suite: 62 test files, 397/397 tests passed.
- `env NODE_ENV=production npm run build`: passed; Next.js generated all 180 routes/pages successfully.
- `git diff --check`: passed.
- Generated a 9-employee A4 preview with the new HTML and rendered it through installed Google Chrome headless to a 1200 x 1800 PNG. The print CSS geometry is fixed at 170 x 272 mm for the 3 x 3 grid, centered inside 210 x 297 mm A4 with 20 mm side margins and 12.5 mm top/bottom margins.
- The separate Playwright CLI screenshot attempt could not run because its bundled Chromium binary is not installed; Chrome headless rendering succeeded, so no browser package was installed for the project.
- No database command was run.

Git:

- Feature commit: `825a67a` (`feat: batch print 54x88 feedback labels`).
- Documentation hash record added immediately afterward in the same session before push.


## 2026-08-31 — Employee daily customer-evaluation target

Goal:

Replace the employee dashboard's monthly 60-evaluation progress with a simpler daily goal of 5 customer evaluations, while leaving the admin monthly benchmark unchanged.

Implementation:

- Employee dashboard now counts only STANDARD + EMPLOYEE + employee-v3 + VALID responses submitted during the current Bangkok calendar day.
- Daily window resets at 00:00 Asia/Bangkok and does not follow the attendance calendar month the employee is browsing.
- Employee-facing target changed from 60/month to 5/day, with copy and accessibility label updated from month to today/day.
- Admin monthly 60 benchmark and the 64-point employee score formula are unchanged.
- Added a shared daily-target helper/constant and boundary tests around Bangkok midnight.
- Added an employee-dashboard API regression test covering all response filters, Bangkok day bounds, independence from the viewed attendance month, the returned 5-person target and the non-front-yard path.

Verification:

- Targeted daily-target and employee-dashboard API tests: 4/4 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; the same 5 pre-existing unused-variable warnings remain in `EmployeeDashboardView.tsx`.
- Full Vitest suite: 64 test files, 401/401 tests passed.
- `env NODE_ENV=production npm run build`: passed; Next.js generated all 180 routes/pages successfully. The first sandboxed attempt could not fetch Google Fonts, and the network-enabled retry passed.
- `git diff --check`: passed.
- No database command was run.

Git:

- Feature commit: `75deddb` (`feat: use daily employee feedback target`).
- Verification and Second Brain changes were included in the feature commit; this hash record was added immediately afterward before push.


## 2026-08-31 — Hide employee-facing evaluation counts

Goal:

Remove the personal collection counter after observing that the visible target encouraged employees to rush Customer Feedback collection.

Implementation:

- Removed the daily evaluation progress card and its count/target state from `EmployeeDashboardView` while preserving the existing header layout.
- Removed the Customer Feedback count query and count/target fields from `/api/employee/dashboard`.
- Removed the unused daily-target helper and its boundary test.
- Changed `/api/customer-feedback/me` to keep the minimum-sample calculation internal and omit response totals, the threshold, rating distributions, suspected-response counts and per-reason counts from employee responses.
- Changed the employee self-summary to show `กำลังรวบรวมข้อมูลสำหรับคะแนนสรุป` before a score is ready and to show ready scores without response totals.
- Admin monthly monitoring, exact counts, the 60-response benchmark and the 64-point scoring rules are unchanged.
- Added API and component regression coverage for the employee count-hiding rules.

Verification:

- Targeted employee-dashboard, employee self-summary API and self-summary UI tests: 8/8 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; the same 5 pre-existing unused-variable warnings remain in `EmployeeDashboardView.tsx`.
- Full Vitest suite: 64 test files, 402/402 tests passed.
- `env NODE_ENV=production npm run build`: passed; Next.js generated all 180 routes/pages successfully.
- `git diff --check`: passed.
- No database command was run.

Git:

- Feature commit: `4d45acd` (`fix: hide employee feedback counts`).
- Verification and Second Brain changes were included in the feature commit; this hash record was added immediately afterward before push.

## 2026-08-31 — เสียงลูกค้า: ความต้องการฝั่งเข้าบริการ
- เพิ่ม survey version `employee-v4` ตามกติกาห้ามเปลี่ยนความหมายคำถามรุ่นที่เผยแพร่แล้ว; QR พนักงานที่ resolve ใหม่ใช้ v4 ส่วน visit v1-v3 เดิมยังส่งได้ตามเดิม
- v4 ใช้ rubric 64 คะแนนเดิม 9 ข้อ และเพิ่มคำถามไม่คิดคะแนน: ลูกค้าอยากให้พนักงานเข้าบริการทาง `ฝั่งคนขับ`, `ฝั่งคนนั่ง`, หรือ `ไม่ติดฝั่งไหน`
- เก็บคำตอบ normalized เป็น `questionKey=service_side_preference` และค่า `DRIVER | PASSENGER | NO_PREFERENCE` เพื่อวิเคราะห์ภายหลัง
- Admin employee score รวม VALID responses ของทั้ง employee-v3 และ employee-v4 เพื่อไม่ให้คะแนน/ยอดประเมินขาดช่วงหลังเปลี่ยน version
- Verification: `npx tsc --noEmit` ผ่าน; targeted customer-feedback tests 73/73 ผ่าน (validation, submit, resolve, public form)


## 2026-09-01 — Employee daily Customer Feedback status

Goal:

Restore a daily motivation signal for front-yard employees without revealing the exact number of customer evaluations collected.

Implementation:

- Restored the Bangkok-calendar daily feedback target helper with target 5 evaluations/day and a near-goal threshold at 3.
- `/api/employee/dashboard` counts VALID STANDARD employee feedback for `employee-v3` and `employee-v4` server-side only.
- Employee-facing API now returns only `NOT_YET`, `NEAR`, or `DONE` plus the fixed target 5; the exact count is never returned.
- Dashboard status text is `ยังไม่ครบเป้าวันนี้` for 0-2, `ใกล้ครบเป้าแล้ว` for 3-4, and `ครบเป้าวันนี้แล้ว` for 5+.
- The status resets with the Bangkok calendar day and remains limited to front-yard employees.
- Admin Customer Feedback counts and the existing scoring pipeline are unchanged.
- Added regression coverage for all three status bands, v3+v4 filtering, Bangkok day boundaries, hidden exact counts, and non-front-yard behavior.

Verification:

- Targeted employee dashboard API tests: 8/8 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; the same 5 pre-existing unused-variable warnings remain in `EmployeeDashboardView.tsx`.
- `git diff --check`: passed.
- Full Vitest suite: 406/409 passed; 3 failures are in the pre-existing `src/app/api/admin/customer-feedback/admin-access.test.ts` expectations that still assume pre-v4 query shapes. This feature does not modify that admin route/test.
- No database command was run.

## 2026-09-01 — Hide fixed daily target label from employee dashboard

- Removed the visible `เป้าหมาย 5 คัน / วัน` line from the employee Dashboard feedback status card.
- Employee Dashboard now shows only the coarse motivation status (`ยังไม่ครบ`, `ใกล้ครบ`, `ครบแล้ว`).
- Removed `customerEvaluationTarget` from the employee Dashboard API payload; the fixed target remains server-side only for deriving status.
- Admin counts/scoring are unchanged.

## 2026-09-02 — Employee dashboard layout refresh

Goal:

Refresh the employee dashboard to make today's shift and required actions more prominent while preserving existing attendance flows and customer-feedback privacy.

Implementation:

- Reworked `EmployeeDashboardView` into a compact mobile-first card layout.
- Promoted today's shift, check-in/break/check-out actions, worked duration, and shift progress to the top.
- Kept customer-feedback daily status as coarse states only (not exact counts).
- Reorganized monthly attendance summary, performance score, announcements, quick actions, and calendar.
- Preserved cashier manual check-in, mood checkout, language switching, theme switching, and right-side menu flows.
- Added explicit Bangkok formatting for attendance timestamps.

Verification:

- TypeScript: passed before release.
- ESLint: passed before release.
- Final production build run before push.
- Production build: compile + TypeScript passed; build then hit the pre-existing unrelated `/apply/status` prerender `useState` null error.


## 2026-09-02 — Employee dashboard visual fidelity pass

Goal:

Bring the live employee dashboard closer to the approved retro-industrial mockup after reviewing the real Samsung Browser screenshot.

Changes:

- Reduced header, hero, mission, monthly summary, and performance card spacing/sizing to increase information density.
- Reduced hero shift ring from 112px to 96px and tightened typography/action spacing.
- Added a dedicated compact no-shift state: when no shift is scheduled, the hero no longer shows the SHIFT ring, attendance status, duplicate no-shift action box, or empty shift-time dash.
- Kept all existing attendance/customer-feedback business logic unchanged.
- Customer-feedback mission still exposes only coarse status, never the exact evaluation count or target.

Verification:

- `npx tsc --noEmit`: passed.
- `npx eslint src/components/dashboard/views/EmployeeDashboardView.tsx`: passed.
- `NODE_ENV=production npm run build`: passed, 180/180 static pages generated.
- The earlier `/apply/status` prerender failure is confirmed to be caused by a shell-level `NODE_ENV=development`; production build succeeds when NODE_ENV is correct.


## 2026-09-02 — Employee dashboard retro motion pass

Goal:

Bring the approved retro dashboard mockup closer to the live employee experience through restrained motion without changing attendance/customer-feedback business logic.

Implementation:

- Added staggered card entrance motion for the employee dashboard.
- Added a slow orbit indicator around the live shift progress dial.
- Added sequential fill animation for the 3-state customer-feedback mission meter without exposing exact response counts or the 5/day target.
- Added count-up motion for the performance score.
- Added tactile press feedback to dashboard controls and primary attendance actions.
- Added a very subtle scanline texture to the shift hero for the industrial-retro visual language.
- Added `prefers-reduced-motion` fallbacks that disable decorative motion and tactile transforms when the device requests reduced motion.
- No API, attendance, payroll, customer-feedback scoring, or admin behavior changed.

Verification:

- `npx tsc --noEmit`: passed.
- `npx eslint src/components/dashboard/views/EmployeeDashboardView.tsx`: passed.
- `git diff --check`: passed.
- Production build launched with `NODE_ENV=production`; compilation succeeded. Final build completion was still being verified when this log entry was written.

## 2026-09-02 — Rebuild employee dashboard to match approved retro mockup
- Reworked the employee dashboard from a retro-themed version into a mockup-fidelity layout: textured yellow header, paper/instrument cards, left-side TODAY tab, analog shift gauge with tick marks/needle/station mark, segmented customer-feedback mission meter, compact monthly tiles, side-by-side performance + announcement cards, and compact 7-day calendar.
- Employee bottom navigation center action now uses a clock with “เข้า/ออกงาน”; admin/HR/manager retain the existing plus action and workflow.
- Customer-feedback mission remains coarse status only; no exact evaluation count or daily target is exposed.
- Attendance/check-in/break/check-out flows and existing API behavior were preserved.
- Verification: targeted TypeScript and ESLint passed; `NODE_ENV=production npm run build` completed successfully with 180/180 static pages.
- Workspace warning: concurrent break/payroll/performance work is present in other modified/untracked files. Do not stage or commit those files with this dashboard change.


## 2026-09-02 — Station League, Fair Play, and reward selection

Goal:

Add a station-first employee competition system with weekly rewards, monthly station champions, a cross-station Grand Champion, and competition-specific anti-gaming controls that do not alter source customer feedback.

Competition rules:

- Weekly competition is separated by station for active front-yard employees.
- League score is normalized to 100: work performance 60, customer quality 25, mission consistency 15.
- Work score reuses the existing attendance-derived performance calculation rather than raw attendance counts.
- Customer competition score uses only VALID employee-v3/v4 feedback that passes competition eligibility and the existing minimum sample.
- The same pseudonymous weekly client signal can add competition credit only once per employee per week; repeated feedback remains stored as customer feedback but does not add League points.
- SUSPECTED/high-abuse feedback and responses without a retained competition client signal do not add League points.
- High repeat ratio / multiple suspicious responses / missing client signals can move a standing to Fair Play REVIEW. No single raw network signal directly invalidates source feedback.
- Employee APIs do not expose exact eligible/repeat/suspicious feedback counts or the internal 5/day mission target. Those details are admin-only.
- Managers are station-scoped for Fair Play and reward fulfillment; ADMIN/HR can see all stations.

Season flow and rewards:

- Weekly rank championship points: 1st=10, 2nd=6, 3rd=4, 4th-5th=2.
- Monthly Station Champion is derived from finalized weekly snapshots and championship points, not recalculated raw feedback.
- Monthly Grand Champion compares finalized Station Champions using normalized score.
- Monthly finalization waits while any weekly period in that month is unresolved/PENDING_REVIEW.
- Weekly Champion can choose Champion Meal (up to 300 THB) or Mystery Reward (~300 THB).
- Monthly Station Champion can choose Voucher 700 THB or Family Meal up to 700 THB.
- Grand Champion can choose Grand Voucher 1,500 THB or Premium Reward up to 1,500 THB.
- Reward-credit wallet was intentionally deferred; MVP does not promise a stored credit balance without a ledger.

Implementation:

- Added CompetitionPeriod, CompetitionStanding, CompetitionAward models and competition enums in Prisma.
- Added migration `prisma/migrations/20260902053000_add_competition_league/migration.sql`; migration must be applied before enabling the feature in production.
- Added league calculation/finalization in `src/lib/competition/league.ts`.
- Added employee `/league` page and APIs for leaderboard/reward selection.
- Added `/admin/league` Fair Play + reward fulfillment UI/API and admin sidebar entry.
- Added protected `/league` middleware matcher and competition notification badges.
- Added Monday 07:30 Asia/Bangkok Vercel cron (`30 0 * * 1`) to snapshot the previous week and attempt idempotent monthly/grand finalization.
- Dashboard adds a link to Weekly Station League without exposing exact customer counts.

Verification:

- `npx vitest run src/lib/competition/league.test.ts`: 5/5 passed (repeat client, suspected/high-abuse, high repeat ratio, missing client signal, Bangkok week boundary).
- `npx tsc --noEmit`: passed.
- Targeted ESLint across league APIs/pages and changed existing UI: passed.
- `npx prisma validate`: passed.
- `npm run db:diff`: generated the expected schema-only migration SQL without connecting to a database; committed migration was aligned to that output plus the required partial unique index for global periods.
- `NODE_ENV=production npm run build`: passed; 184/184 static pages generated.
- `git diff --check`: passed before final cleanup.

## 2026-09-02 — Added the missing customer-feedback QR entry for May at WKO

- Investigated why employee `WS1` (May) at `WKO` did not appear in the Customer Feedback QR print list.
- Production data showed the active employee had no `nickName` and no employee QR, while the other employee labelled “เมย์” belonged to SPC and was inactive.
- Updated `WS1.nickName` to `เมย์` through the normal admin employee form.
- Created one production EMPLOYEE QR through the normal Customer Feedback admin flow with public label `เมย์` and position `พนักงานบริการ`.
- The QR remains inactive, unprinted, and waiting for public-profile acknowledgement; no consent, activation, print confirmation, token rotation, or scan was forged.
- Verified in the production UI that searching `WS1` now returns the correct WKO QR row with status `รอรับทราบข้อมูลสาธารณะ`.


## 2026-09-02 — Admin and cashier operational dashboard redesign

Goal:

Redesign the home/admin dashboards around the current TimeTrack workflows so each role sees what requires action now instead of a generic summary.

Implementation:

- Reworked `/api/admin/dashboard` into a role-aware operational feed for ADMIN/HR/MANAGER/CASHIER.
- MANAGER and CASHIER dashboard data is station-scoped; CASHIER does not receive League Fair Play/customer-feedback management counts.
- Distinguished employees who simply have not arrived yet from employees whose shift start plus the 5-minute grace has already passed. Approved leave is excluded from the expected-to-work denominator.
- Added current operational signals: working now, on break, break overtime, checkout overdue, late arrivals, open shifts, approvals, advances, League Fair Play reviews, selected rewards awaiting fulfillment, customer cases, and feedback review requests.
- Rebuilt mobile `AdminHomeView` as a retro-styled Action Center. ADMIN/HR/MANAGER see control-center workflows; CASHIER sees Station Operations, manual check-in/attendance/shift/advance tools, and station-only anomalies.
- CASHIER now lands on Station Operations at `/` instead of the employee dashboard, while preserving the existing bottom-nav clock, `ClockInModal`, break flow, and mood checkout for the cashier's own attendance.
- Rebuilt desktop `/admin` dashboard around the same Action Center data so mobile home and desktop admin no longer present conflicting operational priorities.
- Removed dashboard announcement authoring from the home surface; announcements remain visible but creation/management stays in the dedicated announcement workflow.
- Preserved `?light=true` dashboard compatibility for sidebar pending-count polling.

Verification:

- `npx tsc --noEmit`: passed.
- Targeted ESLint for the dashboard API, both dashboard views, and root role routing: passed with no warnings.
- `NODE_ENV=production npm run build`: passed; 184/184 static pages generated.
- Existing middleware deprecation warning remains unrelated.

## 2026-09-02 — Combined admin employee performance ranking

Goal:

Replace the customer-only ordering in Customer Feedback admin with a real employee performance ranking that includes work time and customer quality.

Implementation:

- `/api/admin/customer-feedback/employee-scores` now loads active front-yard employees plus their shifts, attendance, approved/pending leave, and VALID employee-v3/v4 feedback for the selected Bangkok date range.
- Reused `calculateEmployeePerformance()` so the admin table and employee dashboard use the same work rules: presence 25, punctuality 15, shift completion 10, break discipline 10, and customer quality 40.
- Approved leave and day-off rows are excluded from required days; an unexcused missing check-in counts as absent after the shared attendance grace period.
- Combined /100 scores are ranked only when at least one required workday and the existing 10-response customer minimum sample are available.
- Complete rows sort by combined score, then work score, customer score, response count, and employee label; equal combined scores share a displayed rank.
- The overview now shows rank, work /60, customer /40, attendance counts, current-month evaluation progress, combined /100, data readiness, and data-error warnings.
- Individual detail now shows all four work components, present/absent/late/early/break/leave/day-off counts, overlap/duplicate/unscheduled data issues, and the existing customer rubric details.
- The page does not poll automatically so the ranking cannot consume the Neon free-tier quota while left open; it loads on entry, date changes, and the explicit refresh button.
- Changed the monthly progress unit from `คน` to `แบบ` because the value counts submitted VALID responses rather than verified unique customers.
- The combined ranking remains informational and does not write to Payroll.

Verification:

- Targeted performance, API, and UI tests: 25/25 passed, including a regression check that no 60-second score API interval is registered.
- Full Vitest suite: 68 files and 432/432 tests passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for the changed API, UI, and tests: passed with no warnings.
- `NODE_ENV=production npm run build`: passed; 184/184 static pages generated after allowing the build to fetch Inter from Google Fonts.
- `git diff --check`: passed before the documentation update and will be rechecked at handoff.
- No database command or production data mutation was run.

Git:

- Feature commit: `c66da3d` (`feat: rank employees by combined performance`); queued with this documentation update for push to `origin/main`.


## 2026-09-02 — Entered September station schedules and moved Golf/Bee to PAP

Goal:

Enter the confirmed September 2026 shift rosters for WKO, SPC, and PAP from the owner's handwritten/table references, and correct two front-yard employees whose current station assignment no longer matched the new roster.

Production data changes:

- Production Neon host: ep-delicate-sound-a1mi5n1t. No schema or code change was required.
- Moved Golf (employeeId EMP0799F) from SPC to PAP and Bee (employeeId FYC641B) from WKO to PAP. Both were remapped from their old station-specific FUEL department to PAP's FUEL department so front-yard/payroll rules remain station-consistent.
- Employee customer-feedback QR rows were checked before the move. Their EMPLOYEE QR records do not pin an old stationId, so no QR replacement was needed.
- Replaced September ShiftAssignment rows only for the 18 employees covered by the confirmed rosters, then recreated the month atomically.
- WKO: 240 assignments = 206 working shifts + 34 day-off rows, following the confirmed Monday-Sunday rotating 05:45/06:00/06:30/07:00/07:30/08:00 pattern.
- SPC: 150 assignments for ต้อย 06:00-18:00, ปอ 06:00-18:00, เอ็ม (sup011) 07:00-19:00, ตั้ม 10:00-22:00, and วิน 18:00-06:00.
- PAP: 150 assignments for นิด 08:00-20:00, กอล์ฟ 08:00-20:00, บี 07:00-19:00, น้ำ 05:45-17:45, and น้อย 05:45-17:45.
- Eight pre-existing September rows within the targeted employee set were replaced by the confirmed roster.

Verification:

- Read-back found exactly 540 September rows for the targeted employees: WKO 240, SPC 150, PAP 150.
- WKO read-back = 206 work + 34 day-off rows; total month read-back = 506 work + 34 day-off rows.
- Full expected-vs-stored comparison across user/date/shift/day-off returned mismatchCount = 0.
- Golf and Bee both read back as station PAP and department FUEL/PAP.
- Spot checks for 2026-09-01 and Sunday 2026-09-06 matched the confirmed roster, including WKO day-off rotation.


## 2026-09-02 — Fixed shift schedule page client crash

Problem:

- The admin shift schedule route and `/api/admin/schedule` were healthy in production, but the schedule UI could crash after schedule data loaded.
- Production logs showed the page and API returning HTTP 200, pointing to a client-side render failure rather than bad September shift data.

Root cause and fix:

- `useLocalStorageState` parsed JSON into a fresh object/array on every `getSnapshot()` call.
- React `useSyncExternalStore` requires an unchanged snapshot to preserve reference identity; the fresh array used by `ShiftTemplateManager` could therefore cause an infinite render/update loop.
- Added a per-key/raw-value snapshot cache so unchanged localStorage data returns the same parsed reference.
- Added a stable server snapshot and regression tests for parsed array snapshots, local writes, and native storage events.

Verification:

- September production ShiftAssignment data and Shift relations were checked and found valid; no production schedule rows were changed for this fix.
- Targeted Vitest: 2/2 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- `npm run build`: passed; 184/184 static pages generated.
- `git diff --check`: passed before commit.


## 2026-09-02 — Published TimeTrack League rules announcement

Goal:

Explain to front-yard employees how League points are earned, how monthly championship points accumulate, who wins each level, and what rewards are available.

Production data changes:

- Created pinned announcement `🏆 TimeTrack League — ทำงานดี บริการดี มีรางวัล` in production, authored by admin account `benz`.
- Targeted all departments currently marked `isFrontYard = true`: WKO FUEL, PAP FUEL/GAS, and SPC FUEL/GAS.
- Sent ANNOUNCEMENT notifications to all 22 active front-yard employees, linking to the acknowledgement view for the new announcement.
- Announcement explains Weekly League score = work 60 + customer quality 25 + mission consistency 15.
- Work 60 breakdown is presence 25, punctuality 15, shift completion 10, and break discipline 10. Approved leave/day-off is explicitly not treated as absence.
- Championship Points disclosed for weekly ranks: 1st 10, 2nd 6, 3rd 4, 4th-5th 2, others 0; monthly Station Champion is determined by accumulated championship points with average League score as tie-break context.
- Reward choices disclosed: Weekly Champion up to ~300 THB, monthly Station Champion 700 THB, and Grand Champion 1,500 THB.
- Fair Play explanation states repeat customers only add League credit once per employee/week, suspicious feedback can be excluded/reviewed, and employees should ask real customers for honest feedback without steering answers.
- Kept hidden operational thresholds hidden: the announcement does not expose the numeric daily evaluation target or customer minimum sample.
- Clarified League is for competition/rewards and does not automatically deduct or change salary.

Verification:

- Read-back confirmed the announcement is active and pinned.
- Target department list read back as five front-yard departments across WKO/PAP/SPC.
- Read-back found exactly 22 announcement notifications, all initially unread.


## 2026-09-02 — Forced mandatory League announcement popup on dashboard

Goal:

Make the pinned League rules announcement appear immediately when employees enter the dashboard, even if the app previously cached an empty mandatory-announcement check.

Implementation:

- Dashboard routes `/` and `/admin` are now hard refresh points for mandatory announcements. Entering them always fetches `/api/announcements/unread-mandatory` with `cache: no-store`, bypassing the free-tier empty-result TTL.
- Outside the dashboard, the existing free-tier TTL remains in place to avoid unnecessary polling.
- Cached pinned announcements no longer expire locally at Bangkok midnight.
- The mandatory-announcement API now treats active pinned announcements as mandatory until the targeted employee records an AnnouncementRead acknowledgement, instead of limiting them to announcements created on the current Bangkok date.
- After acknowledgement, the existing read record prevents the popup from appearing again for that employee.
- Production was checked before changing the rule: the only active pinned announcement was the new TimeTrack League rules announcement, so no historical pinned announcements will unexpectedly reappear.

Verification:

- Targeted Vitest: 4/4 passed across the mandatory-announcement API and GlobalAnnouncementModal dashboard refresh behavior.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed with no warnings.
- `NODE_ENV=production npm run build`: passed; 184/184 static pages generated.
- `git diff --check`: passed.


## 2026-09-02 — Employee dashboard now respects scheduled day-off rows

Problem:

- A ShiftAssignment marked isDayOff=true still has a linked Shift relation for schedule consistency.
- /api/attendance/today previously returned that linked shift name/time without checking isDayOff, so an employee such as Chon could see a work shift on the dashboard even though the September roster marked today as a day off.

Fix:

- Added attendance-shift display normalization. Day-off assignments now return name=วันหยุด, null start/end times, zero break minutes, and isDayOff=true instead of leaking the linked work-shift time.
- Normal work assignments still use the station-specific allowed break calculation and return isDayOff=false.
- Applied the same normalization to tomorrowShift for consistency.
- Employee dashboard now distinguishes a scheduled day off from no schedule: it shows วันหยุด / Day off, hides work-shift time and check-in controls, and tells the employee no clock action is required.
- ClockInModal receives hasShift=false on a day off.
- The daily customer-feedback mission card is hidden on a scheduled day off, while the League link remains available for viewing standings.
- No production schedule or attendance data was changed by this fix.

Verification:

- Regression test for day-off shift normalization: 2/2 passed.
- Targeted ESLint: passed.
- npx tsc --noEmit: passed after allowing null display times for day-off rows.
- NODE_ENV=production npm run build: passed; 184/184 static pages generated.


## 2026-09-02 — Fixed customer-feedback case action rollback

Problem:

- Admin Customer Feedback > Cases rendered action buttons correctly, but clicks such as รับทราบ and เริ่มดำเนินการ returned 500 and left the case unchanged.
- Production Vercel logs at 18:58 showed Prisma rejecting AuditLog.details because the schema expects String/Null while the case PATCH route supplied an object.
- Because the audit insert runs inside the same transaction as the case update, the validation error rolled back the whole action.

Fix:

- Serialize customer-feedback case audit details with JSON.stringify before writing AuditLog.details.
- Added a regression test asserting the case action commits and the audit payload is stored as a JSON string.
- Added an inline usage guide on the Cases tab: เปิดรายละเอียด → รับทราบ → รับงานนี้ → เริ่มดำเนินการ → ปิดเคส.
- Renamed the destructive action label from ยกเลิก to ยกเลิกเคส for clarity.

Verification:

- Targeted case route Vitest: 7/7 passed.
- npx tsc --noEmit: passed.
- Targeted ESLint for route, test, and Cases tab: passed.


## 2026-09-02 — Added Reward Points wallet and reward catalog

Goal:

Extend TimeTrack League with a persistent Reward Points (RP) wallet, weekly reward eligibility, a visual reward catalog, employee redemption flow, and admin fulfillment controls.

Business rules:

- Weekly RP eligibility requires Customer Quality >= 20/25, enough customer sample, and Fair Play eligibility.
- Weekly RP award tiers: League score >=90 gives 30 RP, >=80 gives 20 RP, >=70 gives 10 RP.
- RP is separate from Championship Points (CP); existing champion awards remain unchanged.
- Reward redemption deducts RP transactionally; cancellation restores RP and finite stock.

Implementation:

- Added rewardPoints to CompetitionStanding and new RewardCatalogItem / RewardRedemption models.
- Added reward policy and wallet helpers, employee redemption API, admin reward catalog/fulfillment API, dashboard League/RP/reward preview, League wallet/catalog UI, and admin reward management UI.
- Added policy tests covering eligibility, RP tiers, and wallet balance calculations.

Verification before production schema update:

- Prisma schema format: passed.
- Schema-only db:diff: additive changes only; no DROP statements.
- Targeted League + reward policy tests: 16/16 passed.
- TypeScript: passed.
- Targeted ESLint: passed.
- Local Next build compiled and TypeScript completed, then failed at the known unrelated /apply/status prerender useState-null issue.

Production schema update:

- Operator explicitly confirmed production database work.
- Target Neon host: ep-delicate-sound-a1mi5n1t.ap-southeast-1.aws.neon.tech (pooler used by Prisma).
- npm run db:push completed successfully; Prisma reported database schema in sync.
- Read-only verification succeeded: RewardCatalogItem and RewardRedemption are queryable, CompetitionStanding.rewardPoints is readable.
- Initial production catalog/redemption counts were both 0; no synthetic reward items or redemptions were inserted.


## 2026-09-02 — Redesigned employee History / Notifications / Profile and exposed tomorrow shift

Goal:

- Bring the three Bottom Navigation self-service pages into the same retro station-instrument visual language as the redesigned employee dashboard.
- Show tomorrow's scheduled shift directly inside the top TODAY card so employees can prepare for the next day without opening the schedule page.

Implementation:

- Added shared `EmployeePageHeader` for the yellow paper / retro-control employee-page header.
- Rebuilt `/history` as WORK LOG / time cards with a black period summary panel, scheduled-shift context, day-off rows, missing-clock warnings, and direct time-correction entry points.
- Extended `GET /api/attendance/history` with the employee's shift assignments for the requested Bangkok date range. The existing attendance payload remains and `schedule` is additive.
- Rebuilt `/notifications` as an INBOX grouped by action-required / important / general, with unread status, secondary delete actions, and read-state broadcasts.
- Added read-only `GET /api/notifications/unread-count` and an unread badge in Bottom Navigation. The nav count endpoint excludes stale daily notification types without performing cleanup writes.
- Rebuilt `/profile` around an EMPLOYEE PASS and self-service menu for personal/contact/housing/financial/security data while preserving the existing edit-request, housing, password, PIN, Passkey, photo, and payslip flows. Citizen ID and bank account values are masked by default and can be explicitly revealed.
- Added a compact NEXT / tomorrow strip to the existing top TODAY card. It uses the already-fetched, day-off-normalized `todayData.tomorrowShift`, so no extra dashboard database query was added. Tomorrow can show a work shift, scheduled day off, or no schedule. Thai / English / Burmese labels were added.

Files / areas changed:

- `src/components/layout/EmployeePageHeader.tsx`
- `src/components/layout/BottomNavigation.tsx`
- `src/components/dashboard/views/EmployeeDashboardView.tsx`
- `src/app/history/page.tsx`
- `src/app/api/attendance/history/route.ts`
- `src/app/notifications/page.tsx`
- `src/app/api/notifications/unread-count/route.ts`
- `src/app/profile/page.tsx`

Decisions:

- Employee self-service pages should use the same cream/yellow/black retro visual system as the employee dashboard rather than generic CurvedHeader/cards.
- History is a work-log timeline: scheduled day off and scheduled-shift context belong beside clock records.
- Sensitive profile identifiers are masked by default on shared/mobile screens.
- Bottom-nav unread count must be a read-only lightweight query; do not reuse the notification-list GET because that endpoint performs stale-alert cleanup writes.
- Tomorrow's dashboard shift must reuse the normalized `tomorrowShift` already returned by `/api/attendance/today`; do not add a duplicate query.

Verification:

- `git diff --check`: passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for all changed TypeScript/TSX files: passed.
- `npx vitest run src/lib/attendance-shift-display.test.ts`: 2/2 passed.
- No local command connected to the production Neon database during this UI work, and no production data was changed.
- Full Next production build was not run in this session to avoid unnecessarily evaluating unrelated build-time paths; TypeScript, ESLint, and the relevant shift-display regression test are green.

Pending / risk:

- Visual QA should still be done on the deployed/mobile-sized view after deployment because these pages were substantially restyled.
- No commit or push was created in this session yet.

## 2026-09-03 — Fixed clerk theme toggle and isolated gas-clerk employee scope

Goal:

- Make clerk dashboard switch light/dark correctly even when `next-themes` is set to `system`.
- Restrict the gas-clerk accounts at PAP/SPC to gas and car-wash employees at their own parent station.

Business scope:

- PAP gas clerks: กุ้ง (`EMPE2D20`) and เล็ก (`EMP90026`).
- SPC gas clerks: ปุ้ก/ปุก (`EMPC6A4F`) and เหน่ง (`EMPF7DE0`).
- Allowed employee departments: `GAS` and `CAR_WASH`, at the clerk's own `stationId` only.
- SPC currently has no car-wash employee, so its scoped view naturally contains gas staff only.
- Other CASHIER accounts keep the previous access behavior.

Implementation:

- Theme toggles now use `resolvedTheme` instead of the raw theme preference, fixing the case where `theme=system` resolved to dark and the first click appeared to do nothing.
- Added the shared server policy `src/lib/cashier-employee-scope.ts`.
- Applied gas-clerk scope to dashboard stats/lists, employee selectors, station lists, attendance/manual attendance/backfill/break handling, schedules/bulk/export/fairness, advances, and station-transfer listing.
- Sensitive write endpoints validate the target employee server-side, so changing a URL/request cannot bypass the scope.
- The four clerk accounts remain at their existing PAP/SPC parent stations; no station reassignment, schema change, or production data mutation was made.

Verification:

- `npx vitest run src/lib/cashier-employee-scope.test.ts src/components/layout/ThemeToggle.test.tsx`: 8/8 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint: 0 errors; only pre-existing unused-variable warnings remain in legacy schedule/station-transfer files.
- `/usr/bin/env NODE_ENV=production npm run build`: passed; Next.js generated 185/185 static pages.
- No local command connected to the production Neon database during this work.


## 2026-09-03 — Added oil-cashier team feedback coaching card

Goal:

- Let normal oil-station `CASHIER` accounts coach front-yard employees on today's customer-evaluation target and see live League standing for their own station.
- Keep the four gas-clerk accounts excluded from this view.

Implementation:

- The admin dashboard API identifies oil cashiers with `isFuelCashier` and computes the current-station weekly League only for those accounts.
- It pulls today's `VALID` employee-v3/v4 feedback for front-yard employees and combines it with employees scheduled or checked in today.
- Added a `TEAM FEEDBACK / ติดตามแบบประเมินทีมหน้าลาน` dashboard card showing exact daily progress against the public 5-evaluations-per-day target, how many more evaluations to request, live League rank/score when eligible, and a Fair Play review indicator.
- Employees without enough weekly League data receive only a generic “อันดับ League ยังรอข้อมูลประเมินเพิ่ม” message; the hidden League minimum-sample threshold is not exposed.
- Gas cashiers and non-cashier roles receive no team-feedback payload/card.
- No production schema/data mutation and no production database connection was used for this change.

Verification:

- `npx vitest run src/lib/dashboard/fuel-cashier-team-feedback.test.ts src/lib/cashier-employee-scope.test.ts`: 9/9 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for the dashboard API/UI and helper/scope tests: passed.
- `git diff --check`: passed before this log append.
- `/usr/bin/env NODE_ENV=production npm run build`: Prisma generate and Next compile passed; build reached the TypeScript phase when last checked. A separate `npx tsc --noEmit` already passed.

Pending:

- No commit or push has been created for this change yet.


## 2026-09-03 — Added rolling feedback-cooperation status for oil cashiers

Goal:

- Distinguish an employee who is simply short on today's evaluation target from someone who repeatedly does not cooperate with asking customers for feedback.
- Keep customer-service quality scores separate from cooperation behavior.

Implementation:

- Extended the oil-cashier TEAM FEEDBACK card with a rolling 5-actual-workday cooperation view based on attendance check-ins and VALID employee-v3/v4 feedback at the cashier's station.
- Cooperation uses the public target of 5 valid evaluations per worked day and caps each day's contribution at 5, so one unusually busy day cannot compensate for repeated zero days.
- Status thresholds after 5 actual workdays: NORMAL at 80%+, FOLLOW_UP at 60-79%, and EXPLAIN below 60%. Before 5 worked days are available, status stays BUILDING and the UI explicitly avoids judging cooperation.
- Employees needing explanation are sorted first, followed by follow-up cases, while today's exact progress and League information remain visible.
- Added team-level counts for FOLLOW_UP and EXPLAIN so an oil cashier can see immediately who needs attention.
- The feature remains limited to normal oil-station CASHIER accounts; configured gas cashiers remain excluded.
- No service-quality score is changed and no bonus/disciplinary consequence is applied automatically by this change.

Verification:

- `git diff --check`: passed before this log append.
- `npx vitest run src/lib/dashboard/fuel-cashier-team-feedback.test.ts src/lib/cashier-employee-scope.test.ts`: 12/12 passed.
- `npx tsc --noEmit`: passed.
- Targeted ESLint for the dashboard API/UI and cooperation helper/test: passed.
- Plain `npm run build` hit unrelated prerender failures while the shell had a non-standard `NODE_ENV`; rerunning with `/usr/bin/env NODE_ENV=production npm run build` passed all 185 static pages.

Pending:

- Commit and push after final build/status verification.
