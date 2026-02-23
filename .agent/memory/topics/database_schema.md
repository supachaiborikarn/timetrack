# Database Schema & Models

## TL;DR
Prisma ORM on Neon PostgreSQL. Key models: `User` (auth), `Employee` (profile/HR data), `Attendance`, `Shift`, `ShiftAssignment`, `LeaveRequest`, `LeaveBalance`, `Payslip`, `WalletTransaction`, `Advance`, `Notification`, `Announcement`, `PerformanceReview`. Schema file: `prisma/schema.prisma`.

## Full Details

### Key Models & Relationships

```
User (NextAuth login)
  └─ Employee (HR profile data)
        ├─ Attendance[] (check-in/out records)
        ├─ ShiftAssignment[] (which shift they work)
        ├─ LeaveRequest[] (leave submissions)
        ├─ LeaveBalance[] (quota per leave type)
        ├─ Payslip[] (monthly pay records)
        ├─ WalletTransaction[] (balance history)
        ├─ Advance[] (salary advance requests)
        ├─ Notification[] (personal alerts)
        └─ PerformanceReview[] (reviews)

Shift (shift type template)
  └─ ShiftAssignment[] (links Employee to Shift per date/period)

Station (work location)
  └─ Employee[] (employees assigned to station)
```

### Important Fields to Know
- `Employee.role`: ADMIN | EMPLOYEE
- `LeaveRequest.status`: PENDING | APPROVED | REJECTED
- `Advance.status`: PENDING | APPROVED | REJECTED
- `Attendance.checkInTime`, `checkOutTime`: DateTime
- `Shift.startTime`, `endTime`, `name`: shift definition

### Seed Scripts
- `prisma/seed.ts` - main seed
- `prisma/seed-permissions.ts` - role permissions
- `prisma/seed-frontyard.ts` - station-specific data
- `prisma/update-shifts.ts` - shift updates

### Run Commands
```bash
npx prisma studio          # GUI to browse DB
npx prisma db push         # push schema changes
npx prisma generate        # regenerate client
```

## Changelog
- 2026-02-23: Initial memory created from project exploration.
