# Handoff: ระบบเสียงลูกค้า (Customer Feedback QR) — สถานะหลัง implement

เอกสารนี้สำหรับ AI ตัวถัดไปที่รับงานต่อ อ่านให้จบก่อนทำอะไร
วันที่เขียน: 23 สิงหาคม 2569 (หลังเหตุการณ์ลบข้อมูล production — ดูหัวข้อ 1)

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

## 2. สถานะปัจจุบัน (ตรวจแล้ววันที่เขียน handoff)

- โค้ดฟีเจอร์เสร็จครบตาม scope ที่ตกลง อยู่ใน working tree ของ branch
  `fix/prisma-production-guardrails` — **ยังไม่ commit** (28 ไฟล์: 13 แก้ + 15 กลุ่มไฟล์ใหม่)
- ผลตรวจ: `tsc --noEmit` ผ่าน · `vitest run` 17 ไฟล์ 160 tests ผ่าน · `eslint` 0 error
  · `next build` ผ่าน (`/f` และ `/feedback/privacy` อยู่ใน route list)
- **schema ยังไม่ถูก apply กับ production** — production มี 43 ตาราง, schema.prisma มี 57 models
  ตาราง `CustomerFeedback*` ทั้งหมดยังไม่มีใน production (= 0) → ฟีเจอร์ยังรันจริงไม่ได้
  ทุก admin API ของฟีเจอร์นี้จะ 500 (P2021) จนกว่าจะ push schema
- **permission seed ยังไม่ได้รัน** (`prisma/seed-customer-feedback-permissions.ts`)
- **feature flag ปิดอยู่ทั้งคู่** (`CUSTOMER_FEEDBACK_ENABLED`, `CUSTOMER_FEEDBACK_PUBLIC_ENABLED`
  ยังไม่มีใน .env / Vercel — fail closed ตามดีไซน์)
- แผนงานต้นทาง: [docs/customer-feedback-qr-evaluation-plan.md](customer-feedback-qr-evaluation-plan.md)
  (implement อิงแผนนี้ ตัด/ย่อบางส่วน — ดูหัวข้อ 6)

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
- `prisma/migrations-preview.sql` — ผล `npm run db:diff` (538 บรรทัด, 55 DDL)
- `prisma/migrations/20260823000000_add_customer_feedback/migration.sql` — diff เต็ม **+ส่วนท้ายที่เขียนเพิ่มเอง**
  (CHECK constraints + partial unique indexes ที่ Prisma สั่งสร้างไม่ได้ — ดูหัวข้อ 5)

---

## 4. Env vars ที่ต้องตั้งใน Vercel

| ตัวแปร | ค่าตอน deploy แรก | หมายเหตุ |
|---|---|---|
| `APP_BASE_URL` | โดเมน production จริง | ใช้สร้าง URL ใน QR ฝั่ง server; reject localhost/vercel.app ใน production |
| `CUSTOMER_FEEDBACK_ENABLED` | `true` เมื่อพร้อมใช้ admin | ไม่ตั้ง = admin API 404 (fail closed) |
| `CUSTOMER_FEEDBACK_PUBLIC_ENABLED` | `false` จน pilot | คุม `/f` + public API ทั้งหมด |
| `CUSTOMER_FEEDBACK_MANUAL_CODE_HMAC_KEY` | สุ่มใหม่ | ไม่มี fallback; เปลี่ยนทีหลังต้องหมุนรหัสทุก QR |
| `CUSTOMER_FEEDBACK_ABUSE_HMAC_KEY` | สุ่มใหม่ (แยกจากตัวบน) | derive daily/weekly hash |

ใช้ `CRON_SECRET` เดิมกับ cron ใหม่ · `FIELD_ENCRYPTION_KEY` เดิมสำหรับเข้ารหัส token/contact (ห้ามเปลี่ยน)

---

## 5. ขั้นตอน deploy (ต้องรอเจ้าของยืนยันก่อน — AI ห้ามรันเอง)

```bash
npm run db:diff          # 1. ทบทวน prisma/migrations-preview.sql
npm run db:push          # 2. ลง schema (ผ่าน guard) — ค่อยรันเมื่อเจ้าของยืนยัน
# 3. (แนะนำ ไม่ block) รัน SQL ส่วนท้ายของ prisma/migrations/20260823000000_add_customer_feedback/migration.sql
#    (หลัง comment "Customer feedback: check constraints") ผ่าน Neon SQL editor
#    — CHECK constraints + partial unique indexes ที่ db push สร้างไม่ได้
#    app logic บังคับกติกาเหล่านี้อยู่แล้ว จึงเป็น defense-in-depth
npx tsx prisma/seed-customer-feedback-permissions.ts   # 4. permission additive (rerun ได้)
# 5. ตั้ง env ใน Vercel → deploy → เปิด CUSTOMER_FEEDBACK_ENABLED ก่อน PUBLIC
```

ลำดับเปิดใช้งานจริง: ตั้งเบอร์ฉุกเฉินสถานี → สร้าง QR `isTest` → พิมพ์/activate →
ทดสอบในทีม → สร้าง QR production (พนักงานต้องผ่าน "บันทึกรับทราบข้อมูลสาธารณะ" ก่อนทุกคน) →
เปิด `CUSTOMER_FEEDBACK_PUBLIC_ENABLED` เฉพาะสถานี pilot

---

## 6. สิ่งที่ยังไม่เสร็จ / ตัดสินใจเอง / ต้องรอเจ้าของตัดสินใจ

**ยังไม่เสร็จ / ไม่ได้ทำ:**
1. ไม่ได้ทดสอบ integration กับฐานข้อมูลจริงเลย (ต้องมีตารางก่อน) — อย่าถือว่า "ทดสอบครบ" ระดับ runtime
2. ~~resolve ยังไม่ dedupe ด้วย Resolve-Idempotency-Key~~ **แก้แล้ว** — ดูหัวข้อ 8
3. ~~global circuit breaker~~ **แก้แล้ว** — ดูหัวข้อ 8
4. กฎแจ้งเตือน §18.6 ส่วนใหญ่ยังไม่ทำ (มีแค่ AlertLog ตอนเคส URGENT)
5. ตรวจ "พนักงานล็อกอินประเมิน QR ตัวเอง" ยังไม่ทำ (spec บอก best-effort)
6. retention บางส่วนยังไม่อยู่ใน cron: comment→null ที่ 12 เดือน, ลบ Response/Answer ที่ 24 เดือน
7. Phase 0 ของแผนยังไม่มีใครตอบ: ชื่อสาธารณะพนักงาน, สถานี pilot, PDPA retention, ผู้รับ alert

**ตัดสินใจเอง (เจ้าของอาจอยากเปลี่ยน):**
- export ทำเฉพาะ CSV (แผนบอก CSV หรือ XLSX)
- พิมพ์ป้าย QR = SVG ใน print window ขนาดเดียว (ยังไม่มี PNG/PDF/A5/A4/ป้ายชื่อแยก)
- ฟอร์ม incident ไม่มีช่องค้นหาสถานี — standalone incident ไม่มีสถานี (ระบบรองรับ, URGENT ไป ADMIN/HR)
- `/f` ใช้ toggle ภาษาในหน้าเอง ไม่ใช้ LanguageContext (public ไม่ควรโหลด session stack)
- หน้าขอบคุณคะแนน 1–2 แสดง refCode แต่ไม่แสดงเวลา SLA เป็นตัวเลข

**ความคลาดเคลื่อนเล็กน้อยจาก spec:**
- manual-code rate limit นับทุกครั้งที่กรอก ไม่ใช่เฉพาะครั้งที่ผิด (คงไว้ตามเดิม — เข้มกว่า จึงปลอดภัยกว่า)
- ~~คิวเคสเรียง severity ตามตัวอักษร~~ **แก้แล้ว** — และของจริงแย่กว่าที่เขียนไว้ ดูหัวข้อ 8
- ~~หน้า admin แยก 404 กับ 403 ไม่ออก~~ **แก้แล้ว** — ดูหัวข้อ 8

**รอเจ้าของ:** ยืนยัน `npm run db:push` · ยืนยัน seed · ตั้ง env

---

## 7. วิธีทำงานต่อ (สำหรับ AI ตัวถัดไป)

ตรวจสถานะเบื้องต้น (ทำได้ทั้งหมดโดยไม่แตะฐานข้อมูล):

```bash
git status --porcelain          # ควรเห็นไฟล์งาน 28 กลุ่มตามหัวข้อ 3
npx tsc --noEmit                # ต้องผ่าน
npx vitest run                  # ต้องผ่าน 160 tests
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

## 8. ผลตรวจโดย Claude (23 ส.ค. 2569 หลัง handoff)

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
