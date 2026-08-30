---
tags:
  - secondbrain
  - decisions
updated: 2026-08-29
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

- The admin `ป้ายเล็ก` action uses a dedicated 105 x 148 mm portrait template derived from the approved A4 Caltex visual system.
- Reuse the Caltex lock-up, oversized red public target label, handwritten-style service question, deep-teal information treatment, fallback-code cells, and red/teal Techron footer sweep so small and A4 signs read as one family.
- Keep the compact-label QR completely unobstructed: do not place a logo over QR modules. Render it at 54 mm on white; `generateQRCodeSVG` supplies the standard four-module quiet zone. Scan reliability takes priority over decorative QR treatment on the small sign.
- Keep all QR/public label/position/station/manual-code values live and preserve the existing authenticated `reveal` -> print confirmation -> `MARK_PRINTED` / `needsReprint` lifecycle.


## 2026-08-29: Customer Feedback employee score uses versioned 64-point rubric

- Do not reinterpret historical `employee-v2` answers as Caltex checklist scores. Keep v2 immutable and use `employee-v3` for the 64-point rubric.
- Rubric weights are fixed at 15, 10, 3, 10, 3, 4, 5, 4, 10 (total 64).
- YES earns the criterion, NO earns zero, and UNSURE is removed from that criterion's denominator; UNSURE must not become an automatic penalty.
- Aggregate each criterion independently as YES/(YES+NO) x criterion weight so each checklist item keeps its intended weight.
- Hide the numeric employee score until at least 10 VALID employee-v3 responses exist.
- In Customer Feedback admin, expose employee scores through both an overview comparison and an explicit per-employee view; do not rely on an inline expanded row as the only way to inspect one employee.
- Customer-feedback score is only evidence for a future bonus calculation; it must not alter Payroll automatically without a separately approved bonus rule.
- Customer Feedback monthly collection target for forecourt employees is 60 VALID `employee-v3` evaluations per Bangkok calendar month. Employee self-service shows progress toward this target, but the count itself does not change the 64-point score formula.
