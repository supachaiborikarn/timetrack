# Authentication & Role Permissions

## TL;DR
NextAuth with credentials (username/password). Roles: ADMIN, EMPLOYEE. Auth config in `src/lib/auth.ts`. Permissions seeded via `prisma/seed-permissions.ts`. Admin routes protected. Debug tool at `/auth-debug` page + `prisma/debug-auth.js` script.

## Full Details

### Auth Setup
- Provider: Credentials (email + password)
- Session strategy: JWT
- Config file: `src/lib/auth.ts`
- Middleware protects routes based on role

### Roles
| Role | Access |
|------|--------|
| ADMIN | Everything: manage employees, shifts, payroll, approvals |
| EMPLOYEE | Own data: attendance, requests, payslip, wallet |

### How to Debug Auth Issues
```bash
# Run debug script
cd /Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack
node prisma/debug-auth.js
```
Or visit `/auth-debug` page while signed in.

### Common Auth Issues
- "Login failed" error → check User table has correct email format
- Permission denied → check user role in DB
- Session expired → NEXTAUTH_SECRET mismatch

### Files
```
src/lib/auth.ts                    # NextAuth configuration
src/app/login/page.tsx             # Login page
src/app/auth/                     # Auth callbacks
src/app/auth-debug/               # Debug page
prisma/seed-permissions.ts        # Permission seeder
prisma/debug-auth.js              # Auth debug script
```

### Past Work
- Login failed investigation (conversation: 30941c40)

## Changelog
- 2026-02-23: Initial memory created.
