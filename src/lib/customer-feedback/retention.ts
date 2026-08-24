import type { Prisma } from "@prisma/client";
import { startOfDayBangkok } from "@/lib/date-utils";

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

export interface FeedbackProtectedDateRange {
    gte: Date;
    lt: Date;
}

export function monthsBefore(from: Date, months: number): Date {
    const date = new Date(from);
    const originalDay = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - months);
    const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
    date.setUTCDate(Math.min(originalDay, lastDay));
    return date;
}

export function visitPurgeCutoff(now: Date): Date {
    return startOfDayBangkok(now);
}

export function buildFeedbackCommentRetentionWhere(now: Date): Prisma.CustomerFeedbackResponseWhereInput {
    return {
        submittedAt: { lt: monthsBefore(now, COMMENT_NULL_AFTER_MONTHS) },
        NOT: { case: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
        OR: [
            { comment: { not: null } },
            { answers: { some: { textValue: { not: null } } } },
        ],
    };
}

export function buildFeedbackResponseRetentionWhere(
    now: Date,
    protectedReviewPeriods: FeedbackProtectedDateRange[] = []
): Prisma.CustomerFeedbackResponseWhereInput {
    return {
        submittedAt: { lt: monthsBefore(now, RESPONSE_RETENTION_MONTHS) },
        ...(protectedReviewPeriods.length > 0
            ? {
                  NOT: protectedReviewPeriods.map((range) => ({
                      submittedAt: { gte: range.gte, lt: range.lt },
                  })),
              }
            : {}),
        OR: [
            { case: { is: null } },
            {
                case: {
                    is: {
                        status: { in: ["RESOLVED", "DISMISSED"] },
                        resolvedAt: { lt: monthsBefore(now, 12) },
                    },
                },
            },
        ],
    };
}

export function buildFeedbackReviewRequestRetentionWhere(now: Date): Prisma.CustomerFeedbackReviewRequestWhereInput {
    return {
        status: { in: ["RESOLVED", "DISMISSED"] },
        resolvedAt: { lt: monthsBefore(now, REVIEW_REQUEST_RETENTION_MONTHS) },
    };
}

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
