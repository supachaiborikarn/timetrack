-- CreateEnum
CREATE TYPE "CompetitionPeriodType" AS ENUM ('WEEKLY_STATION', 'MONTHLY_STATION', 'MONTHLY_GRAND');

-- CreateEnum
CREATE TYPE "CompetitionPeriodStatus" AS ENUM ('OPEN', 'PENDING_REVIEW', 'FINALIZED');

-- CreateEnum
CREATE TYPE "CompetitionFairPlayStatus" AS ENUM ('CLEAR', 'REVIEW', 'APPROVED', 'DISQUALIFIED', 'INELIGIBLE');

-- CreateEnum
CREATE TYPE "CompetitionAwardType" AS ENUM ('WEEKLY_CHAMPION', 'MONTHLY_STATION_CHAMPION', 'GRAND_CHAMPION');

-- CreateEnum
CREATE TYPE "CompetitionAwardStatus" AS ENUM ('AVAILABLE', 'SELECTED', 'FULFILLED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CompetitionPeriod" (
    "id" TEXT NOT NULL,
    "type" "CompetitionPeriodType" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "stationId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "CompetitionPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "finalizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionStanding" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeLabelSnapshot" TEXT NOT NULL,
    "totalScore" DECIMAL(6,2) NOT NULL,
    "workPoints" DECIMAL(6,2) NOT NULL,
    "customerPoints" DECIMAL(6,2) NOT NULL,
    "missionPoints" DECIMAL(6,2) NOT NULL,
    "eligibleCustomerCount" INTEGER NOT NULL DEFAULT 0,
    "excludedRepeatCustomerCount" INTEGER NOT NULL DEFAULT 0,
    "suspiciousCustomerCount" INTEGER NOT NULL DEFAULT 0,
    "requiredDays" INTEGER NOT NULL DEFAULT 0,
    "missionCompletedDays" INTEGER NOT NULL DEFAULT 0,
    "isEligible" BOOLEAN NOT NULL DEFAULT true,
    "fairPlayStatus" "CompetitionFairPlayStatus" NOT NULL DEFAULT 'CLEAR',
    "fairPlayReasons" TEXT[],
    "finalRank" INTEGER,
    "championshipPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionStanding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionAward" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT,
    "awardType" "CompetitionAwardType" NOT NULL,
    "title" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 1,
    "rewardCode" TEXT,
    "rewardLabel" TEXT,
    "rewardValueBaht" INTEGER,
    "status" "CompetitionAwardStatus" NOT NULL DEFAULT 'AVAILABLE',
    "selectedAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompetitionAward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompetitionPeriod_type_periodKey_idx" ON "CompetitionPeriod"("type", "periodKey");

-- CreateIndex
CREATE INDEX "CompetitionPeriod_stationId_startDate_idx" ON "CompetitionPeriod"("stationId", "startDate");

-- CreateIndex
CREATE INDEX "CompetitionPeriod_status_idx" ON "CompetitionPeriod"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionPeriod_type_periodKey_stationId_key" ON "CompetitionPeriod"("type", "periodKey", "stationId");

-- PostgreSQL composite UNIQUE allows multiple NULL stationIds; keep one global period per type/key.
CREATE UNIQUE INDEX "CompetitionPeriod_global_period_key" ON "CompetitionPeriod"("type", "periodKey") WHERE "stationId" IS NULL;

-- CreateIndex
CREATE INDEX "CompetitionStanding_userId_createdAt_idx" ON "CompetitionStanding"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CompetitionStanding_periodId_finalRank_idx" ON "CompetitionStanding"("periodId", "finalRank");

-- CreateIndex
CREATE INDEX "CompetitionStanding_fairPlayStatus_idx" ON "CompetitionStanding"("fairPlayStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionStanding_periodId_userId_key" ON "CompetitionStanding"("periodId", "userId");

-- CreateIndex
CREATE INDEX "CompetitionAward_userId_status_idx" ON "CompetitionAward"("userId", "status");

-- CreateIndex
CREATE INDEX "CompetitionAward_stationId_createdAt_idx" ON "CompetitionAward"("stationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionAward_periodId_userId_awardType_key" ON "CompetitionAward"("periodId", "userId", "awardType");

-- AddForeignKey
ALTER TABLE "CompetitionPeriod" ADD CONSTRAINT "CompetitionPeriod_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionStanding" ADD CONSTRAINT "CompetitionStanding_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CompetitionPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionStanding" ADD CONSTRAINT "CompetitionStanding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAward" ADD CONSTRAINT "CompetitionAward_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CompetitionPeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAward" ADD CONSTRAINT "CompetitionAward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionAward" ADD CONSTRAINT "CompetitionAward_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
