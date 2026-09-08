-- Persist the weekly cross-station support bonus on finalized League standings.
ALTER TABLE "CompetitionStanding"
    ADD COLUMN IF NOT EXISTS "supportPoints" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "supportDays" INTEGER NOT NULL DEFAULT 0;
