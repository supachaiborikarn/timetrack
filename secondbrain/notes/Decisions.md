---
tags:
  - secondbrain
  - decisions
updated: 2026-09-02
---

# Decisions

## 2026-09-02: Reward Points are separate from Championship Points

- `League Score` measures weekly performance and `Championship Points (CP)` determine monthly competition ranking; neither is spendable.
- `Reward Points (RP)` are a separate spendable wallet so redeeming a prize can never reduce or reorder the monthly Championship.
- Weekly RP is frozen only when a weekly station period is finalized: 90-100 = 30 RP, 80-89.99 = 20 RP, 70-79.99 = 10 RP, below 70 = 0 RP.
- Reward access requires an eligible work week, the normal minimum customer sample, Customer Quality >= 20/25, and no unresolved Fair Play review. Failure is shown explicitly as no eligible workdays, insufficient sample, customer quality below threshold, or Fair Play review.
- Redemption reserves RP immediately (`PENDING` counts as spent). Cancelling a pending redemption returns RP and restores limited stock; fulfillment permanently consumes the points.
- ADMIN/HR own the global reward catalog and featured weekly reward. Existing fixed champion rewards remain a separate award path and are not replaced by RP.

## 2026-08-27: Keep project memory in `secondbrain/`

The timetrack persistent project memory lives under `secondbrain/` and is committed with the repository. This allows future AI/dev sessions to resume from repository state rather than relying on chat history.

## 2026-08-26: Station-based OT and early-leave policy

Effective date: `2026-08-26`.

- วัชรเกียรติ / พงษ์อนันต์ threshold: 10.5 hours.
- ศุภชัย threshold: 11 hours.
- Above threshold: pay only excess time at 35 THB/hour.
- Below threshold on a completed shift: deduct 50 THB flat.
- Exactly threshold: neither OT nor early-leave deduction.
- Do not deduct 50 THB while a shift is incomplete / has no checkout.
- Gas branches follow their parent station policy (`PAP_GAS`, `SPC_GAS`).

## 2026-08-26: Payroll calculation is the monetary source of truth

Do not duplicate monetary OT logic across Attendance, Wallet, Payroll, reports, and exports. Compute the station rule in shared payroll logic and consume that result downstream.

Attendance may still retain legacy `overtimeHours` for historical/attendance purposes, but payroll uses the station rule from the effective date onward.

## 2026-08-26: Manual OT override remains authoritative

If HR sets `overrideOT`, that amount overrides automatic station OT for that day. This preserves existing payroll correction workflow.

## 2026-08-26: Early-leave deduction stays separate from late penalty

The 50 THB under-threshold deduction is a distinct payroll deduction and should be presented as `หักกลับก่อนเกณฑ์`, not merged into `หักสาย` in calculations or UI.

## 2026-08-28: Customer Feedback A4 print branding and hierarchy

- Use Caltex as the master brand for Customer Feedback A4 signs, with `ENJOY THE JOURNEY` as the brand line.
- EMPLOYEE signs use first-person invitation copy and make the approved public employee name the largest visual element.
- STATION signs use collective invitation copy and a smaller station-name hierarchy.
- Branding/layout changes must not bypass QR reveal auditing, print confirmation, `needsReprint`, or employee public-profile acknowledgement.
- The final approved A4 visual reference is the white/red/deep-teal Caltex composition: official Caltex lock-up at top-left, oversized red public employee name, handwritten-style service question, position/station identity rows, dark-teal three-column information band, elevated right-side QR card with Caltex centre mark, eight separate fallback-code cells, and the red/teal Techron footer sweep. Implement it as live HTML/CSS with dynamic QR/name/position/station/code values, not as a static poster PNG.
- Preserve the reference proportions in A4 landscape and keep the QR card plus all eight fallback-code cells fully visible above the footer sweep.

## 2026-08-29: Auto-activate employee feedback QR when acknowledgement is recorded

- Recording EMPLOYEE public-profile acknowledgement must activate that same current QR version immediately when the employee is active and no other employee QR is active. This lets the operator scan/test the QR from print preview without waiting for a later print-confirmation dialog.
- Acknowledgement/activation does **not** claim the sign was printed: keep `needsReprint=true` and `lastPrintedAt` unchanged until a real print/save-PDF is confirmed.
- `reveal` is a recovery/self-heal point for already-approved inactive EMPLOYEE rows: before returning the token for printing, it atomically activates the current eligible QR version. This covers rows acknowledged before this rule was deployed.
- `MARK_PRINTED` remains the source of truth for physical print completion; it records print metadata, clears `needsReprint`, and keeps the employee QR active.
- Rotating an already-approved, eligible EMPLOYEE QR must keep or restore the newly generated version as active atomically. The old token/manual code becomes invalid immediately, but the returned replacement QR must be scannable from the print preview; `needsReprint` remains true until print confirmation.
- Intentionally deactivated or conflicting/stale QR states must not be silently revived outside these authenticated acknowledgement/print flows.
- STATION QRs keep the existing two-step lifecycle: confirmed print clears `needsReprint`, then activation remains manual.

## 2026-08-29: Customer Feedback small-label print design

- Historical note: the original admin `ป้ายเล็ก` action used a 105 x 148 mm portrait template. This size is superseded by the 54 x 88 mm decision dated 2026-08-30 below.
- Reuse the Caltex lock-up, oversized red public target label, handwritten-style service question, deep-teal information treatment, fallback-code cells, and red/teal Techron footer sweep so small and A4 signs read as one family.
- Historical note for the superseded 105 x 148 mm design: its QR was rendered at 54 mm. The current 54 x 88 mm decision below replaces that physical QR size with a 35 x 35 mm unobstructed white field while preserving the QR quiet zone.
- Keep all QR/public label/position/station/manual-code values live and preserve the existing authenticated `reveal` -> print confirmation -> `MARK_PRINTED` / `needsReprint` lifecycle.


## 2026-08-30: Employee small labels are 54 x 88 mm and support batch A4 printing

- Employee Customer Feedback small labels use the exact physical size **54 x 88 mm portrait**. This supersedes the previous 105 x 148 mm compact-label size.
- Keep the Caltex visual family, live employee/public/station/manual-code data, and an unobstructed QR. At this smaller size the QR field is 35 x 35 mm on white, prioritizing scan reliability over decorative QR treatment.
- Batch printing uses **A4 portrait, 3 columns x 3 rows = 9 employees per sheet**. Each slot remains exactly 54 x 88 mm with 4 mm horizontal/vertical cut spacing; 3 labels plus gaps occupy 170 mm of the 210 mm A4 width, and 3 rows plus gaps occupy 272 mm of the 297 mm height.
- More than 9 selected employees automatically continue onto the next A4 page. Cut guides sit in the spacing rather than changing the label dimensions.
- Only eligible EMPLOYEE QRs with public-profile acknowledgement and an active employee can be selected for batch printing.
- Batch print must preserve the same security/audit lifecycle as single print: authenticated `reveal` per QR, operator print/PDF confirmation, then `MARK_PRINTED` per successfully printed QR version. Do not mark items printed merely because the A4 preview was generated.
- Keep reveal/mark operations in bounded concurrency chunks to avoid a large selection spiking the production database connection pool.

## 2026-08-29: Customer Feedback employee score uses versioned 64-point rubric

- Do not reinterpret historical `employee-v2` answers as Caltex checklist scores. Keep v2 immutable and use `employee-v3` for the 64-point rubric.
- Rubric weights are fixed at 15, 10, 3, 10, 3, 4, 5, 4, 10 (total 64).
- YES earns the criterion, NO earns zero, and UNSURE is removed from that criterion's denominator; UNSURE must not become an automatic penalty.
- Aggregate each criterion independently as YES/(YES+NO) x criterion weight so each checklist item keeps its intended weight.
- Hide the numeric employee score until at least 10 VALID employee-v3 responses exist.
- In Customer Feedback admin, expose employee scores through both an overview comparison and an explicit per-employee view; do not rely on an inline expanded row as the only way to inspect one employee.
- Customer-feedback score is only evidence for a future bonus calculation; it must not alter Payroll automatically without a separately approved bonus rule.
- Admin management monitoring keeps the existing monthly benchmark of 60 VALID `employee-v3` evaluations per Bangkok calendar month.
- Employee self-service must not expose evaluation counts, collection targets, minimum-sample thresholds, distributions or per-reason counts. Employees see a neutral collection status until a score is ready, then see only the score, rates and ordered reason topics. Admin monitoring retains the monthly 60-response benchmark and exact counts.

## 2026-09-02: Admin employee ranking uses complete 60/40 performance score

- The Customer Feedback admin employee table ranks active front-yard employees by the same performance inputs used on the employee dashboard: attendance-derived work performance 60 points and VALID customer quality 40 points.
- Work performance is presence 25, punctuality 15, shift completion 10, and break discipline 10.
- Attendance, shifts, leave, and customer responses use the same selected Bangkok date range so the two score components describe one period.
- Approved leave and day-off assignments are excluded from required workdays; an unexcused missing check-in counts as absent after the shift start plus the shared attendance grace period.
- A combined rank is assigned only when the employee has at least one required workday and the customer rubric has reached the existing 10-response minimum sample.
- Incomplete rows remain visible below ranked employees with the missing-data reason, work score, customer sample progress, and operational data issues.
- Tied overall scores share the same displayed rank; secondary ordering uses work points, customer points, response count, and employee label.
- The ranking screen must not poll automatically because repeated multi-table reads can consume the Neon free-tier quota while an admin leaves the tab open; refresh only on entry, date changes, or an explicit button click.
- This ranking remains informational and does not write bonus, deduction, or payroll values automatically.


## 2026-09-02: Employee self-service pages share the dashboard retro visual system

- `/history`, `/notifications`, `/profile`, and `/profile/documents` use the same cream paper, Caltex-yellow, black instrument-panel, hard-border, and retro-control language as the employee dashboard instead of generic curved headers/cards.
- `/profile/documents` replaces wide horizontal table layouts with mobile-optimized tactile payslip cards featuring quick earnings/deductions/net breakdown, collapsible line items, and direct PDF download controls for payslips and payment receipts.
- History is treated as a work log, so schedule context (including scheduled day off) is displayed alongside attendance records; current/future schedule data must not make future dates appear as past history.
- The top employee dashboard card shows tomorrow's assignment using the already-normalized `tomorrowShift` from `/api/attendance/today`; day off and missing schedule are explicit states and no duplicate dashboard schedule query should be introduced.
- Bottom Navigation may show notification unread count, but its count request must remain read-only and lightweight; do not call the notification-list endpoint from global navigation because that endpoint also performs stale-alert cleanup.
- Citizen ID and bank account number are masked by default in employee Profile and require an explicit reveal action before the full value is shown.
