-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isSocialSecurityRegistered" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "registeredStationId" TEXT,
ADD COLUMN     "socialSecurityNumber" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_registeredStationId_fkey" FOREIGN KEY ("registeredStationId") REFERENCES "Station"("id") ON DELETE SET NULL ON UPDATE CASCADE;
