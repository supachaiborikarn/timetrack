ALTER TABLE "DailyPayrollOverride"
ADD COLUMN IF NOT EXISTS "otherDeduction" DECIMAL(65,30);

ALTER TABLE "PayrollRecord"
ADD COLUMN IF NOT EXISTS "adjustment" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "specialIncome" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "employeeName" TEXT,
ADD COLUMN IF NOT EXISTS "employeeCode" TEXT,
ADD COLUMN IF NOT EXISTS "stationName" TEXT,
ADD COLUMN IF NOT EXISTS "departmentName" TEXT,
ADD COLUMN IF NOT EXISTS "bankName" TEXT,
ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;

DROP INDEX IF EXISTS "PayrollPeriod_startDate_endDate_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "PayrollPeriod_startDate_endDate_key"
ON "PayrollPeriod"("startDate", "endDate");

INSERT INTO "SystemConfig" ("id", "key", "value", "createdAt", "updatedAt")
VALUES ('social_security_max_2026', 'social_security_max', '875', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO UPDATE
SET "value" = '875', "updatedAt" = CURRENT_TIMESTAMP;
