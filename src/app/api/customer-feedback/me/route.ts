import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { summarizeRatings, MIN_EMPLOYEE_SAMPLE } from "@/lib/customer-feedback/metrics";
import { reviewPeriodDayBounds } from "@/lib/customer-feedback/access";

/**
 * GET /api/customer-feedback/me — ผลสรุปของพนักงานที่ login
 * บังคับ employeeId จาก session เท่านั้น และใช้ข้อมูลจาก QR พนักงานเท่านั้น
 * ไม่แสดง comment ดิบ
 */

function privateJson(body: unknown, init?: { status?: number }) {
    return NextResponse.json(body, {
        ...init,
        headers: { "Cache-Control": "private, no-store" },
    });
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { role: true, isActive: true },
        });
        if (!user?.isActive) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        const allowed = await hasPermission(user.role, "customer_feedback.self_view");
        if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

        const reviewPeriodId = request.nextUrl.searchParams.get("reviewPeriodId");
        if (reviewPeriodId !== null && (!reviewPeriodId.trim() || reviewPeriodId.length > 100)) {
            return privateJson({ error: "reviewPeriodId ไม่ถูกต้อง" }, { status: 400 });
        }

        const period = reviewPeriodId
            ? await prisma.reviewPeriod.findUnique({
                  where: { id: reviewPeriodId },
                  select: { id: true, title: true, startDate: true, endDate: true, isActive: true, closedAt: true },
              })
            : null;
        if (reviewPeriodId && !period) {
            return privateJson({ error: "ไม่พบรอบประเมิน" }, { status: 404 });
        }

        const periodBounds = period
            ? {
                  from: reviewPeriodDayBounds(period.startDate).dayStart,
                  toExclusive: reviewPeriodDayBounds(period.endDate).nextDayStart,
              }
            : null;

        // หลังปิดรอบให้ใช้หลักฐานที่ตรึงไว้ตอนปิดรอบ เพื่อไม่ให้คะแนนโบนัสเปลี่ยนย้อนหลัง
        if (period?.closedAt) {
            const snapshot = await prisma.customerFeedbackReviewSnapshot.findUnique({
                where: {
                    reviewPeriodId_employeeId: {
                        reviewPeriodId: period.id,
                        employeeId: session.user.id,
                    },
                },
                select: {
                    validCount: true,
                    ratingAverage: true,
                    positiveRate: true,
                    negativeRate: true,
                    suspectedExcludedCount: true,
                    topReasonKeys: true,
                    generatedAt: true,
                },
            });
            const count = snapshot?.validCount ?? 0;
            const meetsMinimum = count >= MIN_EMPLOYEE_SAMPLE;
            return privateJson({
                meetsMinimum,
                minimumSample: MIN_EMPLOYEE_SAMPLE,
                source: "SNAPSHOT",
                scope: {
                    reviewPeriodId: period.id,
                    title: period.title,
                    dateFrom: periodBounds!.from,
                    dateToExclusive: periodBounds!.toExclusive,
                    closedAt: period.closedAt,
                    generatedAt: snapshot?.generatedAt ?? null,
                },
                summary: meetsMinimum
                    ? {
                          count,
                          average: Number(snapshot!.ratingAverage),
                          positiveRate: Number(snapshot!.positiveRate),
                          negativeRate: Number(snapshot!.negativeRate),
                      }
                    : { count },
                suspectedExcludedCount: snapshot?.suspectedExcludedCount ?? 0,
                message: meetsMinimum
                    ? null
                    : `ยังไม่พอแสดงคะแนนสรุป ต้องมีคำตอบที่ผ่านการตรวจอย่างน้อย ${MIN_EMPLOYEE_SAMPLE} รายการ`,
                // Snapshot เก็บหัวข้อโดยไม่เก็บข้อความดิบหรือจำนวนย่อยระบุตัวบุคคล
                topReasons: meetsMinimum
                    ? (snapshot?.topReasonKeys ?? []).map((key) => ({ key }))
                    : [],
            });
        }

        const responseWhere = {
            employeeId: session.user.id,
            targetType: "EMPLOYEE" as const,
            kind: "STANDARD" as const,
            validity: "VALID" as const,
            overallRating: { not: null },
            ...(periodBounds
                ? { submittedAt: { gte: periodBounds.from, lt: periodBounds.toExclusive } }
                : {}),
        };
        const responses = await prisma.customerFeedbackResponse.findMany({
            where: {
                ...responseWhere,
            },
            orderBy: { submittedAt: "desc" },
            select: { overallRating: true, reasonKeys: true, submittedAt: true },
        });

        const summary = summarizeRatings(responses.map((r) => r.overallRating!));
        const reasonCounts = new Map<string, number>();
        for (const r of responses) {
            for (const k of r.reasonKeys) reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
        }

        const meetsMinimum = summary.count >= MIN_EMPLOYEE_SAMPLE;
        return privateJson({
            meetsMinimum,
            minimumSample: MIN_EMPLOYEE_SAMPLE,
            source: "LIVE",
            scope: period
                ? {
                      reviewPeriodId: period.id,
                      title: period.title,
                      dateFrom: periodBounds!.from,
                      dateToExclusive: periodBounds!.toExclusive,
                      closedAt: null,
                      generatedAt: null,
                  }
                : null,
            // ถ้ายังไม่ถึง minimum ให้แสดงแค่จำนวน — ไม่แสดงคะแนนสรุป
            summary: meetsMinimum
                ? { count: summary.count, average: Number(summary.average!.toFixed(2)), positiveRate: Number(summary.positiveRate!.toFixed(1)), negativeRate: Number(summary.negativeRate!.toFixed(1)), distribution: summary.distribution }
                : { count: summary.count },
            message: meetsMinimum ? null : `ยังไม่พอแสดงคะแนนสรุป ต้องมีคำตอบที่ผ่านการตรวจอย่างน้อย ${MIN_EMPLOYEE_SAMPLE} รายการ`,
            topReasons: meetsMinimum
                ? [...reasonCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([key, count]) => ({ key, count }))
                : [],
        });
    } catch (error) {
        console.error("Error loading self summary:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
