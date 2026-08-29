---
tags:
  - secondbrain
  - architecture
updated: 2026-08-29
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

1. `/api/admin/customer-feedback/employee-scores` reads only STANDARD, VALID, EMPLOYEE, `employee-v3` responses within the requested date/station scope.
2. `src/lib/customer-feedback/employee-score.ts` computes per-criterion YES rates with fixed Caltex weights and excludes UNSURE from that criterion's denominator.
3. Numeric scores remain hidden below the existing 10-response minimum sample.
4. `คะแนนพนักงาน` in `/admin/customer-feedback` has `ภาพรวมคะแนน` and `รายบุคคล` subviews. Overview ranks employees and links into individual detail; individual detail supports employee/station search and shows score /64, VALID sample status, YES/NO/UNSURE totals and all 9 weighted criteria.

The score path is intentionally separate from Payroll. No Customer Feedback score is persisted into payroll records or bonus amounts by this flow.
