/**
 * Retention rules ของระบบเสียงลูกค้า (§17)
 * ค่าเหล่านี้เป็นค่าเริ่มต้นที่เสนอ — ต้องยืนยันกับผู้รับผิดชอบ PDPA ก่อน production
 */

export const VISIT_RETENTION_DAYS = 90;
export const CONTACT_DEFAULT_RETENTION_DAYS = 120;
export const CONTACT_AFTER_CASE_CLOSED_DAYS = 30;
export const COMMENT_NULL_AFTER_MONTHS = 12;
export const RESPONSE_RETENTION_MONTHS = 24;
export const REVIEW_REQUEST_RETENTION_MONTHS = 24;
export const RATE_BUCKET_RETENTION_HOURS = 48;

export function visitPurgeAfter(openedAt: Date = new Date()): Date {
    return new Date(openedAt.getTime() + VISIT_RETENTION_DAYS * 86400 * 1000);
}

export function contactPurgeAfter(createdAt: Date = new Date()): Date {
    return new Date(createdAt.getTime() + CONTACT_DEFAULT_RETENTION_DAYS * 86400 * 1000);
}

/** คำนวณ purgeAfter ใหม่หลังปิดเคส — ห้ามขยายวันเก็บออกไปจากค่าเดิม */
export function shrinkContactPurgeAfter(current: Date, caseClosedAt: Date): Date {
    const candidate = new Date(caseClosedAt.getTime() + CONTACT_AFTER_CASE_CLOSED_DAYS * 86400 * 1000);
    return candidate < current ? candidate : current;
}

export const FORM_EXPIRY_MS = 30 * 60 * 1000;
