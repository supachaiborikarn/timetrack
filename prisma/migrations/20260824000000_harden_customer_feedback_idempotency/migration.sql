-- รักษา Visit/Response เดิมไว้ทั้งหมด และล้าง nonce เฉพาะแถวซ้ำก่อนเพิ่ม unique
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "resolveNonceHash", "qrCodeId", "visitKind"
           ORDER BY "openedAt" ASC, "id" ASC
         ) AS row_number
  FROM "CustomerFeedbackVisit"
  WHERE "resolveNonceHash" IS NOT NULL AND "qrCodeId" IS NOT NULL
)
UPDATE "CustomerFeedbackVisit" AS visit
SET "resolveNonceHash" = NULL
FROM ranked
WHERE visit."id" = ranked."id" AND ranked.row_number > 1;

-- Resolve ที่ใช้ nonce เดิมพร้อมกันต้องสร้าง STANDARD Visit ได้เพียงแถวเดียว
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerFeedbackVisit_resolveNonceHash_qrCodeId_visitKind_key"
  ON "CustomerFeedbackVisit"("resolveNonceHash", "qrCodeId", "visitKind");

-- PostgreSQL ถือ NULL ใน composite unique ว่าไม่ชนกัน จึงต้องมี partial index
-- แยกสำหรับ standalone incident ซึ่งไม่มี qrCodeId และ parentVisitId
WITH ranked AS (
  SELECT "id",
         ROW_NUMBER() OVER (
           PARTITION BY "resolveNonceHash"
           ORDER BY "openedAt" ASC, "id" ASC
         ) AS row_number
  FROM "CustomerFeedbackVisit"
  WHERE "resolveNonceHash" IS NOT NULL
    AND "qrCodeId" IS NULL
    AND "parentVisitId" IS NULL
    AND "visitKind" = 'INCIDENT'
    AND "targetType" = 'UNKNOWN'
)
UPDATE "CustomerFeedbackVisit" AS visit
SET "resolveNonceHash" = NULL
FROM ranked
WHERE visit."id" = ranked."id" AND ranked.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerFeedbackVisit_standalone_incident_nonce_key"
  ON "CustomerFeedbackVisit"("resolveNonceHash")
  WHERE "resolveNonceHash" IS NOT NULL
    AND "qrCodeId" IS NULL
    AND "parentVisitId" IS NULL
    AND "visitKind" = 'INCIDENT'
    AND "targetType" = 'UNKNOWN';
