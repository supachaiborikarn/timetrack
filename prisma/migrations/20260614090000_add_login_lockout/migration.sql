-- Persist login lockout state per account so rate limiting works across app instances.
ALTER TABLE "User" ADD COLUMN "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "failedLoginFirstAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "loginLockedUntil" TIMESTAMP(3);
