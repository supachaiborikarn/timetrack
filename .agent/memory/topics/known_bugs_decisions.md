# Known Bugs, Past Decisions & Gotchas

## TL;DR
Collection of bugs resolved and key design decisions made during development. Check here BEFORE debugging to avoid re-investigating known issues.

## Known Bugs & Fixes

### 1. Attendance Search Not Showing Specific Employees
- **Issue**: Admin attendance search page didn't show records for employees วิน and ใหม่
- **Root Cause**: Client-side search/date filtering logic bug
- **Fix**: Fixed filtering logic on admin attendance page
- **Date**: ~2026-02-14

### 2. Login Failed Error
- **Issue**: "Login failed" error on login page
- **Context**: Investigated in fuel-delivery-system (different project) but relevant pattern
- **Approach**: Check User table email format, verify NEXTAUTH_SECRET, check credentials provider config
- **Date**: ~2026-02-22

### 3. Billing Notes Sort Order
- **Issue**: Billing notes needed to be sorted by book number then note number
- **Fix**: Added sort order to both existing and newly-created billing notes
- **Date**: ~2026-02-19, ~2026-02-21

### 4. Attendance Backfill Data Not Loading
- **Issue**: Existing attendance records not appearing on retroactive backfill page
- **Root Cause**: Data fetching/display logic bug on backfill page
- **Fix**: Fixed query and display logic
- **Date**: ~2026-02-21

## Design Decisions

### DD-001: QR Check-in with GPS + Device Fingerprint
- Combined GPS radius check + device fingerprinting for fraud prevention
- Trade-off: Some employees had difficulty → may need to adjust radius/strictness

### DD-002: Neon Free Tier Optimization
- Reduced polling frequency across all pages
- Consolidated API calls to reduce data transfer
- Connection pooling enabled
- See `neon_limits.md` for full details

### DD-003: Absent Feature Design
- "Who is Absent" shows names directly (not just count) for quick station manager visibility
- Overlap warnings when >1 person absent at same station on same day

### DD-004: Billing Notes Export
- Supports both Excel (.xlsx) and CSV format
- Sorted by book+number for consistency

## Gotchas to Remember
- `npm run dev` must be run from inside `/timetrack/` folder, not project root
- `.env` is gitignored - don't lose it! Contains `DATABASE_URL` and `NEXTAUTH_SECRET`
- Prisma client regeneration needed after schema changes: `npx prisma generate`
- Neon connection: use connection pooling URL for app, direct URL for migrations

## Changelog
- 2026-02-23: Initial memory created with consolidated bug history from past conversations.
