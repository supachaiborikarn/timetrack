-- AlterEnum
ALTER TYPE "AssetKind" ADD VALUE 'KEBDAO_CARD';

-- AlterTable
ALTER TABLE "StoredAsset" ADD COLUMN     "kebdaoRegistrationId" TEXT;

-- CreateTable
CREATE TABLE "KebdaoOutlet" (
    "stationId" TEXT NOT NULL,
    "outletCode" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KebdaoOutlet_pkey" PRIMARY KEY ("stationId")
);

-- CreateTable
CREATE TABLE "KebdaoRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "outletCode" TEXT NOT NULL,
    "csrId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pendingUserId" TEXT,
    "pendingCsrId" TEXT,
    "activeUserId" TEXT,
    "reason" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KebdaoRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KebdaoCodeOwner" (
    "csrId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KebdaoCodeOwner_pkey" PRIMARY KEY ("csrId")
);

-- CreateIndex
CREATE UNIQUE INDEX "KebdaoOutlet_outletCode_key" ON "KebdaoOutlet"("outletCode");

-- CreateIndex
CREATE UNIQUE INDEX "KebdaoRegistration_pendingUserId_key" ON "KebdaoRegistration"("pendingUserId");

-- CreateIndex
CREATE UNIQUE INDEX "KebdaoRegistration_pendingCsrId_key" ON "KebdaoRegistration"("pendingCsrId");

-- CreateIndex
CREATE UNIQUE INDEX "KebdaoRegistration_activeUserId_key" ON "KebdaoRegistration"("activeUserId");

-- CreateIndex
CREATE INDEX "KebdaoRegistration_stationId_status_idx" ON "KebdaoRegistration"("stationId", "status");

-- CreateIndex
CREATE INDEX "KebdaoRegistration_userId_createdAt_idx" ON "KebdaoRegistration"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "KebdaoRegistration_csrId_status_idx" ON "KebdaoRegistration"("csrId", "status");

-- AddForeignKey
ALTER TABLE "StoredAsset" ADD CONSTRAINT "StoredAsset_kebdaoRegistrationId_fkey" FOREIGN KEY ("kebdaoRegistrationId") REFERENCES "KebdaoRegistration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KebdaoOutlet" ADD CONSTRAINT "KebdaoOutlet_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KebdaoRegistration" ADD CONSTRAINT "KebdaoRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KebdaoRegistration" ADD CONSTRAINT "KebdaoRegistration_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KebdaoRegistration" ADD CONSTRAINT "KebdaoRegistration_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KebdaoCodeOwner" ADD CONSTRAINT "KebdaoCodeOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
