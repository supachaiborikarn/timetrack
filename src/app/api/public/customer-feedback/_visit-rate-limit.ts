import { createHash } from "crypto";
import { checkRateLimit } from "@/lib/customer-feedback/anti-abuse";

const VISIT_RATE_LIMIT_WINDOW_MS = 60 * 1000;

const VISIT_RATE_LIMITS = {
    progress: 60,
    submission: 10,
    "incident-submission": 10,
    "incident-start": 20,
} as const;

export type PublicVisitRateAction = keyof typeof VISIT_RATE_LIMITS;

/**
 * จำกัดคำขอที่ผูกกับ visit เดียวกัน โดย hash visit id ก่อนเก็บใน rate bucket
 * เพื่อไม่ให้ bucket เปิดเผย id ที่ใช้เชื่อมไปยังข้อมูลคำตอบได้โดยตรง
 */
export async function checkPublicVisitRateLimit(action: PublicVisitRateAction, visitId: string) {
    const visitKey = createHash("sha256").update(visitId).digest("hex");
    return checkRateLimit(
        `public-feedback-${action}`,
        visitKey,
        VISIT_RATE_LIMITS[action],
        VISIT_RATE_LIMIT_WINDOW_MS
    );
}
