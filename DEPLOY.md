# TimeTrack - Vercel Deployment Guide

## ขั้นตอนการ Deploy

### 1. สร้าง Database บน Supabase (Free)

1. ไปที่ [supabase.com](https://supabase.com) และสมัครสมาชิก
2. สร้าง Project ใหม่
3. ไปที่ **Settings > Database > Connection string**
4. เลือก **URI** และ copy connection string:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
5. **สำคัญ:** เพิ่ม `?pgbouncer=true` ต่อท้าย URL

### 2. Push Code ไป GitHub

```bash
cd /Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack

# ถ้ายังไม่มี git repo
git init
git add .
git commit -m "Initial commit"

# สร้าง repo บน GitHub แล้ว push
git remote add origin https://github.com/YOUR_USERNAME/timetrack.git
git branch -M main
git push -u origin main
```

### 3. Deploy บน Vercel

1. ไปที่ [vercel.com](https://vercel.com) และ login ด้วย GitHub
2. Click **"Add New Project"**
3. Import repository **timetrack**
4. ตั้งค่า **Environment Variables**:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres.[xxx]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `AUTH_SECRET` | *(สร้างด้วย `openssl rand -base64 32`)* |
| `AUTH_URL` | `https://your-app.vercel.app` |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |

5. Click **"Deploy"**

### 4. Setup Database หลัง Deploy

หลังจาก deploy สำเร็จ ให้ run migration:

```bash
# ใน terminal ของคุณ
export DATABASE_URL="postgresql://postgres.[xxx]:[password]@..."

# Push schema ไป database
npx prisma db push

# Seed ข้อมูลเริ่มต้น (ถ้าต้องการ)
npx tsx prisma/seed.ts
npx tsx prisma/seed-permissions.ts
```

### 5. ทดสอบ

เปิด URL ที่ Vercel ให้มาแล้วทดสอบ login!

---

## Environment Variables ที่ต้องการ

| Variable | คำอธิบาย |
|----------|----------|
| `DATABASE_URL` | PostgreSQL connection string (Supabase) |
| `AUTH_SECRET` | Secret key สำหรับ NextAuth (สร้างด้วย `openssl rand -base64 32`) |
| `AUTH_URL` | URL ของแอพ (เช่น `https://timetrack.vercel.app`) |
| `NEXTAUTH_URL` | เหมือน AUTH_URL |

---

## Tips

- ถ้าเจอ error เกี่ยวกับ Prisma ให้ลอง redeploy
- ตรวจสอบ Vercel Logs ถ้ามีปัญหา
- Database ต้อง accessible จาก Vercel (ใช้ Supabase จะไม่มีปัญหา)
