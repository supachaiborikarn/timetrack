# Admin Dashboard & Features

## TL;DR
Admin dashboard at `/admin`. Shows stats: total employees, today's attendance count, pending requests/advances. Sidebar navigation (admin-sidebar.tsx). Features: employee management, attendance, approve leaves/advances, shifts, announcements, performance reviews.

## Full Details

### Dashboard Stats (from `/api/admin/dashboard-stats`)
- Total employees
- Attendance today
- Pending leave requests
- Pending advance requests

### Admin Navigation Pages
| Page | Path | Purpose |
|------|------|---------|
| Dashboard | `/admin` | Overview stats |
| Employees | `/admin/employees` | Manage employees |
| Attendance | `/admin/attendance` | View/edit all attendance |
| Requests | `/admin/requests` | Approve/reject leaves |
| Advances | `/admin/advances` | Approve/reject advances |
| Shifts | `/admin/shifts` | Manage shift templates |
| Schedule | `/schedule` | Schedule calendar view |
| Announcements | `/admin/announcements` | Send company announcements |
| Performance | `/admin/performance` | Performance reviews |
| Payroll | `/admin/payroll` | Generate payslips |

### Files
```
src/app/admin/                     # All admin pages
src/components/layout/admin-sidebar.tsx  # Admin navigation
src/app/api/admin/                 # All admin API routes
src/app/api/admin/dashboard-stats/ # Dashboard stats API
```

## Changelog
- 2026-02-23: Initial memory created.
