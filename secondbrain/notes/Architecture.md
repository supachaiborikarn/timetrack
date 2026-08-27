---
tags:
  - secondbrain
  - architecture
updated: 2026-08-27
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
