---
tags:
  - secondbrain
  - backlog
updated: 2026-08-27
---

# Backlog

## Known technical follow-ups

- Investigate production build prerender failure on `/feedback/privacy` and `/apply/status` (`useState` null during static generation).
- Consider whether Attendance UI/API should eventually persist/recompute station-rule OT instead of retaining legacy 8-hour-based `Attendance.overtimeHours`; payroll already uses the new shared rule from 2026-08-26 onward.
- Consider adding a dedicated persisted `earlyLeavePenalty` field to finalized `PayrollRecord` if future payslips/reports need it separated after finalization. Currently it is included in `otherDeduct` when finalizing.

## Documentation habit

Every material business-rule change should be captured in Second Brain in the same session so future work does not depend on conversation memory.
