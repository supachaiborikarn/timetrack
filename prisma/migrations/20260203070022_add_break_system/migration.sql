-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "breakDurationMin" INTEGER,
ADD COLUMN     "breakEndTime" TIMESTAMP(3),
ADD COLUMN     "breakPenaltyAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "breakStartTime" TIMESTAMP(3);
