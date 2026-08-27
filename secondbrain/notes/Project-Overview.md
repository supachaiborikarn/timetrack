---
tags:
  - secondbrain
  - project-overview
updated: 2026-08-27
---

# Project Overview

## Purpose

`timetrack` manages employee attendance and payroll across station businesses. Important areas include:

- Employee check-in/check-out and station location validation.
- Attendance approval and admin time correction.
- Shift and break handling.
- Payroll calculation and daily overrides.
- Wallet / employee-facing payroll breakdown.
- Payroll reports, exports, accounting output, and finalization.

## Stack

- Next.js 16
- TypeScript
- Prisma 5
- Vitest

## Important station codes

- `WKO` — วัชรเกียรติออยล์
- `PAP` — พงษ์อนันต์ปิโตรเลียม
- `SPC` — ศุภชัยบริการ
- `PAP_GAS` — แก๊สพงษ์อนันต์
- `SPC_GAS` — แก๊สศุภชัย

## Payroll source of truth

Payroll-facing money calculations should flow through `src/lib/payroll-calculation.ts` and `src/lib/payroll-service.ts` rather than being reimplemented independently in Wallet, reports, or exports.

Station-specific OT / early-leave logic lives in `src/lib/station-pay-rules.ts`.
