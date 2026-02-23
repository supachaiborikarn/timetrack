# Leave Requests & Balance

## TL;DR
Employees submit leave requests at `/requests`. Admin approves/rejects at `/admin/requests`. LeaveBalance model tracks quota per type. "Who is Absent" feature on schedule page shows absent employees per station with overlap warnings and leave status badges.

## Full Details

### Leave Types
- Sick leave (ลาป่วย)
- Annual leave (ลาพักร้อน)
- Personal leave (ลากิจ)
- (others as configured)

### Leave Request Flow
1. Employee submits at `/requests` page
2. Status: PENDING (default)
3. Admin approves/rejects at `/admin/requests`
4. LeaveBalance is deducted on approval

### API Routes
- `GET/POST /api/requests` - employee leave requests
- `GET /api/admin/requests` - all requests (admin)
- `PATCH /api/admin/requests/[id]` - approve/reject
- `GET /api/leave-balance` - employee's balance

### "Who is Absent" Feature
- Shows which employees are absent at each station today
- Shows leave request status badges (approved/pending)
- **Overlap detection**: Warns when multiple employees from same station are absent on same day
- Overlap info shows names of absent employees directly in UI (not just icon+count)

### Files
```
src/app/requests/page.tsx            # Employee leave request page
src/app/api/requests/               # Request API routes
src/app/api/leave-balance/          # Balance API
src/app/admin/requests/             # Admin approval page
```

### Past Work
- Absent feature enhanced with leave status badges + overlap warnings (conversation: 8a48c818)
- Display absent employee names in overlap dialog instead of just count (conversation: c2f78a44)

## Changelog
- 2026-02-23: Initial memory created.
