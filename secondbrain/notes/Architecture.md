---
tags:
  - secondbrain
  - architecture
updated: 2026-09-08
---

# Architecture

## Attendance calculation

Raw worked hours are calculated during check-out/admin attendance editing and stored on `Attendance.actualHours`.

Legacy `Attendance.overtimeHours` may reflect older logic based on hours above 8. For payroll from the new-rule effective date onward, do not treat that field as the payroll OT source for WKO/PAP/SPC rule branches.

## Payroll calculation flow

Primary path:

1. `src/lib/payroll-service.ts`
   - Loads employees, attendance, overrides, advances, special income, and payroll config.
   - Passes employee station code into payroll calculation.
2. `src/lib/payroll-calculation.ts`
   - Builds per-day payroll records.
   - Calls station pay rules.
   - Applies manual payroll overrides.
   - Aggregates earnings and deductions.
3. Consumers use the same calculation result:
   - Admin payroll API/UI.
   - Employee daily payroll view.
   - Wallet API/UI.
   - Payroll reports.
   - Excel export.
   - Accounting export.
   - Payroll finalization / stored payroll record.

## Station OT / early-leave rules

File: `src/lib/station-pay-rules.ts`

Effective from: `2026-08-26`.

Rules:

- `WKO`, `PAP`, `PAP_GAS`: threshold 10.5h.
- `SPC`, `SPC_GAS`: threshold 11h.
- OT rate: 35 THB/hour for hours above threshold.
- Below threshold on a completed shift: 50 THB flat deduction.
- Exactly threshold: no OT / no early-leave deduction.
- Incomplete shift: no early-leave deduction.

OT hours are calculated continuously from actual decimal hours; partial hours are paid proportionally.

## Overrides

`DailyPayrollOverride.overrideOT` has priority over automatic station OT amount.

Late penalties remain separate from the new early-leave deduction so UI/report labels and totals stay semantically correct.

## Finalized payroll

`PayrollRecord` has no dedicated early-leave column. During finalization, the early-leave deduction is included with `otherDeduct` while late penalty remains in `latePenalty`.


## Customer Feedback employee score flow

Current employee QR flow uses `employee-v3` for new visits while retaining v1/v2 compatibility. Normalized answer rows store each of the 9 rubric answers.

Admin score path:

1. `/api/admin/customer-feedback/employee-scores` loads active front-yard employees under the authenticated station scope, then bulk-loads shifts, attendance, approved/pending leave, and STANDARD + VALID + EMPLOYEE `employee-v3/v4` responses for the selected Bangkok date range.
2. `src/lib/customer-feedback/employee-score.ts` computes customer quality /64 from fixed Caltex criterion weights and excludes UNSURE from each criterion's denominator.
3. `src/lib/employee-performance.ts` computes work /60 from presence, punctuality, shift completion, and break discipline, then converts customer quality to /40.
4. An employee receives a combined /100 score and rank only after at least one required workday and the existing 10-response customer minimum sample are available.
5. The API sorts complete scores first and returns attendance counts plus overlap/duplicate/unscheduled data issues for admin review.
6. `คะแนนพนักงาน` in `/admin/customer-feedback` shows the combined ranking and an individual breakdown for work /60, customer /40, attendance events, data issues, evaluation progress, and all customer criteria.
7. The screen does not poll automatically to protect the Neon free-tier quota. It loads on entry, date-range changes, and the explicit refresh button.

Employee self-service visibility path:

1. `/api/employee/dashboard` uses VALID customer responses for its private performance calculation but does not return exact response counts, collection targets, or minimum-sample thresholds.
2. `EmployeeDashboardView` contains no collection-progress card or count state.
3. `/api/customer-feedback/me` uses the exact count internally only to decide whether the minimum sample is met; its response omits exact counts, the minimum threshold, rating distributions, suspected-response counts and per-reason counts.
4. `CustomerFeedbackSelfSummary` shows a neutral collection message before the score is ready. Afterward it shows the score, positive/negative rates and ordered reason topics without response totals.
5. Admin Customer Feedback routes and screens keep exact counts and the separate monthly 60-response benchmark.

The combined score path is intentionally separate from Payroll. No performance or Customer Feedback score is persisted into payroll records or bonus amounts by this flow.

## Chinese New Year bonus forecast flow

1. ADMIN/HR choose one existing `ReviewPeriod` in `/admin/performance`; the selected period ID is stored in `SystemConfig` under `chinese_new_year_bonus.review_period_id.v1`.
2. `/api/employee/chinese-new-year-bonus` resolves a role profile for the authenticated active user: `FRONT_YARD` for active front-yard `EMPLOYEE`, or `FUEL_CASHIER` for a normal oil-station `CASHIER`. The four department-scoped gas cashiers are intentionally excluded from the fuel-cashier profile.
3. `src/lib/chinese-new-year-bonus.ts` is the pure policy layer. Front-yard weights remain 25/30/15/20/10. Oil-cashier score is fully automatic: equal-weight front-yard employee performance 60 + station customer score 20 + restroom score 20, using the same payout tiers.
4. Front-yard calculation reads the person's attendance/shift/leave, own VALID employee-v3/v4 feedback, supervisor rating, and unresolved safety cases. Open safety cases are a review gate only and do not subtract points/money automatically.
5. Oil-cashier calculation reuses the station-linked 60/20/20 score. Once complete finalized weekly cashier reports overlap the configured CNY period, the employee forecast uses their equal-weight component average; incomplete weeks stay provisional instead of becoming zero. Before any ready finalized week exists, the raw in-period station calculation is the fallback.
6. `/api/admin/performance/chinese-new-year-bonus` keeps manual supervisor/SOP scoring for front-yard employees only. Oil cashiers are no longer manual review targets because their 60/20/20 score is automatic.
7. `ChineseNewYearBonusCard` is the single full-size cashier score surface on Dashboard; the RP card shows wallet/current-week RP information without duplicating a separate weekly cashier-score card.
8. Exact response counts, the hidden customer-score minimum sample, and per-response detail are not returned by the employee bonus endpoint. This entire path remains outside Payroll; actual bonus payment remains a separate explicit/manual payroll decision.

## Competition Reward Points flow

The employee competition has three separate score concepts:

1. Live/final weekly `League Score` starts from work /60, customer /25, and mission /15. A manager-recorded transfer to help another station adds +1 support point per distinct Bangkok day, capped at +3/week; the final total remains capped at 100.
2. Final weekly rank grants `Championship Points (CP)` for monthly ranking.
3. Final weekly performance may grant spendable `Reward Points (RP)` using `src/lib/competition/reward-policy.ts`.

Support-station persistence and trust boundary:

- Only `StationTransfer.method = MANAGER` with `toStationId` different from the employee's League/home station counts. `SELF_QR` transfers never earn support points.
- `CompetitionStanding.supportPoints` and `supportDays` freeze the contribution for weekly history and let employee/admin UI explain the bonus.
- Support points affect CP/RP only indirectly through the capped League score/rank; all existing eligibility, customer-quality and Fair Play gates still apply. Fuel-cashier RP-only standings store zero support points.

Reward eligibility is intentionally stricter than League ranking eligibility. A weekly standing can still rank for CP when it has the normal minimum customer sample, but RP requires Customer Quality >= 20/25 in addition to eligible workdays and resolved Fair Play. Live calculations expose the reason separately so UI can distinguish “sample not ready” from “quality below threshold.”

Persistence:

- `CompetitionStanding.rewardPoints` freezes RP earned from finalized `WEEKLY_STATION` periods.
- `RewardCatalogItem` stores active rewards, RP cost, optional stock, optional image data/HTTPS URL, and the current featured week key.
- `RewardRedemption` stores the employee, station snapshot, item, RP-cost/title snapshots, status, fulfillment actor, and timestamps.
- Wallet balance = finalized weekly RP earned minus `PENDING` + `FULFILLED` redemption cost. `CANCELLED` rows do not consume RP.

Read/write paths:

- `src/lib/competition/reward-wallet.ts` returns wallet history and active/featured catalog data.
- `/api/league` exposes only the authenticated employee's wallet plus public competition data.
- `/api/league/points/redeem` rechecks current-week reward eligibility, then rechecks balance and stock inside a serializable transaction before creating a pending redemption.
- `/api/admin/league/rewards` is restricted to ADMIN/HR and manages catalog, current weekly feature, fulfillment, cancellation, stock restoration, and audit logs.
- Employee Dashboard is a compact summary; `/league` is the detailed wallet/catalog/redemption view; `/admin/league` is the operations surface.

Champion awards (`CompetitionAward` and `/api/league/reward`) remain independent. RP redemption must not mutate CP or replace the champion-award workflow.


## 2026-09-07: Weekly result read model
- `competition/weekly-results.ts` serves both `/api/league` and `/api/admin/league` after each endpoint resolves station scope.
- `previousWeekly` identifies the exact closed Bangkok week, all standings, finalization state and champion reward; `latestWeekly` identifies the latest finalized period with an actual winner.
- For absent/OPEN periods, read-only calculation uses week-end reference time and strips official ranks. FINALIZED/PENDING_REVIEW use frozen rows.
- `components/league/weekly-result.tsx` renders the shared prior-week card and compact Dashboard champion banner, including truthful reward selection/delivery status.

## 2026-09-08: ShiftAssignment logical-date invariant

- A schedule date such as `2026-09-07` represents Bangkok midnight and must be stored as `2026-09-06T17:00:00.000Z`.
- Individual and bulk schedule writes must use `parseDateStringToBangkokMidnight` for `YYYY-MM-DD` payloads. Do not use `new Date("YYYY-MM-DD")`, which produces UTC midnight and can create two database rows that map to the same Bangkok calendar day.
- The admin schedule read model converts stored timestamps to Bangkok calendar keys, so preserving one canonical Bangkok-midnight row per employee/day is required for deterministic display and League attendance calculations.
