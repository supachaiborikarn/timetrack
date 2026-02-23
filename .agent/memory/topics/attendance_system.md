# Attendance & Check-in System

## TL;DR
QR-based check-in/out with GPS + device fingerprinting validation. Pages: `/qr-scan`, `/history`. Admin views all at `/admin/attendance`. Key API: `POST /api/attendance/check-in`, `POST /api/attendance/check-out`. Retroactive backfill admin feature exists for adding missed records.

## Full Details

### How It Works
1. Employee opens `/qr-scan` page on their phone
2. System verifies GPS location (must be within range of station)
3. Device fingerprinting used for additional verification
4. `check-in` record created in `Attendance` table
5. Employee checks out at end of shift → `checkOutTime` updated

### API Routes
- `POST /api/attendance/check-in` - employee check-in
- `POST /api/attendance/check-out` - employee check-out
- `GET /api/admin/attendance` - admin view all attendance
- `GET /api/admin/attendance/backfill` - view retroactive records

### Known Issues / Past Bugs
- Employees reported check-in difficulty → investigated GPS radius and device fingerprinting strictness
- Search on admin attendance page had bug with specific employee names (วิน, ใหม่) - fixed filtering logic

### Admin Features
- View all employee attendance with date/employee search filters
- Edit attendance records directly
- Retroactive backfill: add attendance records for past dates employees missed checking in

### Files
```
src/app/qr-scan/page.tsx          # Employee check-in page
src/app/history/page.tsx           # Employee history page
src/app/api/attendance/            # All attendance API routes
src/app/admin/attendance/          # Admin attendance management
```

## Changelog
- 2026-02-23: Initial memory created.
- Note: Attendance search bug for specific employees was debugged and fixed (conversation: 8ea87c33).
