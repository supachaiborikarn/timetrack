# Wallet & Cash Advances

## TL;DR
Employee wallet tracks balance (WalletTransaction model). Advance system: employee requests advance → admin approves → deducted from wallet/payslip. Pages: `/wallet`, `/advances`. Admin approves at `/admin/advances`.

## Full Details

### Wallet
- Each employee has a wallet (balance tracked via transactions)
- Transactions: credit (add money), debit (deduction)
- View at `/wallet` page

### Advance Flow
1. Employee requests advance at `/advances`
2. Status: PENDING
3. Admin approves/rejects at admin panel
4. On approval: advance created, will deduct from future payslip

### API Routes
- `GET /api/wallet` - employee wallet balance & transactions
- `GET/POST /api/advances` - employee advance requests
- `GET /api/admin/advances` - all advances (admin)
- `PATCH /api/admin/advances/[id]` - approve/reject

### Files
```
src/app/wallet/page.tsx           # Employee wallet page
src/app/advances/page.tsx         # Employee advance requests
src/app/api/wallet/              # Wallet API
src/app/api/advances/            # Advance API
```

## Changelog
- 2026-02-23: Initial memory created.
