กฎทั้งหมดของโปรเจกต์นี้อยู่ใน [AGENTS.md](AGENTS.md) — อ่านให้จบก่อนรันคำสั่งที่ต่อฐานข้อมูล

สรุปสั้นที่สุด:

- `DATABASE_URL` = ฐานข้อมูล **production จริง** ไม่มี dev DB แยก
- ห้าม `prisma migrate dev|reset|deploy`, `db push --force-reset|--accept-data-loss`
  และห้ามชี้ `--shadow-database-url` มาที่ `DATABASE_URL` (Prisma จะ DROP schema ทิ้งก่อนเสมอ)
- ต้องการ SQL diff ใช้ `npm run db:diff` (ไม่แตะฐานข้อมูล)
- Neon เก็บ history แค่ 6 ชั่วโมง พลาดแล้วข้ามคืน = กู้ไม่ได้
