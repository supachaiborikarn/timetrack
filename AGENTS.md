# กฎสำหรับ AI agent ที่ทำงานในโปรเจกต์นี้

อ่านไฟล์นี้ให้จบก่อนรันคำสั่งใด ๆ ที่ต่อฐานข้อมูล

## 1. `DATABASE_URL` คือฐานข้อมูล production จริง

`.env` ในเครื่องกับ environment variable `DATABASE_URL` ของ Vercel production
ชี้ไปที่ Neon endpoint เดียวกัน (`ep-delicate-sound-a1mi5n1t`)

**ไม่มี dev database แยก** ทุกสคริปต์ ทุก seed ทุก `prisma` command ที่รันจากเครื่อง
คือการแตะข้อมูลพนักงานจริง เงินเดือนจริง และใบสมัครงานจริง

โปรเจกต์นี้จัดการ schema ด้วย `prisma db push` **ไม่ใช่ migrations**
ตาราง `_prisma_migrations` ไม่มีอยู่ในฐานข้อมูล production

## 2. คำสั่งต้องห้าม

ห้ามรันคำสั่งกลุ่มนี้กับ `DATABASE_URL` เด็ดขาด ไม่ว่าจะด้วยเหตุผลใด:

```
prisma migrate diff --shadow-database-url <ที่ resolve เป็น DATABASE_URL>
prisma migrate dev
prisma migrate reset
prisma migrate deploy
prisma db push --force-reset
prisma db push --accept-data-loss
```

**เหตุผล:** Prisma **DROP schema ของ shadow database ทิ้งก่อนเสมอ** แล้วค่อย replay migration
และเพราะ production ไม่มี `_prisma_migrations` คำสั่งตระกูล `migrate` จะเห็นว่า drift ทั้งหมด
แล้วเสนอ/สั่ง reset ฐานข้อมูล

เรื่องนี้เคยเกิดขึ้นจริง — ดู [docs/incident-2026-08-23-production-wipe.md](docs/incident-2026-08-23-production-wipe.md)

## 3. วิธีที่ถูกต้อง

**สร้างไฟล์ SQL migration โดยไม่แตะฐานข้อมูลเลย:**

```bash
npm run db:diff          # เขียนผลลง prisma/migrations-preview.sql
```

**ถ้าจำเป็นต้องใช้ shadow database จริง ๆ** ใช้ `SHADOW_DATABASE_URL` ใน `.env`
(Neon branch `shadow` = `ep-crimson-night-a12luxll` เป็น schema-only ไม่มีข้อมูลจริง
Prisma จะ DROP schema ของมันทิ้งทุกครั้งที่ใช้ ซึ่งไม่เป็นไร) — **ห้ามใช้ `DATABASE_URL` แทน**

> ⚠ `npm run db:diff:migrations` **พังอยู่ตอนนี้** และไม่ใช่ความผิดของคำสั่ง —
> โฟลเดอร์ `prisma/migrations` replay จากศูนย์ไม่ได้ (ตาย P3006 ที่ `harden_payroll`
> เพราะ `DailyPayrollOverride` ถูกสร้างด้วย `db push` ไม่เคยอยู่ในไฟล์ migration)
> ให้ใช้ `npm run db:diff` แทน อย่าพยายาม "ซ่อม" ด้วยการรัน migrate กับฐานข้อมูลจริง

**เปลี่ยน schema:**

```bash
npm run db:push          # ผ่าน guard แล้ว ปลอดภัย
```

## 4. ก่อนรันคำสั่งที่ต่อฐานข้อมูล

บอกผู้ใช้ก่อนเสมอว่าคำสั่งนั้นจะไปโดน host ไหน แล้ว**รอยืนยัน**
สคริปต์ที่เขียน/แก้ข้อมูล ให้ print สิ่งที่จะเปลี่ยนออกมาก่อนลงมือ

แถวทดสอบให้ใส่ prefix ที่เห็นชัด (`ZZTEST`, `ZZEMP`) แล้วลบทิ้งด้วย prefix นั้นเมื่อเสร็จ

## 5. Neon เก็บ history แค่ 6 ชั่วโมง

Free plan, history retention = 6 ชม. ถ้าทำข้อมูลหายแล้วไม่รู้ตัวข้ามคืน **กู้ไม่ได้อีกเลย**
ไฟล์สำรองในเครื่องคือ `backup.sql` ซึ่งเป็น dump ของ 23 ก.พ. 2026 — เก่าไป 6 เดือน

วิธีกู้: Neon Console → branch `production` → Backup & Restore → Restore from history
ใช้ Preview data → Query data ไล่หาเวลาที่ `SELECT count(*) FROM "User"` ยังได้ ~74 ก่อนกด restore

> หมายเหตุ: ช่องวันเวลาบนหน้าหลักจะรีเซ็ตกลับเป็นเวลาปัจจุบันเมื่อปิดหน้าต่าง preview
> ต้องตั้งใหม่ก่อนกด Restore ไม่งั้นจะ restore สภาพพังทับตัวเอง

## 6. อย่างอื่น

- ทุก endpoint ที่แก้ข้อมูลต้องเช็ค session และสิทธิ์ (`Permission` / `RolePermission`)
- เลขบัตรประชาชนในใบสมัครงานเข้ารหัสด้วย `FIELD_ENCRYPTION_KEY` — ห้ามสร้าง key ใหม่บน production
- Timezone ของระบบคือ Asia/Bangkok ระวังตอนคำนวณกะข้ามคืนและรอบเงินเดือน

## 7. กฎบังคับ: ทุกการเปลี่ยนแปลงต้องบันทึก Second Brain

**ห้ามจบงานที่มีการเปลี่ยนแปลงโปรเจกต์โดยไม่อัปเดต `secondbrain/` ใน session เดียวกัน**

การเปลี่ยนแปลงที่ต้องบันทึกครอบคลุมทุกอย่าง เช่น:

- แก้/เพิ่ม/ลบ code, API, UI, database schema, config, script, dependency หรือ test
- เปลี่ยน business rule, payroll rule, permission, workflow หรือพฤติกรรมของระบบ
- แก้ bug, refactor, workaround หรือแก้ incident
- เปลี่ยน deployment/runtime/environment ที่มีผลต่อการทำงาน
- พบข้อจำกัด ความเสี่ยง ปัญหาค้าง หรือข้อมูลสำคัญที่ session ถัดไปควรรู้

อย่างน้อยทุกครั้งต้องเพิ่มรายการแบบลงวันที่ใน `secondbrain/notes/Session-Log.md` โดยระบุ:

1. ทำอะไรและทำไม
2. ไฟล์/ส่วนสำคัญที่เปลี่ยน
3. business/technical decision ที่เกิดขึ้น
4. ผลการทดสอบ/verification ที่รัน
5. งานค้างหรือความเสี่ยง ถ้ามี
6. commit hash เมื่อมี commit

และต้องอัปเดตโน้ตเฉพาะทางให้ตรงกับสภาพจริงด้วยเมื่อเกี่ยวข้อง:

- `secondbrain/notes/Decisions.md` — กติกาหรือการตัดสินใจถาวร
- `secondbrain/notes/Architecture.md` — flow/โครงสร้างระบบเปลี่ยน
- `secondbrain/notes/Runbook.md` — วิธีรัน/ตรวจสอบ/กู้ระบบเปลี่ยน
- `secondbrain/notes/Backlog.md` — มีงานค้างหรือความเสี่ยงใหม่
- `secondbrain/00-Start-Here.md` — current state สำคัญเปลี่ยน

**Second Brain ถือเป็นส่วนหนึ่งของงาน ไม่ใช่งานเสริม** ถ้า code เปลี่ยนแต่ Second Brain ยังไม่ถูกอัปเดต งานนั้นถือว่ายังไม่เสร็จ

ก่อน commit ให้ตรวจว่าเอกสาร Second Brain ที่เกี่ยวข้องถูก stage ไปพร้อมกับการเปลี่ยนแปลงนั้นด้วย
