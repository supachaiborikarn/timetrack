# 23 ส.ค. 2026 — ฐานข้อมูล production ถูกลบทั้งหมด

**ความรุนแรง:** ระบบใช้งานไม่ได้ทั้งหมด ~36 นาที · ข้อมูลสูญหายถาวร: ไม่มี
**ช่วงเวลา:** 19:29 – 20:05 น. (Asia/Bangkok)

## อาการ

พนักงานเปิดเว็บแล้วไม่เห็นข้อมูลพนักงานเลย และกดเช็คเอาท์ไม่ได้

## สาเหตุ

ระหว่างสร้าง migration ของฟีเจอร์ customer-feedback มี agent รันคำสั่ง:

```
npx prisma migrate diff --from-migrations ./prisma/migrations \
  --shadow-database-url "<ค่าเดียวกับ DATABASE_URL ของ production>"
```

`--from-migrations` บังคับให้ต้องมี shadow database และ **Prisma จะ DROP schema ของ shadow
database ทิ้งก่อนเสมอ** แล้วค่อย replay migration ทีละไฟล์ เมื่อ shadow database คือฐานข้อมูล
production จริง ผลคือ schema ทั้งหมดถูกลบ

การ replay ไปได้ถึง `20260714090000_harden_payroll` แล้วพังด้วย P3006 / P1014
(`DailyPayrollOverride` ไม่มีตาราง เพราะตารางนั้นถูกสร้างด้วย `db push` ไม่เคยอยู่ในไฟล์ migration)
ฐานข้อมูลจึงค้างอยู่ที่สภาพ:

- เหลือ 19 ตาราง — ตรงกับ `20260203062453_add_employee_details/migration.sql` เป๊ะ
- `User` = 0, `Attendance` = 0, `Station` = 0
- ไม่มีตาราง `_prisma_migrations`

## ทำไมถึงเกิดขึ้นได้

1. `.env` ในเครื่องชี้ไปที่ฐานข้อมูล production เหมือน Vercel ทุกประการ ไม่มี dev database แยก
2. ไม่มี `SHADOW_DATABASE_URL` ตั้งไว้ — agent จึงหยิบ URL เดียวที่มีมาใช้
3. ไม่มีไฟล์กฎ (`AGENTS.md` / `CLAUDE.md`) บอกว่าห้ามทำอะไร
4. โปรเจกต์ใช้ `db push` แต่ยังเก็บโฟลเดอร์ `prisma/migrations` ไว้ ทั้งที่ replay จากศูนย์ไม่ได้
   ทำให้ดูเหมือนเป็น migration ที่ใช้งานได้

## การกู้คืน

Neon point-in-time restore บน branch `production`

ใช้ Preview data → Query data ไล่ binary search หาเวลาสุดท้ายที่ข้อมูลยังอยู่:

| เวลา | ตาราง | User |
|---|---|---|
| 19:25 | 43 | 74 |
| **19:28** | **43** | **74** |
| 19:32 | 19 | 0 |
| 19:40 | 19 | 0 |

restore ไปที่ **19:28** ใช้เวลา 0.72 วินาที ได้ข้อมูลกลับครบ
(43 ตาราง / User 74 / Attendance 6,816 / Station 4)

`Attendance` ที่ 19:25 กับ 19:28 เท่ากันทั้งคู่ที่ 6,816 แปลว่าไม่มีใครลงเวลาในช่วงนั้น
**จึงไม่มีข้อมูลสูญหายจริง** สภาพก่อน restore ถูกเก็บไว้ที่ branch
`production_old_2026-08-23T12:28:00Z`

## สิ่งที่แก้เพื่อไม่ให้เกิดซ้ำ

| สิ่งที่ทำ | ป้องกันอะไร |
|---|---|
| [AGENTS.md](../AGENTS.md) + [CLAUDE.md](../CLAUDE.md) | agent อ่านกฎอัตโนมัติทุก session ไม่ต้องบอกซ้ำ |
| `scripts/prisma-guard.cjs` | หยุดคำสั่ง prisma ที่อันตรายก่อนต่อฐานข้อมูล |
| Neon branch `shadow` (schema-only) + `SHADOW_DATABASE_URL` | มี shadow database ที่ปลอดภัยให้ใช้ ไม่ต้องเดา |
| `npm run db:diff` | สร้าง SQL diff โดยไม่ต่อฐานข้อมูลเลย |

## ยังค้างอยู่

- **โฟลเดอร์ `prisma/migrations` replay จากศูนย์ไม่ได้** — `npm run db:diff:migrations` จะพัง
  ที่ `harden_payroll` เสมอ ควรตัดสินใจว่าจะ baseline ใหม่ให้ถูกต้อง หรือลบโฟลเดอร์ทิ้ง
  ไปใช้ `db push` อย่างเดียวให้ชัดเจน
- **history retention ของ Neon = 6 ชั่วโมง** (Free plan) ถ้าเรื่องนี้ถูกพบตอนเช้าวันรุ่งขึ้น
  จะกู้ไม่ได้เลย เหลือแค่ `backup.sql` ของ 23 ก.พ. 2026 ควรพิจารณาขยาย window หรือตั้ง snapshot
- **ควรเปลี่ยนรหัสผ่าน `neondb_owner`** — connection string ยัง hardcode อยู่ใน
  `scripts/debug/*.js` หลายไฟล์
