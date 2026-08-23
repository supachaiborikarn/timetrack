import { INCIDENT_TYPES } from "./questions";

/**
 * Case severity และ SLA — pure functions (§8)
 *
 * - คะแนน 1–2 สร้างเคส HIGH
 * - คะแนน 3–5 ที่ขอให้ติดต่อกลับสร้างเคส NORMAL
 * - incident กลุ่มร้ายแรงสร้าง URGENT, privacy/other สร้าง HIGH
 * - dangerStatus YES ยกระดับเป็น URGENT ทุก incident key
 * - คะแนน 3 พร้อมสาเหตุความปลอดภัยสร้าง HIGH
 */

export type CaseSeverity = "NORMAL" | "HIGH" | "URGENT";

export const SEVERITY_SLA_HOURS: Record<CaseSeverity, number> = {
    URGENT: 2,
    HIGH: 24,
    NORMAL: 72,
};

const URGENT_INCIDENT_KEYS = new Set(
    INCIDENT_TYPES.filter((t) => t.severity === "URGENT").map((t) => t.key)
);

const SAFETY_RELATED_REASON_KEYS = new Set(["employee_safety", "station_safety"]);

export interface StandardCaseInput {
    overallRating: number;
    reasonKeys: string[];
    wantsFollowUp: boolean;
}

export function standardCaseSeverity(input: StandardCaseInput): CaseSeverity | null {
    if (input.overallRating <= 2) return "HIGH";
    if (input.overallRating === 3 && input.reasonKeys.some((k) => SAFETY_RELATED_REASON_KEYS.has(k))) {
        return "HIGH";
    }
    if (input.overallRating >= 3 && input.wantsFollowUp) return "NORMAL";
    return null;
}

export function incidentCaseSeverity(incidentKey: string, dangerStatus: "YES" | "NO" | "UNSURE"): CaseSeverity {
    if (dangerStatus === "YES") return "URGENT";
    return URGENT_INCIDENT_KEYS.has(incidentKey) ? "URGENT" : "HIGH";
}

export function caseDueAt(severity: CaseSeverity, from: Date = new Date()): Date {
    return new Date(from.getTime() + SEVERITY_SLA_HOURS[severity] * 3600 * 1000);
}

/** eventKey กัน Notification ซ้ำต่อ case + ผู้รับ + ชนิด event */
export function caseNotificationEventKey(caseId: string, eventType: string): string {
    return `feedback-case:${caseId}:${eventType}`;
}
