# ตั้งค่าการแจ้งเตือนและคำสั่ง Discord

ระบบส่งรายงานหลังกะเริ่มตามเวลาผ่อนผันและส่งสรุปประจำวันเวลา 23:30 น. ตามเวลาไทย

รายงานแยกจำนวนคนที่มาแล้ว ลาอนุมัติ ลารออนุมัติ ขาดโดยไม่ลา และคนที่ยังไม่ถึงเวลากะ

## 1. สร้างช่องรับรายงาน

สร้าง Webhook ในช่อง Discord ที่ต้องการรับรายงาน แล้วนำ URL ใส่ใน `DISCORD_ATTENDANCE_WEBHOOK_URL`

หากต้องการแยกช่องตามสาขา ให้ใช้ชื่อตัวแปรตามรหัสสาขา เช่น `DISCORD_ATTENDANCE_WEBHOOK_URL_WKO`

## 2. สร้าง Discord Application

สร้าง Application ใน Discord Developer Portal แล้วเก็บค่า Application ID, Public Key และ Bot Token

นำค่าไปตั้งใน `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY` และ `DISCORD_BOT_TOKEN`

ตั้ง Interactions Endpoint URL เป็น `https://โดเมนของระบบ/api/discord/interactions`

## 3. จำกัดผู้มีสิทธิ์

ใส่ Discord Server ID ใน `DISCORD_ALLOWED_GUILD_IDS`

ใส่ User ID ที่อนุญาตใน `DISCORD_ALLOWED_USER_IDS` หรือใส่ Role ID ใน `DISCORD_ALLOWED_ROLE_IDS`

หากมีหลายค่าให้คั่นด้วยเครื่องหมายจุลภาค

ระบบจะปฏิเสธทุกคำสั่งเมื่อยังไม่ได้ตั้ง User ID หรือ Role ID

## 4. ลงทะเบียนคำสั่ง

กำหนด `DISCORD_GUILD_ID` เมื่อต้องการลงทะเบียนเฉพาะเซิร์ฟเวอร์ที่ใช้งาน แล้วรันคำสั่งต่อไปนี้

```bash
npm run discord:register
```

คำสั่งที่เปิดใช้มีดังนี้

- `/attendance summary` ใช้ดูรายงาน โดยเลือกสาขาและวันที่ได้
- `/attendance send` ใช้ส่งรายงานเข้า Webhook ที่ตั้งไว้

## 5. เปิดใช้งานฐานข้อมูลและงานตามเวลา

ฐานข้อมูลหลักถูกสร้างตารางบันทึกการส่งแล้ว

เมื่อติดตั้งในฐานข้อมูลอื่นให้รันไฟล์ migration นี้โดยตรง

```bash
npx prisma db execute --file prisma/migrations/20260717120000_add_attendance_alert_log/migration.sql --schema prisma/schema.prisma
```

Vercel จะเรียก `/api/cron/attendance-alerts` เวลา 23:30 น. ตามเวลาไทยเพื่อเป็นสรุปปลายวัน

GitHub Actions ใน `.github/workflows/attendance-alerts.yml` จะเรียกจุดเดียวกันทุก 30 นาทีเพื่อแจ้งหลังกะ

ตั้ง Repository Secret ชื่อ `TIMETRACK_BASE_URL` เป็นโดเมนของระบบ และตั้ง `TIMETRACK_CRON_SECRET` ให้ตรงกับ `CRON_SECRET` ของระบบ

หากไม่ได้ใช้ GitHub Actions ระบบยังส่งสรุปปลายวันจาก Vercel ได้ตามปกติ

ระบบรับคำสั่งแบบรายการที่กำหนดไว้เท่านั้น และยังไม่มีคำสั่งที่รันโค้ดหรือคำสั่งเครื่องจาก Discord
