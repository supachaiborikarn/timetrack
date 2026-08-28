---
tags:
  - secondbrain
  - decisions
updated: 2026-08-28
---

# Decisions

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
