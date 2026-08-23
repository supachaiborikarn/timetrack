import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";
import {
    COMMENT_NULL_AFTER_MONTHS,
    RESPONSE_RETENTION_MONTHS,
    REVIEW_REQUEST_RETENTION_MONTHS,
} from "@/lib/customer-feedback/retention";

/**
 * Cron maintenance ของระบบเสียงลูกค้า (ราว 01:15 Asia/Bangkok)
 *
 * 1. upsert daily aggregate + resolve/reason aggregate (idempotent, reconcile ก่อนลบ)
 * 2. เปลี่ยน Visit ที่พ้น formExpiresAt เป็น ABANDONED/EXPIRED
 * 3. ลบ Visit ที่พ้น retention หลัง aggregate
 * 4. ลบ Contact ที่พ้น purgeAfter
 * 5. ลบ rate bucket ที่หมดอายุ
 * 7. ล้างข้อความอิสระที่พ้น 12 เดือน (เก็บคะแนน/สาเหตุไว้ทำสถิติ)
 * 8. ลบ Response ที่พ้น 24 เดือน (Answer/Contact/Case cascade ตามไป) — ข้ามเคสที่ยังไม่ปิด
 * 9. ลบคำขอทบทวนที่ปิดแล้วและพ้น 24 เดือน
 *
 * ตรวจ CRON_SECRET ทุกครั้ง
 */

/** ถอยหลัง n เดือนแบบปฏิทิน (ใช้กับ retention ที่กำหนดเป็นเดือน) */
function monthsBefore(from: Date, months: number): Date {
    const d = new Date(from);
    d.setUTCMonth(d.getUTCMonth() - months);
    return d;
}

function bangkokDateKey(date: Date): Date {
    const str = new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [y, m, d] = str.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

async function aggregateDay(dayStart: Date, dayEnd: Date) {
    const visits = await prisma.customerFeedbackVisit.findMany({
        where: { openedAt: { gte: dayStart, lt: dayEnd } },
        include: {
            responses: { select: { validity: true, overallRating: true, reasonKeys: true, kind: true, surveyVersion: true } },
            qrCode: { select: { stationId: true, employeeId: true, placementKey: true } },
        },
    });

    const rows = new Map<string, {
        reportDate: Date; stationKey: string; targetType: string; placementKey: string; language: string;
        surveyVersion: string; isTest: boolean; opened: number; started: number; confirmed: number; rejected: number;
        submitted: number; switched: number; abandoned: number; blocked: number; expired: number;
        valid: number; suspected: number; ratingSum: number; ratingCount: number;
    }>();
    const reasonRows = new Map<string, { reportDate: Date; stationKey: string; targetType: string; reasonKey: string; surveyVersion: string; isTest: boolean; valid: number; suspected: number }>();

    for (const v of visits) {
        const eff =
            v.disposition !== "OPEN"
                ? v.disposition
                : v.formExpiresAt.getTime() < Date.now()
                    ? (v.startedAt ? "ABANDONED" : "EXPIRED")
                    : "OPEN";
        const key = [bangkokDateKey(v.openedAt).toISOString(), v.stationIdAtOpen ?? v.qrCode?.stationId ?? "NO_QR", v.targetType, v.qrCode?.placementKey ?? "NO_QR", v.language, v.surveyVersion, v.isTestAtOpen].join("|");
        const row =
            rows.get(key) ??
            {
                reportDate: bangkokDateKey(v.openedAt),
                stationKey: v.stationIdAtOpen ?? v.qrCode?.stationId ?? "NO_QR",
                targetType: v.targetType,
                placementKey: v.qrCode?.placementKey ?? "NO_QR",
                language: v.language,
                surveyVersion: v.surveyVersion,
                isTest: v.isTestAtOpen,
                opened: 0, started: 0, confirmed: 0, rejected: 0, submitted: 0, switched: 0, abandoned: 0, blocked: 0, expired: 0,
                valid: 0, suspected: 0, ratingSum: 0, ratingCount: 0,
            };
        row.opened++;
        if (v.startedAt) row.started++;
        if (v.targetConfirmation === "YES") row.confirmed++;
        if (eff === "TARGET_REJECTED") row.rejected++;
        if (eff === "SUBMITTED") row.submitted++;
        if (eff === "SWITCHED_TO_INCIDENT") row.switched++;
        if (eff === "ABANDONED") row.abandoned++;
        if (eff === "BOT_BLOCKED") row.blocked++;
        if (eff === "EXPIRED") row.expired++;
        for (const r of v.responses) {
            if (r.kind !== "STANDARD") continue;
            if (r.validity === "VALID") {
                row.valid++;
                if (r.overallRating !== null) {
                    row.ratingSum += r.overallRating;
                    row.ratingCount++;
                }
            } else if (r.validity === "SUSPECTED") {
                row.suspected++;
            }
            for (const rk of r.reasonKeys) {
                const rkey = [row.reportDate.toISOString(), row.stationKey, row.targetType, rk, row.surveyVersion, row.isTest].join("|");
                const rr = reasonRows.get(rkey) ?? { reportDate: row.reportDate, stationKey: row.stationKey, targetType: row.targetType, reasonKey: rk, surveyVersion: row.surveyVersion, isTest: row.isTest, valid: 0, suspected: 0 };
                if (r.validity === "VALID") rr.valid++;
                if (r.validity === "SUSPECTED") rr.suspected++;
                reasonRows.set(rkey, rr);
            }
        }
        rows.set(key, row);
    }

    for (const row of rows.values()) {
        await prisma.customerFeedbackDailyAggregate.upsert({
            where: {
                reportDate_stationKey_targetType_placementKey_language_surveyVersion_isTest: {
                    reportDate: row.reportDate,
                    stationKey: row.stationKey,
                    targetType: row.targetType as never,
                    placementKey: row.placementKey,
                    language: row.language,
                    surveyVersion: row.surveyVersion,
                    isTest: row.isTest,
                },
            },
            update: {
                openedCount: row.opened, startedCount: row.started, confirmedCount: row.confirmed,
                targetRejectedCount: row.rejected, submittedCount: row.submitted, switchedIncidentCount: row.switched,
                abandonedCount: row.abandoned, botBlockedCount: row.blocked, expiredCount: row.expired,
                validCount: row.valid, suspectedCount: row.suspected, ratingSum: row.ratingSum, ratingCount: row.ratingCount,
            },
            create: {
                reportDate: row.reportDate, stationKey: row.stationKey, targetType: row.targetType as never,
                placementKey: row.placementKey, language: row.language, surveyVersion: row.surveyVersion, isTest: row.isTest,
                openedCount: row.opened, startedCount: row.started, confirmedCount: row.confirmed,
                targetRejectedCount: row.rejected, submittedCount: row.submitted, switchedIncidentCount: row.switched,
                abandonedCount: row.abandoned, botBlockedCount: row.blocked, expiredCount: row.expired,
                validCount: row.valid, suspectedCount: row.suspected, ratingSum: row.ratingSum, ratingCount: row.ratingCount,
            },
        });
    }
    for (const rr of reasonRows.values()) {
        await prisma.customerFeedbackDailyReasonAggregate.upsert({
            where: {
                reportDate_stationKey_targetType_reasonKey_surveyVersion_isTest: {
                    reportDate: rr.reportDate, stationKey: rr.stationKey, targetType: rr.targetType as never,
                    reasonKey: rr.reasonKey, surveyVersion: rr.surveyVersion, isTest: rr.isTest,
                },
            },
            update: { validCount: rr.valid, suspectedCount: rr.suspected },
            create: { ...rr, targetType: rr.targetType as never },
        });
    }
    return rows.size;
}

export async function GET(request: NextRequest) {
    const secret = request.headers.get("authorization");
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || secret !== expected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const report: Record<string, number> = {};

    try {
        // 1. aggregate 7 วันล่าสุดแบบ idempotent (reconcile = ยอดถูกเขียนทับจาก Visit จริง)
        let aggregated = 0;
        for (let i = 1; i <= 7; i++) {
            const dayEnd = new Date(startOfDayBangkok(now).getTime() - (i - 1) * 86400 * 1000);
            const dayStart = new Date(dayEnd.getTime() - 86400 * 1000);
            aggregated += await aggregateDay(dayStart, dayEnd);
        }
        report.aggregatedDays = aggregated;

        // 2. mark expired visits
        const abandoned = await prisma.customerFeedbackVisit.updateMany({
            where: { disposition: "OPEN", formExpiresAt: { lt: now }, startedAt: { not: null } },
            data: { disposition: "ABANDONED" },
        });
        const expired = await prisma.customerFeedbackVisit.updateMany({
            where: { disposition: "OPEN", formExpiresAt: { lt: now }, startedAt: null },
            data: { disposition: "EXPIRED" },
        });
        report.abandonedVisits = abandoned.count;
        report.expiredVisits = expired.count;

        // 3. ลบ Visit ที่พ้น retention 90 วัน (Response ใช้ SetNull)
        const purgedVisits = await prisma.customerFeedbackVisit.deleteMany({
            where: { purgeAfter: { lt: now } },
        });
        report.purgedVisits = purgedVisits.count;

        // 4. ลบข้อมูลติดต่อที่พ้น purgeAfter
        const purgedContacts = await prisma.customerFeedbackContact.deleteMany({
            where: { purgeAfter: { lt: now } },
        });
        report.purgedContacts = purgedContacts.count;

        // 5. ลบ rate bucket ที่หมดอายุ
        const purgedBuckets = await prisma.customerFeedbackRateBucket.deleteMany({
            where: { expiresAt: { lt: now } },
        });
        report.purgedRateBuckets = purgedBuckets.count;

        // 6. ลบ operational metric bucket เก่า 30 วัน
        const purgedMetrics = await prisma.customerFeedbackOperationalMetricBucket.deleteMany({
            where: { minuteStart: { lt: new Date(now.getTime() - 30 * 86400 * 1000) } },
        });
        report.purgedMetricBuckets = purgedMetrics.count;

        // 7. ล้างข้อความอิสระที่พ้นกำหนด — เก็บคะแนนกับสาเหตุไว้ ตัดเฉพาะข้อความที่ระบุตัวตนได้
        const commentCutoff = monthsBefore(now, COMMENT_NULL_AFTER_MONTHS);
        const strippedComments = await prisma.customerFeedbackResponse.updateMany({
            where: { submittedAt: { lt: commentCutoff }, comment: { not: null } },
            data: { comment: null },
        });
        report.strippedComments = strippedComments.count;

        // 8. ลบ Response ที่พ้น retention — Answer/Contact/Case ผูก onDelete: Cascade ไว้แล้ว
        //    ข้ามรายการที่เคสยังไม่ปิด เพื่อไม่ให้เรื่องที่ยังค้างหายไปกลางทาง
        const responseCutoff = monthsBefore(now, RESPONSE_RETENTION_MONTHS);
        const purgedResponses = await prisma.customerFeedbackResponse.deleteMany({
            where: {
                submittedAt: { lt: responseCutoff },
                NOT: { case: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
            },
        });
        report.purgedResponses = purgedResponses.count;

        // 9. ลบคำขอทบทวนที่ปิดแล้วและพ้น retention
        const reviewCutoff = monthsBefore(now, REVIEW_REQUEST_RETENTION_MONTHS);
        const purgedReviewRequests = await prisma.customerFeedbackReviewRequest.deleteMany({
            where: { submittedAt: { lt: reviewCutoff }, status: { not: "OPEN" } },
        });
        report.purgedReviewRequests = purgedReviewRequests.count;

        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("Customer feedback maintenance failed:", error);
        return NextResponse.json({ error: "Maintenance failed" }, { status: 500 });
    }
}
