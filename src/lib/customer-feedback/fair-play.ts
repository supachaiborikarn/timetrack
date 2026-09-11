import type { BehaviorAnswer } from "./questions";

export const FAIR_PLAY_ROLLING_WINDOW_DAYS = 30;
export const FAIR_PLAY_AUTO_CLUSTER_MIN_PRIOR_RESPONSES = 2;
export const FAIR_PLAY_AUTO_CLUSTER_WINDOW_MINUTES = 15;
export const FAIR_PLAY_AUTO_FAST_PERFECT_SECONDS = 20;

export const FAIR_PLAY_REASON_CODES = [
    "EMPLOYEE_ANSWERED_FOR_CUSTOMER",
    "EMPLOYEE_HANDLED_PHONE",
    "SUSPICIOUS_PATTERN",
    "OTHER",
] as const;

export type FairPlayReasonCode = (typeof FAIR_PLAY_REASON_CODES)[number];
export type FairPlayReviewStatus = "REVIEW" | "CONFIRMED" | "DISMISSED";
export type FairPlayReviewSource = "MANUAL" | "AUTO";

export type FairPlaySignalExplanation = {
    code: string;
    label: string;
    detail: string;
    level: "context" | "warning";
};

export function explainFairPlaySignals(input: {
    signals: readonly string[];
    durationSeconds?: number | null;
}): FairPlaySignalExplanation[] {
    const duration = typeof input.durationSeconds === "number" && Number.isFinite(input.durationSeconds)
        ? Math.max(0, Math.round(input.durationSeconds))
        : null;

    return input.signals.map((signal): FairPlaySignalExplanation => {
        if (signal === "perfect-employee-feedback") {
            return {
                code: signal,
                label: "แบบนี้เป็นคะแนนเต็มทุกส่วน",
                detail: "คะแนนรวม 5/5 และคำถามพฤติกรรมของพนักงานทุกข้อถูกตอบ YES สัญญาณนี้อย่างเดียวไม่ถือว่าผิดปกติ",
                level: "context",
            };
        }
        if (signal === "fast-perfect-feedback") {
            return {
                code: signal,
                label: "ส่งแบบคะแนนเต็มเร็วมาก",
                detail: duration === null
                    ? `ใช้เวลาส่งไม่เกิน ${FAIR_PLAY_AUTO_FAST_PERFECT_SECONDS} วินาที ซึ่งถึงเกณฑ์ที่ระบบให้ตรวจเพิ่มเติม`
                    : `ใช้เวลา ${duration} วินาที จากเกณฑ์ไม่เกิน ${FAIR_PLAY_AUTO_FAST_PERFECT_SECONDS} วินาที`,
                level: "warning",
            };
        }
        if (signal === "clustered-perfect-feedback") {
            return {
                code: signal,
                label: "มีคะแนนเต็มติดกันในช่วงเวลาสั้น",
                detail: `ก่อนแบบนี้ ระบบพบแบบคะแนนเต็มของพนักงานคนเดิมอย่างน้อย ${FAIR_PLAY_AUTO_CLUSTER_MIN_PRIOR_RESPONSES} แบบ ภายใน ${FAIR_PLAY_AUTO_CLUSTER_WINDOW_MINUTES} นาที`,
                level: "warning",
            };
        }
        if (signal === "repeat-client-same-employee") {
            return {
                code: signal,
                label: "พบ fingerprint เดิมส่งให้ QR เดิมซ้ำ",
                detail: "อุปกรณ์/เบราว์เซอร์ลักษณะเดิมเคยส่งแบบให้ QR พนักงานนี้อย่างน้อย 1 ครั้งใน 24 ชั่วโมงก่อนหน้า fingerprint ไม่ใช่การยืนยันตัวบุคคล จึงใช้เป็นเพียงสัญญาณประกอบ",
                level: "warning",
            };
        }
        return {
            code: signal,
            label: "สัญญาณเพิ่มเติมจากระบบ",
            detail: `รหัสสัญญาณ: ${signal}`,
            level: "context",
        };
    });
}

export type FairPlayViolationEvent = {
    occurredAt: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function rollingConfirmedViolationCount(
    events: FairPlayViolationEvent[],
    occurredAt: Date,
    rollingDays = FAIR_PLAY_ROLLING_WINDOW_DAYS
): number {
    const from = occurredAt.getTime() - rollingDays * DAY_MS;
    const to = occurredAt.getTime();
    return events.filter((event) => {
        const time = event.occurredAt.getTime();
        return time >= from && time <= to;
    }).length;
}

export function fairPlayPenaltyLevelForViolation(
    events: FairPlayViolationEvent[],
    occurredAt: Date
): { count30Days: number; level: 1 | 2 | 3; label: string } {
    const count30Days = Math.max(1, rollingConfirmedViolationCount(events, occurredAt));
    if (count30Days >= 3) {
        return {
            count30Days,
            level: 3,
            label: "หมดสิทธิ์รางวัลและ CP ของเดือนที่เกิดเหตุ",
        };
    }
    if (count30Days >= 2) {
        return {
            count30Days,
            level: 2,
            label: "Customer + Mission ของสัปดาห์ที่เกิดเหตุเป็น 0",
        };
    }
    return {
        count30Days,
        level: 1,
        label: "ตัดแบบที่ยืนยันว่าไม่เป็นธรรมและบันทึกคำเตือน",
    };
}

export function hasWeeklyCustomerMissionPenalty(
    events: FairPlayViolationEvent[],
    weekFrom: Date,
    weekToExclusive: Date
): boolean {
    const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    return sorted.some((event) => {
        const time = event.occurredAt.getTime();
        if (time < weekFrom.getTime() || time >= weekToExclusive.getTime()) return false;
        return rollingConfirmedViolationCount(sorted, event.occurredAt) >= 2;
    });
}

export function hasMonthlyRewardBan(
    events: FairPlayViolationEvent[],
    monthFrom: Date,
    monthToExclusive: Date
): boolean {
    const sorted = [...events].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    return sorted.some((event) => {
        const time = event.occurredAt.getTime();
        if (time < monthFrom.getTime() || time >= monthToExclusive.getTime()) return false;
        return rollingConfirmedViolationCount(sorted, event.occurredAt) >= 3;
    });
}

export function isPerfectEmployeeFeedback(input: {
    overallRating: number;
    behaviorAnswers?: Record<string, BehaviorAnswer>;
    behaviorQuestionKeys: readonly string[];
}): boolean {
    if (input.overallRating !== 5 || input.behaviorQuestionKeys.length === 0 || !input.behaviorAnswers) return false;
    return input.behaviorQuestionKeys.every((key) => input.behaviorAnswers?.[key] === "YES");
}

export function detectAutomaticFairPlayReview(input: {
    isPerfectEmployeeFeedback: boolean;
    durationSeconds: number;
    recentPerfectResponseCount: number;
    sameClientSameTargetCount: number;
}): string[] {
    if (!input.isPerfectEmployeeFeedback) return [];

    const signals: string[] = ["perfect-employee-feedback"];
    const fast = input.durationSeconds <= FAIR_PLAY_AUTO_FAST_PERFECT_SECONDS;
    const clustered = input.recentPerfectResponseCount >= FAIR_PLAY_AUTO_CLUSTER_MIN_PRIOR_RESPONSES;
    const repeatedClient = input.sameClientSameTargetCount >= 1;

    if (fast) signals.push("fast-perfect-feedback");
    if (clustered) signals.push("clustered-perfect-feedback");
    if (repeatedClient) signals.push("repeat-client-same-employee");

    // REVIEW ต้องอาศัยอย่างน้อย 2 สัญญาณร่วมกัน: perfect + fast + (cluster/repeat).
    // ค่า IP/device เพียงอย่างเดียวห้ามตัดสินว่าโกง เพราะมือถือไทยอาจแชร์ CGNAT ได้.
    return fast && (clustered || repeatedClient) ? signals : [];
}

export function fairPlayReasonLabel(reasonCode: string): string {
    if (reasonCode === "EMPLOYEE_ANSWERED_FOR_CUSTOMER") return "พนักงานเลือกคำตอบ/กดส่งแทนลูกค้า";
    if (reasonCode === "EMPLOYEE_HANDLED_PHONE") return "พนักงานจับโทรศัพท์ลูกค้าระหว่างประเมิน";
    if (reasonCode === "SUSPICIOUS_PATTERN") return "รูปแบบคำตอบผิดปกติที่ระบบส่งให้ตรวจ";
    return "อื่น ๆ";
}
