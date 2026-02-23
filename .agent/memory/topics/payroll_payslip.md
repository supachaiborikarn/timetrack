# Payroll & Payslip

## TL;DR
Admin generates monthly payslips. Payslip includes base salary, advances deducted, other deductions. Employees view own payslips at `/wallet` or payslip page. Billing notes can be exported as Excel/CSV. Billing notes are sorted by book+number order.

## Full Details

### Payslip Flow
1. Admin generates payslip for employee (monthly)
2. System calculates: base salary - advances - deductions = net pay
3. Payslip record saved, employee can view it

### Billing Notes
- Sorted by book number, then note number
- Export: Excel (.xlsx) and CSV formats
- API: `/api/payslip/export` or similar

### API Routes
- `GET /api/payslip` - employee's payslips
- `POST /api/admin/payslip` - generate payslip (admin)

### Files
```
src/app/api/payslip/               # Payslip API
```

### Past Work
- Billing notes sorted by book+number (conversations: 09190834, 126a98af)
- Billing export as Excel/CSV implemented (conversation: f385ec15)

## Changelog
- 2026-02-23: Initial memory created.
