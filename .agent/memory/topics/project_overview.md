# Project Overview & Tech Stack

## TL;DR
Next.js 14 (App Router) + TypeScript HR & Payroll system. Database: Neon (PostgreSQL) via Prisma ORM. Auth: NextAuth credentials. Deploy: Vercel. Dev server: `npm run dev` in `/Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack/`.

## Full Details

### Project Info
- **Name**: timetrack (HRpayroll project)
- **Location**: `/Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack/`
- **Purpose**: HR system for managing employee attendance, shifts, leaves, payslips, and wallet for a company with multiple stations/locations

### Tech Stack
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials) |
| Deploy | Vercel |
| Testing | Vitest |

### Key Directories
```
timetrack/
├── src/
│   ├── app/           # Pages + API routes
│   │   ├── admin/     # Admin-only pages
│   │   ├── api/       # API endpoints
│   │   ├── schedule/  # Shift schedule page
│   │   ├── requests/  # Leave requests page
│   │   └── ...
│   ├── components/    # Shared UI components
│   └── lib/           # Utilities, auth config
├── prisma/            # Schema + seed scripts
├── scripts/           # Utility scripts
└── .agent/memory/     # AI memory system (this folder)
```

### Environment Variables
- `DATABASE_URL` - Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - App URL

### Running the App
```bash
cd /Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack
npm run dev   # starts on http://localhost:3000
```

## Changelog
- 2026-02-23: Initial memory created. Project is actively developed with multiple features.
