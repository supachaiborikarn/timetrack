-- CreateEnum
CREATE TYPE "FeedbackTargetType" AS ENUM ('EMPLOYEE', 'STATION', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "FeedbackResponseKind" AS ENUM ('STANDARD', 'INCIDENT');

-- CreateEnum
CREATE TYPE "FeedbackVisitKind" AS ENUM ('STANDARD', 'INCIDENT');

-- CreateEnum
CREATE TYPE "FeedbackVisitDisposition" AS ENUM ('OPEN', 'SUBMITTED', 'TARGET_REJECTED', 'SWITCHED_TO_INCIDENT', 'ABANDONED', 'BOT_BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FeedbackQrPlacement" AS ENUM ('EMPLOYEE_BADGE', 'STATION_MAIN', 'CASHIER', 'PUMP', 'RESTROOM', 'SHOP', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackValidity" AS ENUM ('VALID', 'SUSPECTED', 'HIDDEN', 'TEST');

-- CreateEnum
CREATE TYPE "FeedbackCaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "FeedbackCaseSeverity" AS ENUM ('NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FeedbackContactChannel" AS ENUM ('PHONE', 'EMAIL');

-- CreateEnum
CREATE TYPE "FeedbackDangerStatus" AS ENUM ('YES', 'NO', 'UNSURE');

-- CreateEnum
CREATE TYPE "FeedbackAnswerState" AS ENUM ('ANSWERED', 'SKIPPED', 'NOT_SHOWN');

-- CreateEnum
CREATE TYPE "FeedbackReviewRequestStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "ReviewPeriod" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "closedById" TEXT;

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "publicEmergencyPhone" TEXT;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "eventKey" TEXT;

-- CreateTable
CREATE TABLE "CustomerFeedbackQr" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "tokenCiphertext" TEXT NOT NULL,
    "tokenHint" TEXT NOT NULL,
    "manualCodeHash" TEXT NOT NULL,
    "manualCodeCiphertext" TEXT NOT NULL,
    "manualCodeHint" TEXT NOT NULL,
    "targetType" "FeedbackTargetType" NOT NULL,
    "employeeId" TEXT,
    "stationId" TEXT,
    "publicLabel" TEXT NOT NULL,
    "publicPosition" TEXT,
    "publicProfileApprovedAt" TIMESTAMP(3),
    "publicProfileApprovedById" TEXT,
    "placement" "FeedbackQrPlacement" NOT NULL,
    "placementKey" TEXT NOT NULL,
    "serviceAreaKey" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isTest" BOOLEAN NOT NULL DEFAULT false,
    "needsReprint" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "rotatedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "lastResolvedAt" TIMESTAMP(3),
    "lastPrintedAt" TIMESTAMP(3),
    "lastPrintedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackQr_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackVisit" (
    "id" TEXT NOT NULL,
    "qrCodeId" TEXT,
    "parentVisitId" TEXT,
    "qrVersionAtOpen" INTEGER,
    "visitKind" "FeedbackVisitKind" NOT NULL,
    "surveyVersion" TEXT NOT NULL,
    "disposition" "FeedbackVisitDisposition" NOT NULL DEFAULT 'OPEN',
    "blockedReason" TEXT,
    "isTestAtOpen" BOOLEAN NOT NULL DEFAULT false,
    "sessionTokenHash" TEXT NOT NULL,
    "networkHashDaily" TEXT,
    "clientHashWeekly" TEXT,
    "resolveNonceHash" TEXT,
    "hashKeyVersion" TEXT,
    "targetType" "FeedbackTargetType" NOT NULL,
    "employeeId" TEXT,
    "stationIdAtOpen" TEXT,
    "stationIdSelected" TEXT,
    "stationContextSource" TEXT NOT NULL,
    "departmentIdAtOpen" TEXT,
    "shiftIdAtOpen" TEXT,
    "deviceClass" TEXT,
    "language" TEXT NOT NULL DEFAULT 'th',
    "variantKey" TEXT,
    "optionOrder" JSONB,
    "targetConfirmation" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "lastStep" TEXT,
    "formExpiresAt" TIMESTAMP(3) NOT NULL,
    "purgeAfter" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackResponse" (
    "id" TEXT NOT NULL,
    "refCode" TEXT NOT NULL,
    "visitId" TEXT,
    "qrCodeId" TEXT,
    "qrVersionAtSubmit" INTEGER,
    "kind" "FeedbackResponseKind" NOT NULL,
    "targetType" "FeedbackTargetType" NOT NULL,
    "employeeId" TEXT,
    "stationId" TEXT,
    "departmentIdAtSubmit" TEXT,
    "shiftIdAtSubmit" TEXT,
    "departmentLabelSnapshot" TEXT,
    "shiftLabelSnapshot" TEXT,
    "stationContextSource" TEXT NOT NULL,
    "employeeLabelSnapshot" TEXT,
    "stationLabelSnapshot" TEXT,
    "surveyVersion" TEXT NOT NULL,
    "privacyNoticeVersion" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'th',
    "serviceAreas" TEXT[],
    "overallRating" INTEGER,
    "reasonKeys" TEXT[],
    "incidentKey" TEXT,
    "dangerStatus" "FeedbackDangerStatus",
    "occurredAt" TIMESTAMP(3),
    "noDetail" BOOLEAN NOT NULL DEFAULT false,
    "comment" TEXT,
    "wantsFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "validity" "FeedbackValidity" NOT NULL DEFAULT 'VALID',
    "abuseScore" INTEGER NOT NULL DEFAULT 0,
    "abuseReasons" TEXT[],
    "idempotencyKeyHash" TEXT NOT NULL,
    "idempotencyPayloadHash" TEXT NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "reportDate" DATE NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFeedbackResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackContact" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "channel" "FeedbackContactChannel" NOT NULL,
    "nameEncrypted" TEXT,
    "valueEncrypted" TEXT NOT NULL,
    "preferredTime" TEXT,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "purgeAfter" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerFeedbackContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackCase" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "stationId" TEXT,
    "severity" "FeedbackCaseSeverity" NOT NULL,
    "category" TEXT NOT NULL,
    "status" "FeedbackCaseStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToId" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolutionNote" TEXT,
    "dismissedReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackAnswer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "surveyVersion" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "state" "FeedbackAnswerState" NOT NULL,
    "numberValue" INTEGER,
    "textValue" TEXT,
    "choiceValues" TEXT[],

    CONSTRAINT "CustomerFeedbackAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackRateBucket" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackRateBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackAlertLog" (
    "id" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "ruleVersion" INTEGER NOT NULL DEFAULT 1,
    "targetType" "FeedbackTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowEnd" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "notifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "details" JSONB,

    CONSTRAINT "CustomerFeedbackAlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackDailyAggregate" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "stationKey" TEXT NOT NULL,
    "targetType" "FeedbackTargetType" NOT NULL,
    "placementKey" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "surveyVersion" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL,
    "openedCount" INTEGER NOT NULL DEFAULT 0,
    "startedCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "targetRejectedCount" INTEGER NOT NULL DEFAULT 0,
    "submittedCount" INTEGER NOT NULL DEFAULT 0,
    "switchedIncidentCount" INTEGER NOT NULL DEFAULT 0,
    "abandonedCount" INTEGER NOT NULL DEFAULT 0,
    "botBlockedCount" INTEGER NOT NULL DEFAULT 0,
    "expiredCount" INTEGER NOT NULL DEFAULT 0,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "suspectedCount" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerFeedbackDailyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackResolveDailyAggregate" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "resolverType" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerFeedbackResolveDailyAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackDailyReasonAggregate" (
    "id" TEXT NOT NULL,
    "reportDate" DATE NOT NULL,
    "stationKey" TEXT NOT NULL,
    "targetType" "FeedbackTargetType" NOT NULL,
    "reasonKey" TEXT NOT NULL,
    "surveyVersion" TEXT NOT NULL,
    "isTest" BOOLEAN NOT NULL,
    "validCount" INTEGER NOT NULL DEFAULT 0,
    "suspectedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerFeedbackDailyReasonAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackReviewSnapshot" (
    "id" TEXT NOT NULL,
    "reviewPeriodId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeLabelSnapshot" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "validCount" INTEGER NOT NULL,
    "ratingAverage" DECIMAL(4,2) NOT NULL,
    "positiveRate" DECIMAL(5,2) NOT NULL,
    "negativeRate" DECIMAL(5,2) NOT NULL,
    "suspectedExcludedCount" INTEGER NOT NULL DEFAULT 0,
    "topReasonKeys" TEXT[],
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,

    CONSTRAINT "CustomerFeedbackReviewSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackReviewRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeLabelSnapshot" TEXT NOT NULL,
    "reviewPeriodId" TEXT,
    "scopeKey" TEXT NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "FeedbackReviewRequestStatus" NOT NULL DEFAULT 'OPEN',
    "reviewedById" TEXT,
    "resolutionNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerFeedbackOperationalMetricBucket" (
    "id" TEXT NOT NULL,
    "minuteStart" TIMESTAMP(3) NOT NULL,
    "metricCode" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "statusClass" INTEGER NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CustomerFeedbackOperationalMetricBucket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackQr_tokenHash_key" ON "CustomerFeedbackQr"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackQr_manualCodeHash_key" ON "CustomerFeedbackQr"("manualCodeHash");

-- CreateIndex
CREATE INDEX "CustomerFeedbackQr_employeeId_idx" ON "CustomerFeedbackQr"("employeeId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackQr_stationId_idx" ON "CustomerFeedbackQr"("stationId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackQr_targetType_isActive_idx" ON "CustomerFeedbackQr"("targetType", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackVisit_parentVisitId_key" ON "CustomerFeedbackVisit"("parentVisitId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackVisit_qrCodeId_idx" ON "CustomerFeedbackVisit"("qrCodeId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackVisit_parentVisitId_idx" ON "CustomerFeedbackVisit"("parentVisitId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackVisit_disposition_idx" ON "CustomerFeedbackVisit"("disposition");

-- CreateIndex
CREATE INDEX "CustomerFeedbackVisit_openedAt_idx" ON "CustomerFeedbackVisit"("openedAt");

-- CreateIndex
CREATE INDEX "CustomerFeedbackVisit_sessionTokenHash_idx" ON "CustomerFeedbackVisit"("sessionTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackResponse_refCode_key" ON "CustomerFeedbackResponse"("refCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackResponse_visitId_key" ON "CustomerFeedbackResponse"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackResponse_idempotencyKeyHash_key" ON "CustomerFeedbackResponse"("idempotencyKeyHash");

-- CreateIndex
CREATE INDEX "CustomerFeedbackResponse_stationId_submittedAt_idx" ON "CustomerFeedbackResponse"("stationId", "submittedAt");

-- CreateIndex
CREATE INDEX "CustomerFeedbackResponse_employeeId_submittedAt_idx" ON "CustomerFeedbackResponse"("employeeId", "submittedAt");

-- CreateIndex
CREATE INDEX "CustomerFeedbackResponse_overallRating_submittedAt_idx" ON "CustomerFeedbackResponse"("overallRating", "submittedAt");

-- CreateIndex
CREATE INDEX "CustomerFeedbackResponse_validity_submittedAt_idx" ON "CustomerFeedbackResponse"("validity", "submittedAt");

-- CreateIndex
CREATE INDEX "CustomerFeedbackResponse_reportDate_validity_idx" ON "CustomerFeedbackResponse"("reportDate", "validity");

-- CreateIndex
CREATE INDEX "CustomerFeedbackResponse_kind_submittedAt_idx" ON "CustomerFeedbackResponse"("kind", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackContact_responseId_key" ON "CustomerFeedbackContact"("responseId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackContact_purgeAfter_idx" ON "CustomerFeedbackContact"("purgeAfter");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackCase_responseId_key" ON "CustomerFeedbackCase"("responseId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackCase_status_severity_idx" ON "CustomerFeedbackCase"("status", "severity");

-- CreateIndex
CREATE INDEX "CustomerFeedbackCase_stationId_idx" ON "CustomerFeedbackCase"("stationId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackCase_assignedToId_idx" ON "CustomerFeedbackCase"("assignedToId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackCase_dueAt_idx" ON "CustomerFeedbackCase"("dueAt");

-- CreateIndex
CREATE INDEX "CustomerFeedbackAnswer_questionKey_idx" ON "CustomerFeedbackAnswer"("questionKey");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackAnswer_responseId_questionKey_key" ON "CustomerFeedbackAnswer"("responseId", "questionKey");

-- CreateIndex
CREATE INDEX "CustomerFeedbackRateBucket_expiresAt_idx" ON "CustomerFeedbackRateBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackRateBucket_action_keyHash_windowStart_key" ON "CustomerFeedbackRateBucket"("action", "keyHash", "windowStart");

-- CreateIndex
CREATE INDEX "CustomerFeedbackAlertLog_targetId_ruleCode_idx" ON "CustomerFeedbackAlertLog"("targetId", "ruleCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackAlertLog_ruleCode_ruleVersion_targetId_wind_key" ON "CustomerFeedbackAlertLog"("ruleCode", "ruleVersion", "targetId", "windowStart");

-- CreateIndex
CREATE INDEX "CustomerFeedbackDailyAggregate_reportDate_idx" ON "CustomerFeedbackDailyAggregate"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackDailyAggregate_reportDate_stationKey_target_key" ON "CustomerFeedbackDailyAggregate"("reportDate", "stationKey", "targetType", "placementKey", "language", "surveyVersion", "isTest");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackResolveDailyAggregate_reportDate_resolverTy_key" ON "CustomerFeedbackResolveDailyAggregate"("reportDate", "resolverType", "result");

-- CreateIndex
CREATE INDEX "CustomerFeedbackDailyReasonAggregate_reportDate_idx" ON "CustomerFeedbackDailyReasonAggregate"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackDailyReasonAggregate_reportDate_stationKey__key" ON "CustomerFeedbackDailyReasonAggregate"("reportDate", "stationKey", "targetType", "reasonKey", "surveyVersion", "isTest");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackReviewSnapshot_reviewPeriodId_employeeId_key" ON "CustomerFeedbackReviewSnapshot"("reviewPeriodId", "employeeId");

-- CreateIndex
CREATE INDEX "CustomerFeedbackReviewRequest_status_idx" ON "CustomerFeedbackReviewRequest"("status");

-- CreateIndex
CREATE INDEX "CustomerFeedbackReviewRequest_employeeId_status_idx" ON "CustomerFeedbackReviewRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX "CustomerFeedbackOperationalMetricBucket_minuteStart_idx" ON "CustomerFeedbackOperationalMetricBucket"("minuteStart");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerFeedbackOperationalMetricBucket_minuteStart_metricC_key" ON "CustomerFeedbackOperationalMetricBucket"("minuteStart", "metricCode", "outcome", "statusClass");

-- CreateIndex
CREATE INDEX "Notification_eventKey_idx" ON "Notification"("eventKey");

-- AddForeignKey
ALTER TABLE "ReviewPeriod" ADD CONSTRAINT "ReviewPeriod_closedById_fkey" FOREIGN KEY ("closedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_publicProfileApprovedById_fkey" FOREIGN KEY ("publicProfileApprovedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_lastPrintedById_fkey" FOREIGN KEY ("lastPrintedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackVisit" ADD CONSTRAINT "CustomerFeedbackVisit_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "CustomerFeedbackQr"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackVisit" ADD CONSTRAINT "CustomerFeedbackVisit_parentVisitId_fkey" FOREIGN KEY ("parentVisitId") REFERENCES "CustomerFeedbackVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "CustomerFeedbackVisit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_qrCodeId_fkey" FOREIGN KEY ("qrCodeId") REFERENCES "CustomerFeedbackQr"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackContact" ADD CONSTRAINT "CustomerFeedbackContact_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "CustomerFeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackCase" ADD CONSTRAINT "CustomerFeedbackCase_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "CustomerFeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackCase" ADD CONSTRAINT "CustomerFeedbackCase_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackAnswer" ADD CONSTRAINT "CustomerFeedbackAnswer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "CustomerFeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackReviewSnapshot" ADD CONSTRAINT "CustomerFeedbackReviewSnapshot_reviewPeriodId_fkey" FOREIGN KEY ("reviewPeriodId") REFERENCES "ReviewPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackReviewSnapshot" ADD CONSTRAINT "CustomerFeedbackReviewSnapshot_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackReviewSnapshot" ADD CONSTRAINT "CustomerFeedbackReviewSnapshot_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackReviewRequest" ADD CONSTRAINT "CustomerFeedbackReviewRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerFeedbackReviewRequest" ADD CONSTRAINT "CustomerFeedbackReviewRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ============================================================
-- Customer feedback: check constraints และ partial unique indexes
-- เขียนเพิ่มเองเพราะ Prisma ยังไม่รองรับ (idempotent ไม่ได้ —
-- migration รันครั้งเดียว)
-- ============================================================

-- Visit: signed token hash unique
CREATE UNIQUE INDEX "CustomerFeedbackVisit_sessionTokenHash_key" ON "CustomerFeedbackVisit"("sessionTokenHash");

-- QR: EMPLOYEE ต้องมี employeeId อย่างเดียว, STATION มี stationId อย่างเดียว
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_target_check" CHECK (
  ("targetType" = 'EMPLOYEE' AND "employeeId" IS NOT NULL AND "stationId" IS NULL)
  OR ("targetType" = 'STATION' AND "stationId" IS NOT NULL AND "employeeId" IS NULL)
);

-- EMPLOYEE QR ที่ active ต้องมี public profile ครบ
ALTER TABLE "CustomerFeedbackQr" ADD CONSTRAINT "CustomerFeedbackQr_public_profile_check" CHECK (
  "targetType" <> 'EMPLOYEE' OR "isActive" = false
  OR ("publicLabel" IS NOT NULL AND "publicPosition" IS NOT NULL AND "publicProfileApprovedAt" IS NOT NULL)
);

-- พนักงานหนึ่งคนมี EMPLOYEE QR ที่ active ได้หนึ่งรหัส (ไม่พึ่ง isPrimary)
CREATE UNIQUE INDEX "CustomerFeedbackQr_active_employee_unique"
  ON "CustomerFeedbackQr"("employeeId")
  WHERE "targetType" = 'EMPLOYEE' AND "isActive" = true;

-- สถานีหนึ่งแห่งมี primary STATION QR ที่ active ได้หนึ่งรหัส
CREATE UNIQUE INDEX "CustomerFeedbackQr_active_primary_station_unique"
  ON "CustomerFeedbackQr"("stationId")
  WHERE "targetType" = 'STATION' AND "isPrimary" = true AND "isActive" = true;

-- QR จุดย่อย active หนึ่งรหัสต่อ station+placement+placementKey
CREATE UNIQUE INDEX "CustomerFeedbackQr_active_placement_unique"
  ON "CustomerFeedbackQr"("stationId", "placement", "placementKey")
  WHERE "targetType" = 'STATION' AND "isActive" = true;

-- Visit: STANDARD ต้องมี QR และ target ที่ชัดเจน, INCIDENT อาจไม่มี
ALTER TABLE "CustomerFeedbackVisit" ADD CONSTRAINT "CustomerFeedbackVisit_kind_check" CHECK (
  ("visitKind" = 'STANDARD' AND "qrCodeId" IS NOT NULL AND "targetType" IN ('EMPLOYEE', 'STATION'))
  OR ("visitKind" = 'INCIDENT')
);

-- Response: STANDARD ต้องมี stationId+overallRating+QR, INCIDENT ต้องมี incidentKey+dangerStatus
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_standard_check" CHECK (
  "kind" <> 'STANDARD' OR (
    "stationId" IS NOT NULL AND "overallRating" IS NOT NULL
    AND "qrCodeId" IS NOT NULL AND "targetType" IN ('EMPLOYEE', 'STATION')
  )
);
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_incident_check" CHECK (
  "kind" <> 'INCIDENT' OR (
    "incidentKey" IS NOT NULL AND "dangerStatus" IS NOT NULL AND "occurredAt" IS NOT NULL
    AND "overallRating" IS NULL
  )
);

-- INCIDENT ที่เริ่มก่อน resolve ใช้ UNKNOWN และไม่มี QR
ALTER TABLE "CustomerFeedbackResponse" ADD CONSTRAINT "CustomerFeedbackResponse_unknown_check" CHECK (
  "targetType" <> 'UNKNOWN' OR ("kind" = 'INCIDENT' AND "qrCodeId" IS NULL)
);

-- Notification: กันส่งซ้ำต่อ event เดียวกัน (เฉพาะแถวที่ eventKey ไม่ null)
CREATE UNIQUE INDEX "Notification_eventKey_unique"
  ON "Notification"("userId", "type", "eventKey")
  WHERE "eventKey" IS NOT NULL;

-- ReviewRequest: พนักงานหนึ่งคนมีคำขอ OPEN/IN_REVIEW ได้หนึ่งรายการต่อ scopeKey
CREATE UNIQUE INDEX "CustomerFeedbackReviewRequest_open_unique"
  ON "CustomerFeedbackReviewRequest"("employeeId", "scopeKey")
  WHERE "employeeId" IS NOT NULL AND "status" IN ('OPEN', 'IN_REVIEW');

-- Answer.state ต้องสอดคล้องค่าที่เก็บ
ALTER TABLE "CustomerFeedbackAnswer" ADD CONSTRAINT "CustomerFeedbackAnswer_state_check" CHECK (
  ("state" = 'ANSWERED' AND ("numberValue" IS NOT NULL OR "textValue" IS NOT NULL OR array_length("choiceValues", 1) IS NOT NULL))
  OR ("state" IN ('SKIPPED', 'NOT_SHOWN'))
);
