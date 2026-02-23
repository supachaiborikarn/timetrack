# Neon DB Free Tier & Optimization

## TL;DR
Neon free tier limits: **512MB storage**, **5GB data transfer/month**. Optimizations applied: reduced polling frequency, consolidated API queries, connection pooling enabled. Watch for pages that poll frequently.

## Full Details

### Neon Free Tier Limits
| Resource | Limit |
|----------|-------|
| Storage | 512MB |
| Data Transfer | 5GB/month |
| Compute | 0.25 vCPU, auto-suspend |
| Branches | 10 |

### Optimizations Applied
1. **Reduced polling**: Pages that auto-refresh reduced frequency (e.g., dashboard stats)
2. **API consolidation**: Multiple separate API calls merged into single calls where possible
3. **Connection pooling**: Using Neon's pooled connection URL for application queries (not migration direct URL)

### Connection URL Types
- **Pooled** (for app): `postgresql://...@ep-xxx.us-east-2.aws.neon.tech/neondb?pgbouncer=true`
- **Direct** (for migrations): `postgresql://...@ep-xxx.us-east-2.aws.neon.tech/neondb`

In `.env`:
```
DATABASE_URL=<pooled connection>
DIRECT_URL=<direct connection>  # used by Prisma for migrations
```

### In `prisma/schema.prisma`
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

### Data Transfer Hotspots to Watch
- `/api/admin/dashboard-stats` - polled frequently
- Any page with `useEffect` + `setInterval` for auto-refresh
- Large list queries without pagination

### Past Investigation
- Analyzed data transfer usage to identify hotspots and optimize (conversation: 977553ed)

## Changelog
- 2026-02-23: Initial memory created from optimization investigation.
