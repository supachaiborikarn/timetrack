# Shifts & Schedule Management

## TL;DR
Shifts defined by admin (name, startTime, endTime). ShiftAssignment links employees to shifts per period. Schedule page (`/schedule`) has calendar + table view. Shift-pool: open shifts employees can claim. Shifts have OPEN/CLOSED status. Station = work location that groups employees.

## Full Details

### Key Concepts
- **Shift**: Template (e.g., "Morning 06:00-14:00", "Afternoon 14:00-22:00")
- **ShiftAssignment**: Employee ↔ Shift for a specific date/period
- **Station**: Physical work location (e.g., Frontyard)
- **Shift Pool**: Open shifts that any eligible employee can pick up

### Schedule Page (`/schedule`)
- Calendar view: see monthly overview of assignments
- Table view: list of shift assignments
- Toggle between views
- Expand individual days to see who's working which shift

### API Routes
- `GET /api/shifts` - list shifts
- `GET /api/schedule` - schedule data
- `POST /api/admin/shifts` - create shift (admin)
- `GET/POST /api/shift-pool` - shift pool management

### Admin Shift Features
- Create, edit, delete shift templates
- Assign employees to shifts
- View calendar of all assignments by station

### Files
```
src/app/schedule/page.tsx          # Schedule page with calendar
src/app/shift-pool/page.tsx        # Shift pool page
src/app/api/shifts/               # Shift API routes
src/app/api/schedule/             # Schedule API routes
prisma/update-shifts.ts           # Script to update shifts in DB
```

### Past Work
- Calendar view added to schedule page (conversation: bc085a4f)
- Shift reopening feature for closed shifts (e.g., Saman's shift) (conversation: ef7c02f7)

## Changelog
- 2026-02-23: Initial memory created.
