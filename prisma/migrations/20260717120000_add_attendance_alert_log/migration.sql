CREATE TABLE "AttendanceAlertLog" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "stationId" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "discordMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceAlertLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AttendanceAlertLog_date_stationId_shiftId_reportType_key"
ON "AttendanceAlertLog"("date", "stationId", "shiftId", "reportType");

CREATE INDEX "AttendanceAlertLog_date_status_idx"
ON "AttendanceAlertLog"("date", "status");
