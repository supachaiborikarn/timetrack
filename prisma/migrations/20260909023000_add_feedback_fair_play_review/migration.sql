-- Fair Play review queue for customer feedback.
-- REVIEW is evidence awaiting a human decision and does not itself change scoring.
-- CONFIRMED rows cause the linked response to be moderated to HIDDEN by the API.
CREATE TABLE "CustomerFeedbackFairPlayReview" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeLabelSnapshot" TEXT,
    "stationId" TEXT,
    "source" TEXT NOT NULL,
    "reasonCode" TEXT NOT NULL,
    "reasonNote" VARCHAR(2000),
    "signals" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'REVIEW',
    "dedupeKey" TEXT,
    "reportedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerFeedbackFairPlayReview_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomerFeedbackFairPlayReview_responseId_fkey"
        FOREIGN KEY ("responseId") REFERENCES "CustomerFeedbackResponse"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CustomerFeedbackFairPlayReview_status_check"
        CHECK ("status" IN ('REVIEW', 'CONFIRMED', 'DISMISSED')),
    CONSTRAINT "CustomerFeedbackFairPlayReview_source_check"
        CHECK ("source" IN ('MANUAL', 'AUTO')),
    CONSTRAINT "CustomerFeedbackFairPlayReview_reason_check"
        CHECK ("reasonCode" IN ('EMPLOYEE_ANSWERED_FOR_CUSTOMER', 'EMPLOYEE_HANDLED_PHONE', 'SUSPICIOUS_PATTERN', 'OTHER'))
);

CREATE UNIQUE INDEX "CustomerFeedbackFairPlayReview_dedupeKey_key"
    ON "CustomerFeedbackFairPlayReview"("dedupeKey");
CREATE INDEX "CustomerFeedbackFairPlayReview_status_createdAt_idx"
    ON "CustomerFeedbackFairPlayReview"("status", "createdAt");
CREATE INDEX "CustomerFeedbackFairPlayReview_employeeId_status_createdAt_idx"
    ON "CustomerFeedbackFairPlayReview"("employeeId", "status", "createdAt");
CREATE INDEX "CustomerFeedbackFairPlayReview_responseId_status_idx"
    ON "CustomerFeedbackFairPlayReview"("responseId", "status");
-- Only one active/adjudicated Fair Play case may exist per feedback response.
-- DISMISSED releases the response so new evidence can be reported later.
CREATE UNIQUE INDEX "CustomerFeedbackFairPlayReview_active_response_unique"
    ON "CustomerFeedbackFairPlayReview"("responseId")
    WHERE "status" IN ('REVIEW', 'CONFIRMED');
CREATE INDEX "CustomerFeedbackFairPlayReview_stationId_status_idx"
    ON "CustomerFeedbackFairPlayReview"("stationId", "status");
