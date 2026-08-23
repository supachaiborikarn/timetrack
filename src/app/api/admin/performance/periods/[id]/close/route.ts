import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { summarizeRatings } from "@/lib/customer-feedback/metrics";

/**
 * POST /api/admin/performance/periods/[id]/close
 * ปิด ReviewPeriod และสร้าง CustomerFeedbackReviewSnapshot ใน transaction เดียวกัน
 * ถ้าสร้าง snapshot ล้มเหลวทั้งชุด rollback (isActive, closedAt ไม่เปลี่ยน)
 */

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, isActive: true } });
        if (!user?.isActive || (user.role !== "ADMIN" && user.role !== "HR")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const period = await prisma.reviewPeriod.findUnique({ where: { id } });
        if (!period) return NextResponse.json({ error: "ไม่พบรอบประเมิน" }, { status: 404 });
        if (period.endDate.getTime() > Date.now()) {
            return NextResponse.json({ error: "รอบประเมินยังไม่ครบกำหนด ปิดได้หลังวันสุดท้ายเท่านั้น" }, { status: 400 });
        }

        // idempotent: เรียกซ้ำไม่สร้าง snapshot ซ้ำ
        const alreadyClosed = await prisma.customerFeedbackReviewSnapshot.count({ where: { reviewPeriodId: id } });
        if (alreadyClosed > 0 || period.closedAt) {
            if (!period.isActive) {
                return NextResponse.json({ message: "รอบนี้ปิดไปแล้ว" });
            }
        }

        const dateFrom = new Date(Math.max(period.startDate.getTime(), Date.now() - 365 * 86400 * 1000));

        await prisma.$transaction(async (tx) => {
            // snapshot ต่อพนักงานจาก valid STANDARD response ของ QR พนักงาน
            const responses = await tx.customerFeedbackResponse.findMany({
                where: {
                    targetType: "EMPLOYEE",
                    kind: "STANDARD",
                    validity: "VALID",
                    overallRating: { not: null },
                    submittedAt: { gte: dateFrom, lte: period.endDate },
                },
                select: { employeeId: true, employeeLabelSnapshot: true, overallRating: true, reasonKeys: true },
            });

            const byEmployee = new Map<string, { label: string; ratings: number[]; reasons: Map<string, number> }>();
            for (const r of responses) {
                if (!r.employeeId) continue;
                const entry = byEmployee.get(r.employeeId) ?? { label: r.employeeLabelSnapshot ?? r.employeeId, ratings: [], reasons: new Map<string, number>() };
                entry.ratings.push(r.overallRating!);
                for (const k of r.reasonKeys) entry.reasons.set(k, (entry.reasons.get(k) ?? 0) + 1);
                byEmployee.set(r.employeeId, entry);
            }
            const suspectedByEmployee = await tx.customerFeedbackResponse.groupBy({
                by: ["employeeId"],
                where: {
                    targetType: "EMPLOYEE",
                    kind: "STANDARD",
                    validity: "SUSPECTED",
                    submittedAt: { gte: dateFrom, lte: period.endDate },
                },
                _count: { _all: true },
            });
            const suspectedMap = new Map(
                suspectedByEmployee.filter((r) => r.employeeId).map((r) => [r.employeeId as string, r._count._all])
            );

            for (const [employeeId, entry] of byEmployee) {
                const summary = summarizeRatings(entry.ratings);
                await tx.customerFeedbackReviewSnapshot.upsert({
                    where: { reviewPeriodId_employeeId: { reviewPeriodId: id, employeeId } },
                    update: {},
                    create: {
                        reviewPeriodId: id,
                        employeeId,
                        employeeLabelSnapshot: entry.label,
                        dateFrom,
                        dateTo: period.endDate,
                        validCount: summary.count,
                        ratingAverage: summary.average ?? 0,
                        positiveRate: summary.positiveRate ?? 0,
                        negativeRate: summary.negativeRate ?? 0,
                        suspectedExcludedCount: suspectedMap.get(employeeId) ?? 0,
                        topReasonKeys: [...entry.reasons.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k),
                        generatedById: session.user!.id,
                    },
                });
            }

            await tx.reviewPeriod.update({
                where: { id },
                data: { isActive: false, closedAt: new Date(), closedById: session.user!.id },
            });
        });

        return NextResponse.json({ message: "ปิดรอบประเมินและสร้าง snapshot แล้ว" });
    } catch (error) {
        console.error("Error closing review period:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
