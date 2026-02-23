# 🧠 AI Memory System - MEMORY_GUIDE

คู่มือสำหรับระบบ "สมอง" ของ AI ในโปรเจค HRpayroll/timetrack

---

## โครงสร้างไฟล์

```
.agent/
├── memory/
│   ├── index.json              ← สารบัญทุก topic (อ่านก่อนเสมอ)
│   └── topics/
│       ├── project_overview.md
│       ├── database_schema.md
│       ├── attendance_system.md
│       ├── shift_schedule.md
│       ├── leave_requests.md
│       ├── payroll_payslip.md
│       ├── wallet_advances.md
│       ├── auth_permissions.md
│       ├── admin_dashboard.md
│       ├── known_bugs_decisions.md
│       └── neon_limits.md
└── workflows/
    └── use-memory.md           ← คำสั่งสำหรับ AI ว่าต้องทำอะไร
```

---

## หลักการทำงาน (Token-Efficient)

```
1. อ่าน index.json    →  เจอ topic ที่เกี่ยวข้อง?
                                ↓
2. อ่านแค่ TL;DR     →  พอแล้ว?    → ตอบ user
                                ↓ (ไม่พอ)
3. อ่านไฟล์เต็ม     →  ตอบ user
                                ↓
4. Update memory     →  บันทึกข้อมูลใหม่/bug ที่แก้
                                ↓
5. git commit        →  push ขึ้น GitHub
```

---

## การ Update Memory

AI จะ update memory อัตโนมัติเมื่อ:
- แก้ bug หรือพบ bug ใหม่ → เพิ่มใน `known_bugs_decisions.md`
- เพิ่ม feature ใหม่ → update topic ที่เกี่ยวข้อง
- ตัดสินใจ design → บันทึกใน `known_bugs_decisions.md`
- เปลี่ยนแปลง DB schema → update `database_schema.md`

**ไม่สร้างไฟล์ใหม่ถ้ามี topic อยู่แล้ว — update ไฟล์เดิมเสมอ**

---

## Topics ที่มีอยู่

| Topic | เกี่ยวกับ |
|-------|----------|
| `project_overview` | Tech stack, folder structure, run commands |
| `database_schema` | Prisma models, relationships |
| `attendance_system` | Check-in/out, QR, GPS, admin attendance |
| `shift_schedule` | Shifts, schedule calendar, shift-pool |
| `leave_requests` | Leave requests, approval, absent feature |
| `payroll_payslip` | Payslip, billing notes, export |
| `wallet_advances` | Employee wallet, advance requests |
| `auth_permissions` | NextAuth, roles, login debug |
| `admin_dashboard` | Admin pages, dashboard stats |
| `known_bugs_decisions` | Bug history, design decisions, gotchas |
| `neon_limits` | DB limits, optimizations, connection pooling |

---

## เพิ่ม Topic ใหม่

1. สร้างไฟล์ `topics/<id>.md` ตาม template:
```markdown
# [ชื่อ Topic]

## TL;DR
[สรุป 3-5 ประโยค]

## Full Details
[รายละเอียด]

## Changelog
- YYYY-MM-DD: Initial memory created.
```

2. เพิ่ม entry ใน `index.json` → topics array

---

## Git Commit หลัง Update

```bash
cd /Users/benzsuphaudphanich/Desktop/HRpayroll/timetrack
git add .agent/memory/
git commit -m "memory: update [topic] - [description]"
git push origin main
```

---

*ระบบนี้ช่วยให้ AI จำ context ของโปรเจคข้ามหลาย session โดยไม่เสีย token เกินจำเป็น*
