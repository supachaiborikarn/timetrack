import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";
import {
    buildFeedbackCommentRetentionWhere,
    buildFeedbackResponseRetentionWhere,
    buildFeedbackReviewRequestRetentionWhere,
    visitPurgeCutoff,
} from "@/lib/customer-feedback/retention";
import { reviewPeriodDayBounds } from "@/lib/customer-feedback/access";

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

function bangkokDateKey(date: Date): Date {
    const str = new Date(date.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
    const [y, m, d] = str.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d));
}

const DAY_MS = 24 * 60 * 60 * 1000;
const NETWORK_HASH_RETENTION_MS = 48 * 60 * 60 * 1000;
const CLIENT_HASH_RETENTION_MS = 14 * DAY_MS;

async function serializableWithRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            return await prisma.$transaction(work, {
                isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            });
        } catch (error) {
            const retryable = typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
            if (!retryable || attempt === 3) throw error;
        }
    }
    throw new Error("serializable transaction retry exhausted");
}

type AggregateRow = {
    reportDate: Date; stationKey: string; targetType: string; placementKey: string; language: string;
    surveyVersion: string; isTest: boolean; opened: number; started: number; confirmed: number; rejected: number;
    submitted: number; switched: number; abandoned: number; blocked: number; expired: number;
    valid: number; suspected: number; ratingSum: number; ratingCount: number;
    rating1: number; rating2: number; rating3: number; rating4: number; rating5: number;
    hasVisitSource: boolean;
};

type ReasonAggregateRow = {
    reportDate: Date; stationKey: string; targetType: string; reasonKey: string;
    surveyVersion: string; isTest: boolean; valid: number; suspected: number;
};

type FeedbackAggregationClient = Pick<
    Prisma.TransactionClient,
    | "customerFeedbackVisit"
    | "customerFeedbackResponse"
    | "customerFeedbackDailyAggregate"
    | "customerFeedbackDailyReasonAggregate"
>;

function aggregateKey(row: Pick<AggregateRow, "reportDate" | "stationKey" | "targetType" | "placementKey" | "language" | "surveyVersion" | "isTest">) {
    return [row.reportDate.toISOString(), row.stationKey, row.targetType, row.placementKey, row.language, row.surveyVersion, row.isTest].join("|");
}

function orderedMapValues<T>(map: Map<string, T>): T[] {
    return [...map.entries()]
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([, value]) => value);
}

function emptyAggregateRow(dimensions: Pick<AggregateRow, "reportDate" | "stationKey" | "targetType" | "placementKey" | "language" | "surveyVersion" | "isTest">): AggregateRow {
    return {
        ...dimensions,
        opened: 0, started: 0, confirmed: 0, rejected: 0, submitted: 0, switched: 0,
        abandoned: 0, blocked: 0, expired: 0, valid: 0, suspected: 0, ratingSum: 0, ratingCount: 0,
        rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0,
        hasVisitSource: false,
    };
}

/** สร้าง aggregate ใหม่จาก Visit และ Response แยกกัน เพื่อ reconcile หลัง Visit ถูกลบได้ */
async function aggregateFeedbackDay(
    dayStart: Date,
    dayEnd: Date,
    db: FeedbackAggregationClient = prisma
) {
    const [visits, responses] = await Promise.all([
        db.customerFeedbackVisit.findMany({
            where: { openedAt: { gte: dayStart, lt: dayEnd } },
            select: {
                openedAt: true, stationIdSelected: true, stationIdAtOpen: true, targetType: true, language: true,
                surveyVersion: true, isTestAtOpen: true, disposition: true, formExpiresAt: true, startedAt: true,
                targetConfirmation: true, qrCode: { select: { stationId: true, placementKey: true } },
            },
        }),
        db.customerFeedbackResponse.findMany({
            where: { submittedAt: { gte: dayStart, lt: dayEnd }, kind: "STANDARD" },
            select: {
                reportDate: true, stationId: true, targetType: true, language: true, surveyVersion: true,
                validity: true, overallRating: true, reasonKeys: true,
                qrCode: { select: { placementKey: true } },
                visit: { select: { isTestAtOpen: true } },
            },
        }),
    ]);

    const rows = new Map<string, AggregateRow>();
    const reasonRows = new Map<string, ReasonAggregateRow>();

    for (const visit of visits) {
        const dimensions = {
            reportDate: bangkokDateKey(visit.openedAt),
            stationKey: visit.stationIdSelected ?? visit.stationIdAtOpen ?? visit.qrCode?.stationId ?? "NO_QR",
            targetType: visit.targetType,
            placementKey: visit.qrCode?.placementKey ?? "NO_QR",
            language: visit.language,
            surveyVersion: visit.surveyVersion,
            isTest: visit.isTestAtOpen,
        };
        const key = aggregateKey(dimensions);
        const row = rows.get(key) ?? emptyAggregateRow(dimensions);
        row.hasVisitSource = true;
        const effectiveDisposition = visit.disposition !== "OPEN"
            ? visit.disposition
            : visit.formExpiresAt.getTime() < Date.now()
                ? (visit.startedAt ? "ABANDONED" : "EXPIRED")
                : "OPEN";
        row.opened++;
        if (visit.startedAt) row.started++;
        if (visit.targetConfirmation === "YES") row.confirmed++;
        if (effectiveDisposition === "TARGET_REJECTED") row.rejected++;
        if (effectiveDisposition === "SUBMITTED") row.submitted++;
        if (effectiveDisposition === "SWITCHED_TO_INCIDENT") row.switched++;
        if (effectiveDisposition === "ABANDONED") row.abandoned++;
        if (effectiveDisposition === "BOT_BLOCKED") row.blocked++;
        if (effectiveDisposition === "EXPIRED") row.expired++;
        rows.set(key, row);
    }

    for (const response of responses) {
        const dimensions = {
            reportDate: response.reportDate,
            stationKey: response.stationId ?? "NO_QR",
            targetType: response.targetType,
            placementKey: response.qrCode?.placementKey ?? "NO_QR",
            language: response.language,
            surveyVersion: response.surveyVersion,
            isTest: response.visit?.isTestAtOpen ?? response.validity === "TEST",
        };
        const key = aggregateKey(dimensions);
        const row = rows.get(key) ?? emptyAggregateRow(dimensions);
        if (response.validity === "VALID") {
            row.valid++;
            if (response.overallRating !== null) {
                row.ratingSum += response.overallRating;
                row.ratingCount++;
                if (response.overallRating === 1) row.rating1++;
                if (response.overallRating === 2) row.rating2++;
                if (response.overallRating === 3) row.rating3++;
                if (response.overallRating === 4) row.rating4++;
                if (response.overallRating === 5) row.rating5++;
            }
        } else if (response.validity === "SUSPECTED") {
            row.suspected++;
        }
        rows.set(key, row);

        for (const reasonKey of response.reasonKeys) {
            const reasonRowKey = [dimensions.reportDate.toISOString(), dimensions.stationKey, dimensions.targetType, reasonKey, dimensions.surveyVersion, dimensions.isTest].join("|");
            const reasonRow = reasonRows.get(reasonRowKey) ?? {
                reportDate: dimensions.reportDate,
                stationKey: dimensions.stationKey,
                targetType: dimensions.targetType,
                reasonKey,
                surveyVersion: dimensions.surveyVersion,
                isTest: dimensions.isTest,
                valid: 0,
                suspected: 0,
            };
            if (response.validity === "VALID") reasonRow.valid++;
            if (response.validity === "SUSPECTED") reasonRow.suspected++;
            reasonRows.set(reasonRowKey, reasonRow);
        }
    }

    for (const row of orderedMapValues(rows)) {
        await db.customerFeedbackDailyAggregate.upsert({
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
                ...(row.hasVisitSource ? {
                    openedCount: row.opened, startedCount: row.started, confirmedCount: row.confirmed,
                    targetRejectedCount: row.rejected, submittedCount: row.submitted, switchedIncidentCount: row.switched,
                    abandonedCount: row.abandoned, botBlockedCount: row.blocked, expiredCount: row.expired,
                } : {}),
                validCount: row.valid, suspectedCount: row.suspected, ratingSum: row.ratingSum, ratingCount: row.ratingCount,
                rating1Count: row.rating1, rating2Count: row.rating2, rating3Count: row.rating3,
                rating4Count: row.rating4, rating5Count: row.rating5,
            },
            create: {
                reportDate: row.reportDate, stationKey: row.stationKey, targetType: row.targetType as never,
                placementKey: row.placementKey, language: row.language, surveyVersion: row.surveyVersion, isTest: row.isTest,
                openedCount: row.opened, startedCount: row.started, confirmedCount: row.confirmed,
                targetRejectedCount: row.rejected, submittedCount: row.submitted, switchedIncidentCount: row.switched,
                abandonedCount: row.abandoned, botBlockedCount: row.blocked, expiredCount: row.expired,
                validCount: row.valid, suspectedCount: row.suspected, ratingSum: row.ratingSum, ratingCount: row.ratingCount,
                rating1Count: row.rating1, rating2Count: row.rating2, rating3Count: row.rating3,
                rating4Count: row.rating4, rating5Count: row.rating5,
            },
        });
    }
    for (const rr of orderedMapValues(reasonRows)) {
        await db.customerFeedbackDailyReasonAggregate.upsert({
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

function reportDateBounds(reportDate: Date) {
    const [year, month, day] = reportDate.toISOString().slice(0, 10).split("-").map(Number);
    const dayStart = new Date(Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000);
    return { dayStart, dayEnd: new Date(dayStart.getTime() + DAY_MS) };
}

async function reconcileFeedbackReportDate(
    reportDate: Date,
    db: FeedbackAggregationClient = prisma
) {
    const { dayStart, dayEnd } = reportDateBounds(reportDate);
    return aggregateFeedbackDay(dayStart, dayEnd, db);
}

async function reconcileReportDates(
    reportDates: Date[],
    db: FeedbackAggregationClient = prisma
) {
    const unique = new Map(reportDates.map((date) => [date.toISOString().slice(0, 10), date]));
    let reconciled = 0;
    for (const reportDate of orderedMapValues(unique)) {
        await reconcileFeedbackReportDate(reportDate, db);
        reconciled++;
    }
    return reconciled;
}

export async function purgeRetainedFeedbackResponses(now: Date) {
    return serializableWithRetry(async (tx) => {
        const unclosedReviewPeriods = await tx.reviewPeriod.findMany({
            where: { closedAt: null },
            select: { startDate: true, endDate: true },
        });
        const protectedReviewPeriods = unclosedReviewPeriods.map((period) => ({
            gte: reviewPeriodDayBounds(period.startDate).dayStart,
            lt: reviewPeriodDayBounds(period.endDate).nextDayStart,
        }));
        const responseRetentionWhere = buildFeedbackResponseRetentionWhere(now, protectedReviewPeriods);
        const responsesToPurge = await tx.customerFeedbackResponse.findMany({
            where: responseRetentionWhere,
            select: { id: true, reportDate: true },
        });
        if (responsesToPurge.length === 0) return { reconciledDays: 0, purgedResponses: 0 };

        const reconciledDays = await reconcileReportDates(
            responsesToPurge.map((response) => response.reportDate),
            tx
        );
        const purgedResponses = await tx.customerFeedbackResponse.deleteMany({
            where: { id: { in: responsesToPurge.map((response) => response.id) } },
        });
        return { reconciledDays, purgedResponses: purgedResponses.count };
    });
}

export async function purgeRetainedFeedbackVisits(now: Date) {
    const visitCutoff = visitPurgeCutoff(now);
    return serializableWithRetry(async (tx) => {
        const visitsToPurge = await tx.customerFeedbackVisit.findMany({
            where: { purgeAfter: { lt: visitCutoff } },
            select: { id: true, openedAt: true },
        });
        if (visitsToPurge.length === 0) return { reconciledDays: 0, purgedVisits: 0 };

        const reconciledDays = await reconcileReportDates(
            visitsToPurge.map((visit) => bangkokDateKey(visit.openedAt)),
            tx
        );
        const purgedVisits = await tx.customerFeedbackVisit.deleteMany({
            where: { id: { in: visitsToPurge.map((visit) => visit.id) } },
        });
        return { reconciledDays, purgedVisits: purgedVisits.count };
    });
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
        // 1. reconcile ช่วงที่ Visit ยังอยู่ทั้งหมด เพื่อรับ moderation ย้อนหลังได้ก่อน purge
        let aggregated = 0;
        for (let i = 1; i <= 90; i++) {
            const dayEnd = new Date(startOfDayBangkok(now).getTime() - (i - 1) * 86400 * 1000);
            const dayStart = new Date(dayEnd.getTime() - 86400 * 1000);
            aggregated += await aggregateFeedbackDay(dayStart, dayEnd);
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

        // 3. ล้าง abuse hash ตามช่วงที่ประกาศ โดยไม่ต้องรอ Visit ครบ 90 วัน
        const clearedNetworkHashes = await prisma.customerFeedbackVisit.updateMany({
            where: {
                openedAt: { lt: new Date(now.getTime() - NETWORK_HASH_RETENTION_MS) },
                networkHashDaily: { not: null },
            },
            data: { networkHashDaily: null },
        });
        const clearedClientHashes = await prisma.customerFeedbackVisit.updateMany({
            where: {
                openedAt: { lt: new Date(now.getTime() - CLIENT_HASH_RETENTION_MS) },
                OR: [{ clientHashWeekly: { not: null } }, { resolveNonceHash: { not: null } }],
            },
            data: { clientHashWeekly: null, resolveNonceHash: null },
        });
        report.clearedNetworkHashes = clearedNetworkHashes.count;
        report.clearedClientHashes = clearedClientHashes.count;

        // 4. reconcile วันของ Visit ที่จะลบ แล้วค่อยลบ (Response ใช้ SetNull)
        const visitPurge = await purgeRetainedFeedbackVisits(now);
        report.reconciledVisitDays = visitPurge.reconciledDays;
        report.purgedVisits = visitPurge.purgedVisits;

        // 5. ลบข้อมูลติดต่อที่พ้น purgeAfter
        const purgedContacts = await prisma.customerFeedbackContact.deleteMany({
            where: { purgeAfter: { lt: now } },
        });
        report.purgedContacts = purgedContacts.count;

        // 6. ลบ rate bucket ที่หมดอายุ
        const purgedBuckets = await prisma.customerFeedbackRateBucket.deleteMany({
            where: { expiresAt: { lt: now } },
        });
        report.purgedRateBuckets = purgedBuckets.count;

        // 7. ลบ operational metric bucket เก่า 30 วัน
        const purgedMetrics = await prisma.customerFeedbackOperationalMetricBucket.deleteMany({
            where: { minuteStart: { lt: new Date(now.getTime() - 30 * 86400 * 1000) } },
        });
        report.purgedMetricBuckets = purgedMetrics.count;

        // 8. ล้างข้อความอิสระทั้ง Response และ Answer เฉพาะรายการที่ไม่มีเคสเปิด
        let strippedComments = 0;
        let strippedAnswerTexts = 0;
        while (true) {
            const batch = await prisma.customerFeedbackResponse.findMany({
                where: buildFeedbackCommentRetentionWhere(now),
                select: { id: true },
                take: 1000,
            });
            if (batch.length === 0) break;
            const ids = batch.map((response) => response.id);
            const result = await serializableWithRetry(async (tx) => {
                // ตรวจเงื่อนไขซ้ำใน transaction เพื่อไม่ล้างข้อความระหว่างที่มีการเปิดเคสใหม่
                const eligible = await tx.customerFeedbackResponse.findMany({
                    where: { id: { in: ids }, ...buildFeedbackCommentRetentionWhere(now) },
                    select: { id: true },
                });
                const eligibleIds = eligible.map((response) => response.id);
                if (eligibleIds.length === 0) return { responses: 0, answers: 0 };
                const answerResult = await tx.customerFeedbackAnswer.updateMany({
                    where: { responseId: { in: eligibleIds }, textValue: { not: null } },
                    data: { textValue: null },
                });
                const responseResult = await tx.customerFeedbackResponse.updateMany({
                    where: {
                        id: { in: eligibleIds },
                        comment: { not: null },
                        NOT: { case: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
                    },
                    data: { comment: null },
                });
                return { responses: responseResult.count, answers: answerResult.count };
            });
            strippedComments += result.responses;
            strippedAnswerTexts += result.answers;
            if (result.responses === 0 && result.answers === 0) break;
        }
        report.strippedComments = strippedComments;
        report.strippedAnswerTexts = strippedAnswerTexts;

        // 9. reconcile วันของ Response ที่จะลบ แล้วค่อยลบตามอายุคำตอบและวันปิดเคส
        const responsePurge = await purgeRetainedFeedbackResponses(now);
        report.reconciledResponseDays = responsePurge.reconciledDays;
        report.purgedResponses = responsePurge.purgedResponses;

        // 10. ลบคำขอทบทวน 24 เดือนหลัง RESOLVED หรือ DISMISSED
        const purgedReviewRequests = await prisma.customerFeedbackReviewRequest.deleteMany({
            where: buildFeedbackReviewRequestRetentionWhere(now),
        });
        report.purgedReviewRequests = purgedReviewRequests.count;

        return NextResponse.json({ ok: true, report });
    } catch (error) {
        console.error("Customer feedback maintenance failed:", error);
        return NextResponse.json({ error: "Maintenance failed" }, { status: 500 });
    }
}
