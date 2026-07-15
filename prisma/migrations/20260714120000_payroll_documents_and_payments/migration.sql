ALTER TABLE "PayrollRecord"
ADD COLUMN IF NOT EXISTS "dailyRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "documentNumber" TEXT,
ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT,
ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'BANK_TRANSFER',
ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "paymentReference" TEXT,
ADD COLUMN IF NOT EXISTS "paymentNote" TEXT;

UPDATE "PayrollRecord" AS record
SET "dailyRate" = employee."dailyRate"
FROM "User" AS employee
WHERE record."userId" = employee."id"
  AND record."dailyRate" = 0;

UPDATE "PayrollRecord" AS record
SET "documentNumber" = CONCAT(
    'PS-',
    TO_CHAR(period."endDate" AT TIME ZONE 'Asia/Bangkok', 'YYYYMM'),
    '-',
    REGEXP_REPLACE(COALESCE(record."employeeCode", employee."employeeId"), '[^A-Za-z0-9ก-๙]+', '-', 'g')
)
FROM "PayrollPeriod" AS period, "User" AS employee
WHERE record."periodId" = period."id"
  AND record."userId" = employee."id"
  AND record."documentNumber" IS NULL;

UPDATE "PayrollRecord"
SET "receiptNumber" = REGEXP_REPLACE("documentNumber", '^PS-', 'PR-')
WHERE "receiptNumber" IS NULL
  AND "documentNumber" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRecord_documentNumber_key"
ON "PayrollRecord"("documentNumber");

CREATE UNIQUE INDEX IF NOT EXISTS "PayrollRecord_receiptNumber_key"
ON "PayrollRecord"("receiptNumber");

CREATE INDEX IF NOT EXISTS "PayrollRecord_paymentStatus_idx"
ON "PayrollRecord"("paymentStatus");
