---
tags:
  - secondbrain
  - decisions
updated: 2026-09-04
---

# Decisions

## 2026-09-04: Chinese New Year bonus is a forecast-only 100-point score

- The employee-facing Chinese New Year bonus is a **forecast of the percentage of the base bonus**, not an automatic payroll instruction. It must never write `PayrollRecord`, `adjustment`, or any bonus amount automatically.
- Role profiles share the same 100-point/tier system but use different weights: front-yard employees = attendance 25, own customer quality 30, own evaluation cooperation 15, supervisor/SOP 20, discipline/safety 10; normal oil-station cashiers = attendance 25, team service quality 20, team evaluation cooperation 15, cashier work/SOP 30, discipline/safety 10.
- The oil-cashier profile deliberately makes **35% team-linked + 65% personal** so cashiers have a reason to remind/coach the forecourt team while their payout is not dominated by other people. The four department-scoped gas cashiers are excluded from this oil-cashier profile.
- Payout forecast tiers: score 90+ = 100% of base bonus, 85–89.9 = 90%, 80–84.9 = 80%, 75–79.9 = 70%, 70–74.9 = 50%, below 70 = 0%.
- Missing components are **not treated as zero**. The preview normalizes only the weight that is currently available and marks the result provisional; the UI shows the distance to the next payout tier.
- Attendance uses the existing presence component /25. Discipline uses punctuality + shift completion + break discipline normalized to /10 after removing the attendance-rate multiplier so absence is not penalized twice.
- Front-yard customer quality uses the existing employee-v3/v4 rubric /64 normalized to /30. Oil-cashier team quality gives each active front-yard teammate equal weight, normalizes to /20, and stays `WAITING` until every active teammate has reached the existing minimum valid-sample rule; this avoids rewarding cherry-picking only high-scoring/high-volume staff.
- Evaluation cooperation uses consistency by actual worked day: each worked day is capped at the current daily mission target (5 VALID evaluations), then daily completion is averaged and scaled to /15. For an oil cashier, the /15 component is the average across teammates who actually have worked days in the selected period. The employee-facing bonus card must not expose exact response counts or the hidden customer-score minimum sample.
- Supervisor/SOP uses the existing `ReviewSubmission.rating` 1–5. It maps to /20 for front-yard employees and /30 for oil cashiers. The admin surface can record this only after the person has created the existing self-assessment submission; missing submission stays `WAITING`, never automatic zero.
- Open employee-safety feedback cases do not deduct bonus automatically. They make the preview provisional until reviewed, preserving the rule that a single customer response cannot automatically become a monetary/disciplinary penalty.
- ADMIN/HR select the ReviewPeriod used for the bonus through `SystemConfig` key `chinese_new_year_bonus.review_period_id.v1`. This reuses the existing period and review models and requires no Prisma schema change.

## 2026-09-04: System-wide Retro-Tactile & Caltex Command Center design standard (Phases A through E)

- **Comprehensive coverage across all application tiers**:
  - **Employee Surfaces (Phase A)**: Mobile-optimized `max-w-[480px]` container, `#eee8db` cream paper background, `EmployeePageHeader`, and `.tt-paper-card .tt-instrument-frame`.
  - **Public & Careers (Phase B)**: Caltex Careers brand styling, high-contrast application tracker, and multi-step candidate application flows.
  - **Admin Operations (Phase C)**: Dark Command Center headers (`rounded-[24px] border border-zinc-700/35 bg-zinc-950 text-white`), Caltex yellow eyebrow labels (`tracking-[0.2em]`), and instrument metric frames.
  - **Admin Payroll & Financials (Phase D)**: Financial operations command cards, summary KPI instrument frames, and structured income/deduction breakdowns.
  - **Admin Service Excellence & Governance (Phase E)**: Command headers, tactile pill tab selectors, and high-contrast matrix cards across Voice of Customer (VOC), Service League, Staff Registry, Organization Architecture, Branch Network, Geolocation, Housing, and Security/Audit logs.
- **Strict Preservations**: 100% of underlying server actions, API route contracts, database mutations, and permission guards are preserved with zero regression.

## 2026-09-03: Unified Retro-Tactile Dashboard design system across all employee routes

- All employee routes adhere strictly to the Retro-Tactile Dashboard design system:
  - Container tokens: `min-h-screen bg-[#eee8db] dark:bg-zinc-950 pb-28 font-sans text-zinc-950 dark:text-zinc-50 overflow-x-hidden`.
  - Max-width constraint: `max-w-[480px] mx-auto p-4 space-y-4` (or responsive desktop max-w-6xl for announcements feed).
  - Common header: `<EmployeePageHeader eyebrow="..." title="..." subtitle="..." backHref="..." right={...} />`.
  - Content containers: `.tt-paper-card .tt-instrument-frame rounded-[20px] border border-zinc-700/35 dark:border-white/15 p-4 shadow-[0_2px_0_rgba(0,0,0,0.06)]`.
  - Action controls: `.tt-retro-control bg-[#fbbf24] hover:bg-[#f59e0b] text-zinc-950 font-black rounded-xl active:scale-[0.98]`.
  - Monospace font for time, numeric figures, and badge counters.
- Applied across Phase 1 (`/requests/time-correction`, `/advances`, `/qr-scan`), Phase 2 (`/requests`, `/requests/overtime`, `/requests/shift-swap`, `/requests/incoming`, `/schedule`, `/shift-pool`), and Phase 3 (`/wallet`, `/performance`, `/announcements`, `/announcements/[id]`, `/league`).
- All business logic, attendance source-of-truth, and payroll calculation rules remain strictly unchanged.

## 2026-09-03: Gas cashiers use department-limited station scope

- PAP gas clerks กุ้ง (`EMPE2D20`) / เล็ก (`EMP90026`) and SPC gas clerks ปุ้ก (`EMPC6A4F`) / เหน่ง (`EMPF7DE0`) remain `CASHIER` accounts at their existing parent PAP/SPC stations.
- Their operational employee scope is server-enforced as: current `stationId` + `role=EMPLOYEE` + department code `GAS` or `CAR_WASH`.
- Do not rely on client-side filtering for this boundary; every CASHIER-accessible employee read/write surface must apply the shared gas-cashier policy.
- Other CASHIER accounts retain the prior access model.
- Do not move these accounts or their employees to `PAP_GAS` / `SPC_GAS` merely to implement dashboard visibility; current attendance/payroll data uses the parent-station employee assignments.

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

## 2026-09-03: Phase 1 Employee Self-Service routes redesigned to Retro-Tactile Dashboard Visual System

- Expanded the retro-tactile visual language (cream paper `#eee8db`, dark mode `zinc-950`, Caltex yellow `#fbbf24`, `EmployeePageHeader`, `.tt-paper-card`, `.tt-instrument-frame`, and `.tt-retro-control`) to Phase 1 primary routes:
  - `/requests/time-correction`: Migrated from legacy Slate-900 to tactile ticket style with 14-day date picker, retro time input, evidence attachment, and tactile history cards.
  - `/advances`: Migrated from legacy dark brown `#1a1412` to retro instrument meter summary, month stepper, and tactile request modal with Sonner toast feedback.
  - `/qr-scan`: Migrated from Slate-900 camera frame to retro viewfinder with Caltex-yellow corner guides, tactile camera controls, and high-contrast status feedback card.
- Retained full compatibility with existing API endpoints, Geofence checks, device fingerprinting, and Next.js client caching patterns.


## 2026-09-04: Restroom feedback uses a dedicated survey and attendance-based housekeeper attribution

- Restroom cleanliness uses its own immutable survey version `restroom-v1`; do not reuse or reinterpret `station-v1` or employee survey answers for restroom scoring.
- Create restroom QR rows as STATION targets with `placement=RESTROOM`, default `placementKey=RESTROOM_MAIN`, and `serviceAreaKey=restroom`.
- Restroom responses may be attributed to a housekeeper only from real attendance at submission time and only when exactly one unique active MAID/แม่บ้าน employee is on duty at that station. If none or more than one match, keep the response unattributed rather than guessing.
- Restroom score is 100 points: 40 from the 1–5 overall rating and 60 from the five cleanliness checklist criteria. `UNSURE` is excluded from the checklist denominator.
- Hide the numeric housekeeper restroom score until at least 10 VALID attributed restroom responses exist.
- Restroom feedback remains part of the standard Customer Feedback funnel/summary, while its employee-level score is shown separately from front-yard employee service scores.


## 2026-09-04: WKO Joy is excluded from restroom QR scoring

- Joy (`จอย`) at WKO is a home housekeeper, not station/restroom housekeeping staff.
- She must never be selected for `restroom-v1` attendance-based attribution, listed in the admin restroom-score view, or shown a restroom-score card in employee self-service.
- If a restroom response was previously attributed to this excluded identity, management reporting must treat it as unattributed rather than scoring Joy.
- Department `MAID` alone is not sufficient proof that an employee is responsible for station restrooms; explicit business-role exclusions take precedence.


## 2026-09-04: League leaderboard visibility follows station scope

- ADMIN/HR may switch between active petrol stations to inspect current League standings.
- MANAGER/CASHIER are station-scoped on the server and may view only the League standings for their current station.
- CASHIER access to League is read-only; competition moderation, Fair Play decisions, reward fulfillment, and Reward Points administration remain management functions.
- Station scope must be enforced by the API rather than relying only on hidden UI controls.
