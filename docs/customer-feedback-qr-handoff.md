# Handoff: ระบบเสียงลูกค้า (Customer Feedback QR) — สถานะหลัง implement

เอกสารนี้สำหรับ AI ตัวถัดไปที่รับงานต่อ อ่านให้จบก่อนทำอะไร
อัปเดตล่าสุด: 24 สิงหาคม 2569

**สถานะปัจจุบันให้อ่านหัวข้อ 2, 6 และ 12 เป็นหลัก** หัวข้อ 8–11 เป็นบันทึกย้อนหลังเพื่ออธิบายว่าเคยทำอะไรกับ production ไปแล้ว
ห้ามนำข้อความย้อนหลังไปสั่งรันฐานข้อมูลซ้ำโดยไม่ตรวจสถานะและขออนุญาตเจ้าของก่อน

---

## 1. กฎเหล็ก — อ่านก่อนรันอะไรก็ตาม

1. **`DATABASE_URL` = production จริงบน Neon ไม่มี dev DB แยก** — อ่าน `AGENTS.md` ให้จบก่อน
2. **ห้ามรัน** `prisma migrate dev|reset|deploy`, `db push --force-reset|--accept-data-loss`,
   และห้ามชี้ `--shadow-database-url` มาที่ `DATABASE_URL` เด็ดขาด
   (เหตุการณ์จริง: [docs/incident-2026-08-23-production-wipe.md](incident-2026-08-23-production-wipe.md))
3. Production จัดการ schema ด้วย `db push` **ไม่ใช่ migrations** — โฟลเดอร์ `prisma/migrations`
   replay จากศูนย์ไม่ได้ (P3006 ที่ `20260714090000_harden_payroll`)
4. คำสั่งที่ใช้ได้: `npm run db:diff` (สร้าง SQL โดยไม่ต่อ DB), `npm run db:push` (ผ่าน guard)
   ต้องใช้ shadow จริง ๆ ให้ใช้ `SHADOW_DATABASE_URL` ใน `.env` (Neon branch เปล่า)
5. ก่อนรันคำสั่งที่ต่อฐานข้อมูล ต้องบอกเจ้าของก่อนและรอยืนยัน
6. Neon free plan เก็บ history แค่ 6 ชั่วโมง — พลาดแล้วข้ามคืนกู้ไม่ได้

ข้อมูล production ถูกกู้คืนแล้วด้วย PITR (คืน 23 ส.ค. 19:28) สภาพก่อน restore
อยู่ที่ branch `production_old_2026-08-23T12:28:00Z` — **ห้ามแตะทั้งสอง branch โดยไม่ได้รับอนุญาต**

---

## 2. สถานะปัจจุบัน (production 24 สิงหาคม 2569 เวลาไทย)

- release commit `21141f51aa40fbea0c700771c6499b8e3b6e38bc` อยู่บน `main` และ push ไป GitHub แล้ว
- Vercel production ใช้ deployment `dpl_HC6E78rXBBu5mNz1rKmtFoeUGsfH` สถานะ Ready
- `https://timetrack-lake.vercel.app/admin/customer-feedback` ใช้โค้ดใหม่และผู้ดูแลเปิดครบทั้ง 6 แท็บได้
- `CUSTOMER_FEEDBACK_ENABLED=true` และ `CUSTOMER_FEEDBACK_PUBLIC_ENABLED=false`
- `/f` ตอบ 404 ตามสวิตช์ปิด ส่วน `/feedback/privacy` ตอบ 200 และ admin API ตอบ 401 เมื่อไม่มี session
- hardening constraints, rating distribution columns, composite nonce index และ permission seed ลง production แล้ว
- live schema diff หลังลงระบบเป็น empty migration
- permission ที่ตรวจได้คือ ADMIN 11, HR 9, MANAGER 6, CASHIER 2 และ EMPLOYEE 2
- production มี Visit 0 และ Response 0 จึงยังไม่มีคะแนนลูกค้าเข้าระบบ
- มี EMPLOYEE QR จริง 48 รายการ ทุกใบยังปิดและรอพิมพ์/รับทราบข้อมูลสาธารณะ
- ยังไม่มี TEST QR และ STATION QR
- สถานี active ทั้ง 4 แห่งยังไม่มี `publicEmergencyPhone`
- public ต้องปิดต่อจนกว่าจะทำรายการในหัวข้อ 6 ครบ
- แผนต้นทางเป็นเอกสารออกแบบย้อนหลังที่ [customer-feedback-qr-evaluation-plan.md](customer-feedback-qr-evaluation-plan.md)
- ร่างเกณฑ์โบนัสและคำสั่งพนักงานเก็บเป็นเอกสารภายในที่ไม่รวมใน repository สาธารณะ และยังห้ามใช้ตัดโบนัสจนเจ้าของอนุมัติ

---

## 3. สิ่งที่สร้างไว้ (file map)

### lib กลาง `src/lib/customer-feedback/`

| ไฟล์ | หน้าที่ |
|---|---|
| `questions.ts` | Question registry `employee-v1` / `station-v1` / `incident-v1` + service areas + incident types + กติกา question key |
| `validation.ts` | Shared validator ฝั่ง client/server (ไม่มี Zod ในโปรเจกต์ — validate manual + allowlist keys เฉพาะ) |
| `token.ts` | token 128-bit base64url, manual code 8 ตัว (ตัด 0O1I), SHA-256/HMAC, URL จาก `APP_BASE_URL` (รหัสอยู่ใน `#t=` fragment) |
| `form-token.ts` | Signed visit token ผูก visitId/visitKind/surveyVersion/qrVersion (min-fill 3 วิ, max 30 นาที) |
| `feature-flags.ts` | flag fail-closed + `assertPublicSecrets()` ตรวจ secret ครบก่อน public API ทำงาน |
| `access.ts` | `getFeedbackAccessContext()` อ่าน role/isActive/stationId **จาก DB ทุก request** (ไม่เชื่อ JWT) + station scope (MANAGER ไม่มี stationId → 403) |
| `station-context.ts` | `isStationFeedbackEnabled` (บังคับ emergency phone + primary QR) / `isEmployeeFeedbackStationEligible` (แค่ Station.isActive) / หาสถานีปัจจุบัน: transfer ล่าสุด → checkInStation → User.stationId |
| `submit.ts` | submit service ทั้ง STANDARD/INCIDENT: idempotency, conditional OPEN→SUBMITTED, ตรวจ qrVersion ใน transaction, สร้าง Response+Answer+Contact+Case+Notification |
| `anti-abuse.ts` | HMAC network รายวัน/รายสัปดาห์ (ไม่เก็บ IP ดิบ), persistent rate bucket (atomic upsert), abuse score (เกณฑ์ 3 = SUSPECTED) |
| `cases.ts` | severity/SLA pure functions (คะแนน 1–2 = HIGH, incident ร้ายแรง/danger YES = URGENT, SLA 2/24/72 ชม.) |
| `metrics.ts` | KPI summary + minimum sample (10) |
| `employee-status.ts` | `setEmployeeInactive()` ปิด EMPLOYEE QR ใน transaction เดียวกับเปลี่ยนสถานะ |
| `retention.ts` | ค่า retention (Visit 90 วัน, contact 120/ปิดเคส+30 วัน) |
| `alerts.ts` | `tryRecordAlert()` กัน alert ซ้ำด้วย unique constraint |

### API ใหม่

Public (ไม่มี session โดยตั้งใจ, ทุกตัวตรวจ flag + Bearer signed visit token หลัง resolve):
- `POST /api/public/customer-feedback/resolve` — token/manual code ใน body, rate limit, สร้าง Visit + คืน signed token + ข้อมูลสาธารณะขั้นต่ำ, error กลางข้อความเดียว
- `POST .../submissions` — คำตอบ STANDARD (Idempotency-Key บังคับ)
- `POST .../incidents/start` — child INCIDENT Visit (หนึ่ง parent หนึ่ง child, เรียกซ้ำคืนเดิม) หรือ standalone UNKNOWN
- `POST .../incidents` — คำตอบ INCIDENT (ไม่บังคับสถานี)
- `POST .../visits/progress` — startedAt/lastStep/targetConfirmation แบบ idempotent (NO/UNSURE → TARGET_REJECTED)
- `GET .../stations` — ค้นหาสถานี ≥2 ตัวอักษร คืนสูงสุด 20 (id/name/publicEmergencyPhone)

Admin (ทุกตัวผ่าน `access.ts` + permission code + MANAGER จำกัด stationId ฝั่ง server):
- `summary` (view_dashboard), `responses` (view_response, ตัด INCIDENT เมื่อไม่มี view_incident,
  ไม่ select contact), `responses/[id]` GET/PATCH (moderate — ซ่อนต้องมีเหตุผล, TEST แก้ไม่ได้),
  `responses/[id]/contact` (view_contact + **AuditLog fail-closed: เขียนไม่ได้ = 500 ไม่คืนข้อมูล**),
  `cases` + `cases/[id]` (case_manage, ปิดต้องมี note, เคสไม่มีสถานีจัดการได้เฉพาะ ADMIN/HR),
  `qr-codes` + `[id]` (manage — activate บังคับ public-profile approval/emergency phone,
  rotate/deactivate/reveal มี AuditLog), `questions` (อ่านอย่างเดียว),
  `review-requests` + `[id]` (review_request_manage)

อื่น ๆ:
- `GET/POST /api/customer-feedback/me` + `me/review-requests` — employeeId จาก session เท่านั้น
- `POST /api/admin/performance/periods/[id]/close` — ปิดรอบ + snapshot ใน transaction เดียว (ADMIN/HR)
- `GET /api/cron/customer-feedback-maintenance` — ตรวจ `CRON_SECRET`

### หน้า UI

- `/f` (server shell + `feedback-form.tsx` client, ยืนยันเป้าหมาย → คะแนน → สาเหตุ/ข้อความ,
  incident ทุกหน้า, th/en, viewport เปิด zoom, token จาก fragment แล้วลบด้วย replaceState)
- `/feedback/privacy`
- `/admin/customer-feedback` — แท็บภาพรวม (KPI+กราฟ+ตาราง พร้อม sample size) / คำตอบ (moderation,
  เปิด contact แบบ action แยก) / เคส (SLA) / QR Codes (สร้าง/activate/rotate/พิมพ์) / คำถาม
- การ์ด "ความคิดเห็นจากลูกค้า" ใน `/performance`

### ไฟล์แก้ที่ต้องรู้

- `schema.prisma`: +14 models, +11 enums, `Station.publicEmergencyPhone`,
  `Notification.eventKey` (+partial unique ใน migration เท่านั้น), `ReviewPeriod.closedAt/closedById`
- `notifications.ts`: type `CUSTOMER_FEEDBACK` + eventKey กันส่งซ้ำ
- `employee-removal.ts` + `api/admin/employees/*` (3 ไฟล์): hard-delete guard + ทุกทางหยุดงานพนักงาน
  ผ่าน `setEmployeeInactive`
- `api/admin/stations/route.ts` + `admin/stations/page.tsx`: ช่อง publicEmergencyPhone + กติกา
  ห้ามล้างเบอร์/ปิดสถานีที่มี QR active จนกว่าจะส่ง `deactivateFeedbackQr: true`
- `AppShell.tsx` (noShellPrefixes มี `/f`, `/feedback`), `admin-sidebar.tsx` (เมนูเสียงลูกค้า),
  `vercel.json` (cron `15 18 * * *` = 01:15 ICT), `.env.example`

### Tests + SQL

- `src/lib/__tests__/customer-feedback-token.test.ts`, `customer-feedback-validation.test.ts` (38 tests:
  token entropy, manual code alphabet/HMAC, URL fragment, daily/weekly hash, validation ทุกกติกา,
  severity/SLA, metrics, option order ตาม seed)
- `prisma/migrations-preview.sql` — ผล `npm run db:diff` รอบล่าสุด 9 บรรทัด: เพิ่ม rating bucket 5 คอลัมน์และ composite unique 1 รายการ
- `prisma/migrations/20260823000000_add_customer_feedback/migration.sql` — diff เต็ม **+ส่วนท้ายที่เขียนเพิ่มเอง**
  (CHECK constraints + partial unique indexes ที่ Prisma สั่งสร้างไม่ได้ — ดูหัวข้อ 5)

---

## 4. Env vars ที่ต้องตั้งใน Vercel

| ตัวแปร | ค่าตอน deploy แรก | หมายเหตุ |
|---|---|---|
| `APP_BASE_URL` | `https://timetrack-lake.vercel.app` | ใช้สร้าง URL ใน QR ฝั่ง server; โครงการอนุมัติโดเมน production นี้แล้ว แต่ยังปฏิเสธ localhost และ preview host อื่น |
| `CUSTOMER_FEEDBACK_ENABLED` | `true` เมื่อพร้อมใช้ admin | ไม่ตั้ง = admin API 404 (fail closed) |
| `CUSTOMER_FEEDBACK_PUBLIC_ENABLED` | `false` จน pilot | คุม `/f` + public API ทั้งหมด |
| `CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY` | สุ่มใหม่ | ไม่มี fallback; เปลี่ยนทีหลังต้องหมุนรหัสทุก QR |
| `CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY` | สุ่มใหม่ (แยกจากตัวบน) | derive daily/weekly hash |
| `CUSTOMER_FEEDBACK_URGENT_ALERT_EMPLOYEE_IDS` | รหัสพนักงานผู้รับ escalation คั่นด้วย comma | ถ้าไม่ตั้งยังมี fallback ไป ADMIN/ผู้จัดการตามเคส แต่ผู้รับหลักอาจไม่เห็นทุกสถานี |

ใช้ `CRON_SECRET` เดิมกับ cron ใหม่ · `FIELD_ENCRYPTION_KEY` เดิมสำหรับเข้ารหัส token/contact (ห้ามเปลี่ยน)

---

## 5. ขั้นตอนลงการแก้รอบล่าสุด

เจ้าของยืนยันและดำเนินการตามลำดับนี้แล้วเมื่อ 24 สิงหาคม 2569 รายละเอียดผลอยู่หัวข้อ 12

ลำดับนี้ใช้กับ production ที่มีตาราง CustomerFeedback อยู่แล้วตามบันทึกหัวข้อ 10
ก่อนรันต้องแจ้งชื่อ host, branch, คำสั่ง และแผนสำรองให้เจ้าของเห็นก่อน

```bash
npm run db:diff                         # 1. ตรวจ SQL แบบออฟไลน์
npm run db:feedback-constraints:check   # 2. ตรวจรายการ constraint แบบออฟไลน์
# หลังเจ้าของยืนยันเท่านั้น:
node scripts/apply-feedback-constraints.cjs  # 3. ล้าง nonce ซ้ำและสร้าง unique index ก่อน db push
npm run db:push                              # 4. เพิ่มคอลัมน์ rating distribution และ sync schema
node scripts/apply-feedback-constraints.cjs  # 5. ตรวจซ้ำแบบ idempotent
npx tsx prisma/seed-customer-feedback-permissions.ts  # 6. seed permission แบบ additive เมื่อจำเป็น
# 7. deploy code → smoke test QR แบบทดสอบ → เปิด PUBLIC เป็นขั้นตอนสุดท้าย
```

ถ้าฐานข้อมูลเป้าหมายยังไม่มีตาราง CustomerFeedback ให้หยุดและจัดทำลำดับติดตั้งใหม่ก่อน เพราะคำสั่ง constraint ข้างต้นต้องใช้ตารางที่มีอยู่แล้ว

ลำดับเปิดใช้งานจริง: ตั้งเบอร์ฉุกเฉินสถานี → สร้าง QR `isTest` → พิมพ์/activate →
ทดสอบในทีม → สร้าง QR production (พนักงานต้องผ่าน "บันทึกรับทราบข้อมูลสาธารณะ" ก่อนทุกคน) →
เปิด `CUSTOMER_FEEDBACK_PUBLIC_ENABLED` เฉพาะสถานี pilot

---

## 6. งานที่ยังเหลือก่อนเปิดให้ลูกค้า

1. เจ้าของต้องแจ้งเบอร์ฉุกเฉินสาธารณะของ GASP, PAP, SPC และ WKO เพื่อบันทึกในสถานี
2. สร้าง STATION QR แบบ TEST แล้วพิมพ์ ยืนยันการพิมพ์ และเปิดใช้
3. เปิด public บน candidate ชั่วคราวและส่งแบบปกติกับเหตุเร่งด่วนโดยใช้ข้อมูลจำลอง
4. ตรวจว่าคำตอบเป็น `TEST` และไม่มี Case, Notification หรือ Alert จริง แล้วปิด candidate ทดสอบ
5. พนักงานแต่ละคนต้องเห็นชื่อเล่นกับตำแหน่งบนป้ายและให้ผู้ดูแลบันทึกการรับทราบ
6. พิมพ์ QR จริงครบ ตรวจรหัสบนป้าย แล้วกด `MARK_PRINTED` ก่อน activate
7. เปิด QR จริงเมื่อป้ายถูกนำไปติดแล้วเท่านั้น
8. เปิด `CUSTOMER_FEEDBACK_PUBLIC_ENABLED=true` สร้าง deployment ใหม่ และ smoke test production อีกครั้ง
9. กฎแจ้งเตือนเชิงคุณภาพบางข้อในแผน §18.6 ยังเป็น backlog เช่น QR ไม่เคยถูกสแกนและอัตราคำตอบผิดปกติรายช่วง
10. การตรวจพนักงานที่ล็อกอินแล้วพยายามประเมิน QR ของตนเองยังเป็น best-effort เพราะหน้าลูกค้าไม่บังคับ login
11. export มี CSV และงานพิมพ์ QR มีแบบ SVG ผ่านหน้าพิมพ์ขนาดเดียว ส่วน PNG, ป้ายชื่อ, A5/A4 สำเร็จรูป และสร้างหลายคนพร้อมกันยังเป็น backlog
12. ต้องทดสอบงานพิมพ์จริง แสงจริง อินเทอร์เน็ตช้า keyboard โปรแกรมอ่านหน้าจอ และข้อความขยาย 200 เปอร์เซ็นต์
13. สูตรโบนัสตรุษจีนยังเป็น DRAFT และระบบปัจจุบันเก็บ Customer Feedback เป็นหลักฐานของรอบประเมินเท่านั้น

---

## 7. วิธีทำงานต่อ (สำหรับ AI ตัวถัดไป)

ตรวจสถานะเบื้องต้น (ทำได้ทั้งหมดโดยไม่แตะฐานข้อมูล):

```bash
git status --porcelain          # ควรว่าง ยกเว้นเอกสารสถานะที่กำลังอัปเดตโดยตั้งใจ
npx tsc --noEmit                # ต้องผ่าน
npx vitest run                  # ทุก test ต้องผ่าน
npm run lint                    # ต้อง 0 error
npm run build                   # ต้องผ่าน
npm run db:diff                 # ผลลัพธ์ = prisma/migrations-preview.sql
```

ถ้าเจ้าของยืนยันลง schema แล้วและให้ทดสอบต่อ ให้ทดสอบตามลำดับนี้:
1. seed permission แล้วเช็ค `/admin/permissions` เห็นกลุ่ม "เสียงลูกค้า" 11 ตัว
2. ตั้ง `publicEmergencyPhone` สถานี pilot → สร้าง STATION QR `isTest` → activate
3. เปิด flag ทั้งสอง (local .env) → เปิด `/f` กรอกรหัสกรอกเอง → ทดสอบ flow จบถึงหน้าขอบคุณ
   และ flow incident · ตรวจคำตอบเข้าตาราง · ตรวจเคส URGENT สร้าง + Notification
4. ทดสอบ MANAGER scope (ต้องเห็นเฉพาะสถานีตัวเอง / ไม่มี stationId = 403)
   และ contact endpoint สร้าง AuditLog

อ่านแผนฉบับเต็มก่อนขยายงาน: [docs/customer-feedback-qr-evaluation-plan.md](customer-feedback-qr-evaluation-plan.md)
โดยเฉพาะหัวข้อ 15–16 (validation/anti-abuse), 18 (KPI/guardrail), 22 (test plan)

---

## 8. บันทึกย้อนหลัง: ผลตรวจ 23 สิงหาคม 2569

ตรวจซ้ำทุกข้อในหัวข้อ 2 แล้วตรงตามที่อ้าง: `tsc` ผ่าน · 160 tests ผ่าน · `eslint` 0 error · `next build` ผ่าน

### ช่องโหว่ที่พบ (ไม่ได้อยู่ในหัวข้อ 6)

**rate limit ของ public API ปลอมผ่านได้ทั้งหมด**

`/resolve` และ `/incidents/start` ใช้ `resolveNonceHash()` เป็นคีย์ rate limit ซึ่งคำนวณจาก
header `Resolve-Idempotency-Key` ที่ client ส่งมาเอง สุ่ม header ใหม่ทุกครั้ง = ได้ bucket ใหม่ทุกครั้ง
= เพดาน 30/ชม. และ 5/นาที ไม่ทำงานเลย

`/incidents/start` เส้น standalone ไม่ต้องมี QR หรือ token ใด ๆ จึงเป็นทางให้คนนอกสร้างแถวใน
`CustomerFeedbackVisit` ได้ไม่จำกัด Neon free plan มีที่เก็บ 0.5 GB — ถมจนระบบ HR ทั้งระบบล่มได้

**แก้แล้ว** — คีย์ rate limit เปลี่ยนไปใช้ `networkRateKey()` (ผูกกับ IP ปลอมไม่ได้) และซ้อนเป็นชั้น:

| ชั้น | เพดาน | เหตุผล |
|---|---|---|
| ต่อเครือข่าย | 300/ชม. | กว้างเพราะ CGNAT ของเครือข่ายมือถือไทย |
| ต่อ QR หนึ่งใบ | 120/ชม. | ป้ายเดียวไม่ควรถูกเปิดถี่กว่านี้ |
| ต่อ idempotency key | 30/ชม. | ช่วยเฉพาะ client ที่ส่ง header มาตรง ๆ |
| standalone incident | 30/ชม./เครือข่าย | เส้นเดียวที่ไม่มีอะไรยืนยันตัวตน |
| global | 10,000 visit/นาที · 3,000 invalid/นาที | §14.1 |
| เดารหัสกรอกเอง | 20/นาที/เครือข่าย | แทนเพดานเดิมที่ปลอมผ่านได้ |

regression test อยู่ที่ `src/lib/__tests__/customer-feedback-rate-limit-key.test.ts`
ยืนยันว่า `networkRateKey()` ไม่ขยับตาม header ที่ client ส่งมา

### ที่แก้เพิ่ม

1. **Resolve-Idempotency-Key ใช้ dedupe จริงแล้ว** — ส่ง key เดิมซ้ำได้ Visit เดิม ไม่สร้างแถวใหม่
   (ทำเฉพาะเมื่อมี header จริง ถ้าไม่มี nonce เป็น `"anonymous"` ซึ่งชนกันข้ามคนได้)
2. **global circuit breaker** ตาม §14.1 ครบทั้ง visit-create และ invalid-resolve
3. **คิวเคส** — Postgres เรียง enum ตาม**ลำดับที่ประกาศ** (`NORMAL, HIGH, URGENT`) ไม่ใช่ตามตัวอักษร
   `severity: "asc"` เดิมจึงดัน **URGENT ไปหน้าสุดท้าย** ทั้งที่เป็นเรื่องอันตราย SLA 2 ชม.
   แก้เป็น `desc` แล้ว
4. **retention ที่ประกาศไว้แต่ไม่มีใครใช้** — `COMMENT_NULL_AFTER_MONTHS`,
   `RESPONSE_RETENTION_MONTHS`, `REVIEW_REQUEST_RETENTION_MONTHS` ไม่ถูกอ้างถึงที่ไหนเลย
   นโยบาย PDPA เขียนไว้แต่ไม่มีอะไรบังคับใช้ เพิ่มขั้นตอน 7–9 ใน cron แล้ว
   (ลบ Response ข้ามรายการที่เคสยังไม่ปิด)
5. **metrics เพี้ยน** — `recordResolve()` ฮาร์ดโค้ด `"TOKEN"` ในเส้น INACTIVE ทำให้ยอดฝั่ง
   MANUAL_CODE หายไป · `formExpiresAt` ที่คืนกลับใช้ค่าที่คำนวณใหม่แทนค่าจริงของ visit
6. **`/incidents/start` ไม่เคยตั้ง `Cache-Control: no-store`** — เพิ่มแล้ว
7. **token ตอน reuse visit** ผูกกับ `visit.qrVersionAtOpen` แทน `qr.version` ปัจจุบัน
   (กัน mismatch ถ้า QR ถูก rotate คั่นกลาง)

หลังแก้: `tsc` ผ่าน · **165 tests ผ่าน** · `eslint` 0 error · `next build` ผ่าน (179 หน้า)

### ยังไม่ได้ทำ (ต้องรอเจ้าของตัดสินใจ)

- §6 ข้อ 1 (integration test จริง), 4 (กฎแจ้งเตือน §18.6), 5 (ตรวจพนักงานประเมิน QR ตัวเอง),
  7 (Phase 0 ทั้งหมด: ชื่อสาธารณะพนักงาน, สถานี pilot, PDPA retention, ผู้รับ alert)
- ค่า retention ใน `retention.ts` ยังเป็นค่า**ที่เสนอ** ต้องให้ผู้รับผิดชอบ PDPA ยืนยันก่อน production

---

## 9. นโยบายชื่อสาธารณะของพนักงาน (เจ้าของตัดสิน 23 ส.ค. 2569)

**พนักงานรับการประเมินด้วยชื่อเล่น** ป้าย QR ที่ลูกค้าเห็นมีแค่ชื่อเล่น + ตำแหน่งงาน
ไม่มีชื่อจริง นามสกุล หรือรหัสพนักงาน

เดิมโค้ด fallback เป็น `employee.name.split(" ")[0]` เมื่อไม่มีชื่อเล่น ซึ่งทำให้**ชื่อจริงขึ้นป้าย**
ตอนนี้ตัด fallback ออกแล้ว — ไม่มีชื่อเล่น = สร้าง QR ไม่ได้ ต้องไปกรอกในประวัติพนักงานก่อน

กติกาอยู่ใน `src/lib/customer-feedback/public-identity.ts` บังคับใช้ทั้งตอนสร้าง QR
และตอน `update-label` (แก้ทีหลังก็เปลี่ยนกลับไปเป็นชื่อจริงไม่ได้)

| กรณี | ผล |
|---|---|
| มีชื่อเล่น | ใช้ชื่อเล่น |
| ไม่มีชื่อเล่น / เว้นว่าง | 400 `NO_NICKNAME` — ข้อความ error ไม่มีชื่อจริงอยู่ในนั้น |
| ผู้ดูแลพิมพ์ชื่อเอง | ได้ (ชื่อเล่นสะกดได้หลายแบบ เช่น "เอ็ม หน้าลาน") |
| พิมพ์ชื่อจริงเต็ม | 400 `LOOKS_LIKE_LEGAL_NAME` |
| ชื่อในประวัติเป็นคำเดียว | ไม่ดัก (บางคนใช้ชื่อเล่นเป็นชื่อจริง) |
| ยาวเกิน 24 ตัวอักษร | 400 `TOO_LONG` |

### ชื่อเล่นซ้ำ

ตรวจข้อมูลจริงแล้วพบพนักงาน active 2 คนใช้ชื่อเล่น **"เอ็ม"** เหมือนกัน
ถ้าอยู่สถานีเดียวกัน ลูกค้าแยกไม่ออกว่าให้คะแนนใคร แล้วคะแนนจะไหลเข้ารอบประเมินผิดคน

ตอนสร้าง QR ระบบจะเช็คชื่อซ้ำกับเพื่อนร่วมสถานีและ**เตือน** (ไม่ block เพราะผู้ดูแลตั้งชื่อแยกเองได้)
`POST /qr-codes` คืน field `warning` และหน้า admin แสดงเป็น toast ค้าง 10 วินาที

### ความพร้อมของข้อมูล (ตรวจ 23 ส.ค. 2569)

พนักงาน active 57 คน — มีชื่อเล่น 49 ขาด 8
ทั้ง 8 คนที่ขาดเป็นบัญชี admin / ผู้จัดการ / บัญชีระบบ ไม่ใช่พนักงานหน้าลานที่จะติดป้าย
**ถ้าจะออก QR ให้คนกลุ่มนี้ ต้องกรอกชื่อเล่นก่อน**

`/feedback/privacy` ระบุนโยบายนี้ให้ลูกค้าเห็นแล้ว

---

## 10. บันทึกย้อนหลัง: สถานะ deploy 23 สิงหาคม 2569

ข้อมูลส่วนนี้ยังไม่ได้ตรวจ production ซ้ำในรอบ 24 สิงหาคม 2569 ใช้เพื่อรู้ว่างานใดเคยได้รับอนุญาตและเคยรันแล้วเท่านั้น

### ลงกับ production แล้ว

| ขั้นตอน | ผล |
|---|---|
| `npm run db:push` | **57 ตาราง** (เดิม 43 +14) ข้อมูลเดิมครบ: User 74 · Attendance 6,816 · JobApplication 24 |
| CHECK constraint + partial index | 13/13 (`scripts/apply-feedback-constraints.cjs` รันซ้ำได้) |
| seed permission | Permission 28 → 39 · RolePermission 82 → 108 |
| env ใน Vercel production | ครบ 5 ตัว |

SQL ที่ลงเป็น additive ล้วน ไม่มี DROP/TRUNCATE/DELETE คอลัมน์ที่เพิ่มในตารางเดิม
(`Station.publicEmergencyPhone`, `Notification.eventKey`, `ReviewPeriod.closedAt/closedById`)
เป็น nullable ทั้งหมด

### การตัดสินใจของเจ้าของ

**เปิดใช้พร้อมกันทุกสถานี** ไม่ทำ pilot ทีละแห่ง

**โดเมน: ใช้ `timetrack-lake.vercel.app` ไปก่อน** — จึงถอด `*.vercel.app` ออกจาก
`BLOCKED_HOST_PATTERNS` ใน `token.ts` (`localhost` / loopback / `.local` ยังบล็อกอยู่)

> ⚠ ข้อแลกเปลี่ยนที่รับไว้แล้ว: ลูกค้าที่สแกน QR ที่ปั๊มจะเห็นโดเมน `vercel.app`
> ซึ่งหน้าตาเหมือนลิงก์หลอกลวง อาจกดออกโดยไม่กรอก
> และ **โดเมนอยู่ในตัว URL ที่พิมพ์ลงป้าย** ถ้าย้ายไปโดเมนบริษัทภายหลัง
> ป้ายทุกใบต้องพิมพ์ใหม่ทั้งหมด (rotate QR ไม่ช่วย)
> ยิ่งเปิดพร้อมกันทุกสถานี ยิ่งต้องพิมพ์ใหม่เยอะ — ถ้ามีโดเมนอยู่แล้วควรตั้งก่อนพิมพ์

**พนักงาน 8 คนที่ไม่มีชื่อเล่น: ปล่อยไว้** — คนกลุ่มนี้ (admin / ผู้จัดการ / บัญชีระบบ)
จะออก EMPLOYEE QR ไม่ได้จนกว่าจะกรอกชื่อเล่น ซึ่งตรงกับที่ตั้งใจ

### ยังไม่ได้ทำ — ต้องทำต่อตามลำดับนี้

1. **merge branch `fix/prisma-production-guardrails` เข้า main** — ตอนนี้ production ยังรันโค้ดเก่า
   ที่ไม่มีฟีเจอร์นี้ (schema ล้ำหน้าโค้ดอยู่ ซึ่งไม่พังเพราะ additive)
2. รอ Vercel deploy แล้วเข้า `/admin/customer-feedback` ตรวจว่าโหลดได้
3. ตั้ง `publicEmergencyPhone` ให้ครบทั้ง 4 สถานี — **STATION QR ที่ไม่มีเบอร์นี้ activate ไม่ได้**
4. สร้าง QR `isTest` ทดสอบ flow ให้จบก่อน แล้วค่อยสร้าง QR จริง
5. พิมพ์ป้าย → บันทึกการรับทราบข้อมูลสาธารณะของพนักงานแต่ละคน → activate
6. **ค่อยเปิด `CUSTOMER_FEEDBACK_PUBLIC_ENABLED=true` เป็นขั้นตอนสุดท้าย**
   (ตอนนี้ตั้ง `false` ไว้ เพราะเปิดก่อนมี QR = เปิดฟอร์มที่ไม่มีใครเข้าถึงได้)
7. ~~ผู้รับ alert เคส URGENT~~ **ตัดสินแล้ว = benz (`admin`)** ตั้งใน
   `CUSTOMER_FEEDBACK_URGENT_ALERT_EMPLOYEE_IDS` ทั้ง local และ Vercel
   เดิมเคส URGENT ที่สถานีซึ่งมีผู้จัดการอยู่จะเข้าแค่ผู้จัดการ ผู้บริหารไม่เคยรู้ —
   ตอนนี้ URGENT ส่งถึงผู้รับ escalation เสมอ เพิ่มจากผู้จัดการสถานี
8. ~~ค่า retention~~ **เจ้าของรับค่าที่ตั้งไว้แล้ว** (Visit 90 วัน · ข้อความ 12 เดือน ·
   Response 24 เดือน · contact 120 วัน/ปิดเคส+30 วัน) cron บังคับใช้อยู่

---

## 11. งานตรวจและแก้รอบ 24 สิงหาคม 2569

### Public form และการป้องกันข้อมูลผิด

- public API ตรวจ feature flag, secret, origin, content type และขนาด body ด้วย helper ชุดเดียว
- validation ปฏิเสธ field ที่ client ไม่มีสิทธิ์กำหนดและใช้เวลาเริ่ม/จบจาก server
- resolve และ standalone incident ใช้ nonce เฉพาะเมื่อ client ส่ง header จริง
- composite unique index กัน resolve พร้อมกันสร้าง Visit ซ้ำ และ partial unique index กัน standalone incident ซ้ำ
- rate limit ใช้ network key ที่ client เปลี่ยนเองไม่ได้ พร้อมเพดานต่อเครือข่าย ต่อ QR และทั้งระบบ
- การออก Visit ล็อก User/Station แล้วล็อก QR จากนั้นตรวจสถานะและสร้างหรือ reuse Visit ใน transaction เดียวกับการบันทึก `lastResolvedAt`
- รหัสเดิมที่ถูก rotate หรือ deactivate ระหว่าง resolve จะไม่ออก Visit ใหม่ และมี test ยืนยันทั้งกรณีชนกับกรณีสำเร็จ
- invalid-resolve breaker บันทึก CustomerFeedbackAlertLog รายหนึ่งนาทีและใช้ Notification.eventKey กันแจ้งผู้ดูแลซ้ำ
- submit ใช้ transaction, conditional state change และ qrVersion เพื่อกัน double submit กับ QR rotation ชนกัน
- วันกะงานคำนวณตามวันกรุงเทพทั้งช่วง จึงไม่หลุดกะที่อยู่คนละวัน UTC ใกล้เที่ยงคืน
- TEST response ไม่สร้างเคส การแจ้งเตือน หรือ AlertLog ที่ใช้ปฏิบัติงานจริง
- draft ใน browser เก็บเฉพาะขั้นตอน คะแนน เหตุผล และตัวเลือกทั่วไป โดยไม่เก็บข้อความอิสระหรือข้อมูลติดต่อ
- progress, submit, incident start และ incident submit มีเพดานต่อ Visit แยกกัน; ค้นหาสถานียกเลิกคำขอเก่าและรองรับ 429

### QR และงานพิมพ์

- activate, deactivate, rotate, reveal, approve, update-label, mark-printed และ promote-test ตรวจ `expectedVersion` เพื่อกันผู้ดูแลสองคนเขียนทับกัน
- promote-test ทำได้เฉพาะ QR ทดสอบที่ปิดอยู่ โดยหมุนรหัสรายการทดสอบเดิม เก็บข้อมูลทดสอบไว้ และสร้าง QR จริงเป็นรายการใหม่พร้อม token กับ manual code ใหม่
- update-label หมุนรหัสและเพิ่ม version เพราะข้อความบนป้ายเปลี่ยนแล้วต้องพิมพ์ใหม่
- ป้ายทดสอบเดิมใช้ไม่ได้หลัง promote แต่ข้อมูลทดสอบยังเก็บกับรายการเดิม และป้ายชื่อเวอร์ชันเก่าจะใช้ไม่ได้หลัง rotate หรือ update-label
- หน้าพิมพ์ต้องให้ผู้ดูแลยืนยันว่าพิมพ์สำเร็จก่อนบันทึก `MARK_PRINTED`
- รายชื่อผู้สมัครสร้าง QR ใช้สถานีหลักของพนักงานและปิดตัวเลือกคนที่มี QR อยู่แล้ว
- QR ทดสอบมี watermark และหน้า admin มีปุ่ม promote พร้อมคำเตือนว่าต้องพิมพ์ใหม่
- POST สร้าง QR กับ promote-test ล็อกเป้าหมายชุดเดียวกันและใช้เงื่อนไข production เดียวกัน จึงสร้าง QR จริงซ้ำให้พนักงานหรือจุดติดตั้งเดียวกันไม่ได้

### สิทธิ์ คิวเคส และการกลั่นกรอง

- ADMIN เห็นข้อมูลทั้งหมด ส่วน HR ต้องมี permission ที่ตรงกับงานนั้น และ MANAGER ถูกจำกัดด้วย station ปัจจุบันจากฐานข้อมูล
- responses, export, cases, review requests, QR candidates และ dashboard ใช้ station scope กับ permission ชุดเดียวกัน
- ผู้ไม่มี `view_incident` ไม่เห็น incident row, count, comment หรือข้อมูลใน export
- contact ถูกแยก endpoint เข้ารหัสและเขียน AuditLog แบบ fail-closed ก่อนคืนข้อมูล
- การ assign เคสและเปลี่ยนสถานีใช้เงื่อนไขสถานะเดิมเพื่อกัน race และการเปลี่ยนสถานีจะล้าง assignee เดิม
- คิวเคสไม่แสดง TEST response และการสร้างเคสด้วยมือปฏิเสธ TEST
- moderation กับ review request ตรวจสถานะล่าสุดก่อน update เพื่อกันการเขียนทับ

### รอบประเมินและหลักฐานคะแนน

- หน้า Performance โหลดทุกรอบและส่ง `reviewPeriodId` ไปยัง self-summary ที่เลือก
- รอบที่ยังเปิดอ่านข้อมูลสดตามช่วงวัน ส่วนรอบที่ปิดอ่าน snapshot ของพนักงานคนนั้น
- ปิด ReviewPeriod กับสร้าง snapshot อยู่ใน transaction เดียวและ retry เมื่อชนกัน
- snapshot นับ VALID กับ SUSPECTED จาก query เดียวเพื่อลดช่องว่างระหว่างการกลั่นกรอง
- พนักงาน active ที่มี EMPLOYEE QR ใช้งานจริงภายในช่วงได้รับ snapshot ศูนย์คำตอบด้วย เพื่อแยก “ไม่มีข้อมูล” จาก “ตกหล่นจากรายงาน”; QR ทดสอบไม่ทำให้เกิด snapshot
- ReviewSubmission รับได้เฉพาะรอบที่เปิด อยู่ในช่วงวันที่กำหนด และหนึ่งคนส่งได้หนึ่งครั้ง
- คำขอทบทวนผูก employee จาก session และพนักงานเห็นเฉพาะคำขอของตนเอง
- คะแนนยังไม่ถูกเขียนเข้า payroll หรือสูตรโบนัสอัตโนมัติ

### รายงานและ retention

- daily aggregate เก็บจำนวนคะแนน 1–5 แยก bucket เพื่อรักษา distribution หลังลบข้อมูลดิบ
- dashboard รวม aggregate เก่ากับ raw data หลัง cutoff โดยไม่ซ้ำ และแสดงคำเตือนเมื่อข้อมูลเก่ามี bucket ไม่ครบ
- funnel วันนี้ใช้ Visit สด ส่วนวันย้อนหลังใช้ aggregate
- retention ปกป้อง response ที่มีเคสเปิดหรืออยู่ใน ReviewPeriod ที่ยังไม่ปิด
- การล้าง comment ใช้ serializable transaction พร้อม retry เพื่อไม่ล้างข้อความระหว่างมีการเปิดเคส
- การ aggregate และ reconcile เรียง key กับวันที่ก่อนเขียนทุกครั้ง เพื่อลด deadlock เมื่องาน cron ซ้อนกัน
- การลบ Visit เลือก ID, reconcile และลบ ID ชุดเดิมใน serializable transaction เดียว จึงไม่ลบแถวที่เพิ่งเกิดระหว่างงาน
- ระบบปฏิเสธการสร้าง ReviewPeriod ที่เริ่มเก่ากว่า retention ของข้อมูลรายรายการ
- การลบพนักงานถาวรล็อก User และตรวจ QR, Visit, Response กับ Review Request ซ้ำใน transaction; ถ้ามีหลักฐานจะเปลี่ยนไปใช้การปิดพนักงาน

### UI ที่ตรวจแล้ว

- `/f` ใช้ได้ที่ความกว้าง 320, 375, 430 และ 768 พิกเซลโดยไม่มีการเลื่อนแนวนอน
- ปุ่ม ช่องรหัส ลิงก์หลัก และเบอร์โทรใน privacy notice มีพื้นที่แตะอย่างน้อย 44 พิกเซล
- สลับไทย/อังกฤษได้ ช่องรหัสเปิดปุ่มเมื่อครบ 8 ตัว และ error จาก server ไม่เปิดเผยว่ารหัสใดมีอยู่
- หน้าส่งข้อมูลปิดปุ่มแจ้งเหตุระหว่าง busy เพื่อกันเปลี่ยน flow ระหว่าง request
- หน้า target rejected ล้าง visit token เดิมก่อนให้เริ่มใหม่

### ไฟล์สำคัญที่เพิ่มในรอบนี้

- `src/lib/customer-feedback/calendar-day.ts`
- `src/app/api/public/customer-feedback/_request.ts`
- `src/components/customer-feedback/admin/review-requests-tab.tsx`
- `src/components/customer-feedback/admin/station-picker-dialog.tsx`
- `prisma/migrations/20260824000000_harden_customer_feedback_idempotency/migration.sql`
- route และ component tests ใต้ `src/app/**`, `src/components/**` และ `src/lib/__tests__/**`

### ขอบเขตการตรวจ

ผลตรวจทั้งหมดใช้ `DATABASE_URL` ปลอมที่ชี้ localhost และ secret สำหรับทดสอบเท่านั้น
ไม่มีคำสั่งในรอบนี้เชื่อม production หรือเปลี่ยนข้อมูล production

---

## 12. บันทึก release production 24 สิงหาคม 2569

เจ้าของยืนยันให้ดำเนินการ production หลังได้รับชื่อฐานข้อมูล คำสั่งเขียนข้อมูล และแผนกู้คืนแล้ว

### จุดกู้คืน

- Neon project `shiny-flower-73333021`, parent branch `production`
- recovery branch `pre-feedback-launch-2026-08-24-2051-ict`
- recovery branch id `br-empty-wildflower-a16ylj9s`
- snapshot parent time `2026-08-24T13:50:36Z` หรือ 20:50:36 เวลาไทย
- deployment ก่อนหน้า `dpl_6Q8dZzdw53JLa3Jrg8GqmWao7q9G`

### ผลฐานข้อมูล

- preflight พบ User 74, Visit 0, Response 0 และ nonce ซ้ำ 0 กลุ่ม
- live diff ก่อนลงมีเฉพาะ rating bucket 5 คอลัมน์กับ composite unique index 1 รายการ
- `node scripts/apply-feedback-constraints.cjs` ผ่านโดยไม่มี failure
- `npm run db:push` ผ่านโดยไม่มี data-loss warning
- rerun constraint ผ่าน และ live diff หลังลงเป็น empty migration
- permission seed ผ่านและจำนวนสิทธิ์ต่อ role ตรงตามหัวข้อ 2

### ผลโค้ดและ Vercel

- test ผ่าน 56 ไฟล์ 348 tests, type check ผ่าน, lint 0 error และ build ผ่าน 179 หน้า
- commit `21141f51aa40fbea0c700771c6499b8e3b6e38bc` push ไป `main`
- Vercel project นี้เป็น sourceless จึงไม่ deploy อัตโนมัติจาก Git push รอบนี้
- candidate build ผ่านและ promote เป็น production deployment `dpl_HC6E78rXBBu5mNz1rKmtFoeUGsfH`
- หลัง promote `/f` = 404, `/feedback/privacy` = 200 และ admin summary = 401 เมื่อไม่ล็อกอิน
- บัญชี ADMIN เปิด `/admin/customer-feedback` และโหลดแท็บภาพรวม คำตอบ เคส QR Codes คำถาม และคำขอทบทวนได้ครบ

### เหตุที่ยังไม่เปิด public

- สถานี active 4 แห่งยังไม่มีเบอร์ฉุกเฉิน จึงสร้างหรือ activate STATION QR ไม่ได้
- พนักงานที่มีชื่อเล่น 48 คนมี QR จริงรอเปิดใช้แล้ว จึงสร้าง TEST QR ซ้ำไม่ได้
- การกดรับทราบแทนพนักงานหรือบันทึกเบอร์ฉุกเฉินที่เดาเองจะทำให้หลักฐานใช้งานจริงผิด
- public flag เปิดทั้งแบบ QR และ standalone incident พร้อมกัน จึงห้ามเปิดเพื่อทดลองก่อน TEST QR พร้อม
- ระบบถูกทิ้งไว้ในสภาพปลอดภัย: admin เปิดใช้, public ปิด, QR ทั้งหมดปิด และข้อมูลลูกค้าเป็นศูนย์
