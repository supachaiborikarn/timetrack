import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, reviewPeriodDayBounds } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { MIN_EMPLOYEE_SAMPLE, summarizeRatings } from "@/lib/customer-feedback/metrics";

class ReviewPeriodAlreadyClosedError extends Error {}

async function requireReviewPeriodAdmin() {
    const access = await getFeedbackAccessContext();
    if (!access.ok) return access;
    if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
        return { ok: false as const, status: 403 as const, message: "Forbidden" };
    }
    return access;
}

/** อ่าน snapshot ของรอบ โดยซ่อนคะแนนรายคนที่ยังไม่ถึง minimum sample */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await requireReviewPeriodAdmin();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

        const { id } = await params;
        const period = await prisma.reviewPeriod.findUnique({
            where: { id },
            select: { id: true, title: true, startDate: true, endDate: true, isActive: true, closedAt: true },
        });
        if (!period) return NextResponse.json({ error: "ไม่พบรอบประเมิน" }, { status: 404 });

        const snapshots = await prisma.customerFeedbackReviewSnapshot.findMany({
            where: { reviewPeriodId: id },
            orderBy: { employeeLabelSnapshot: "asc" },
            select: {
                id: true,
                employeeId: true,
                employeeLabelSnapshot: true,
                dateFrom: true,
                dateTo: true,
                validCount: true,
                ratingAverage: true,
                positiveRate: true,
                negativeRate: true,
                suspectedExcludedCount: true,
                topReasonKeys: true,
            },
        });

        return NextResponse.json({
            period,
            minimumSample: MIN_EMPLOYEE_SAMPLE,
            snapshots: snapshots.map((snapshot) => {
                const meetsMinimum = snapshot.validCount >= MIN_EMPLOYEE_SAMPLE;
                return {
                    ...snapshot,
                    meetsMinimum,
                    ratingAverage: meetsMinimum ? Number(snapshot.ratingAverage) : null,
                    positiveRate: meetsMinimum ? Number(snapshot.positiveRate) : null,
                    negativeRate: meetsMinimum ? Number(snapshot.negativeRate) : null,
                    topReasonKeys: meetsMinimum ? snapshot.topReasonKeys : [],
                };
            }),
        });
    } catch (error) {
        console.error("Error reading review snapshots:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

/** ปิด ReviewPeriod และสร้าง CustomerFeedbackReviewSnapshot ใน transaction เดียวกัน */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await requireReviewPeriodAdmin();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

        const { id } = await params;
        const period = await prisma.reviewPeriod.findUnique({ where: { id } });
        if (!period) return NextResponse.json({ error: "ไม่พบรอบประเมิน" }, { status: 404 });

        const dateFrom = reviewPeriodDayBounds(period.startDate).dayStart;
        const dateToExclusive = reviewPeriodDayBounds(period.endDate).nextDayStart;
        if (dateFrom.getTime() >= dateToExclusive.getTime()) {
            return NextResponse.json({ error: "ช่วงรอบประเมินไม่ถูกต้อง" }, { status: 400 });
        }
        if (dateToExclusive.getTime() > Date.now()) {
            return NextResponse.json({ error: "รอบประเมินยังไม่ครบกำหนด ปิดได้หลังวันสุดท้ายเท่านั้น" }, { status: 400 });
        }

        if (period.closedAt || !period.isActive) {
            const snapshotCount = await prisma.customerFeedbackReviewSnapshot.count({ where: { reviewPeriodId: id } });
            return NextResponse.json({ message: "รอบนี้ปิดไปแล้ว", snapshotCount, closedAt: period.closedAt });
        }

        const result = await prisma.$transaction(async (tx) => {
            // ชิงสิทธิ์ปิดรอบก่อนเขียน snapshot เพื่อให้ request ที่แพ้ race rollback โดยไม่ทิ้งข้อมูลไว้
            const closed = await tx.reviewPeriod.updateMany({
                where: { id, isActive: true, closedAt: null },
                data: { isActive: false, closedAt: new Date(), closedById: access.ctx.userId },
            });
            if (closed.count !== 1) throw new ReviewPeriodAlreadyClosedError();

            // อ่าน VALID และ SUSPECTED ใน statement เดียว เพื่อไม่ให้ moderation ระหว่างสอง query
            // ทำให้คำตอบเดียวถูกนับซ้ำหรือหายจาก snapshot
            const [periodResponses, eligibleEmployees] = await Promise.all([
                tx.customerFeedbackResponse.findMany({
                    where: {
                        targetType: "EMPLOYEE",
                        kind: "STANDARD",
                        validity: { in: ["VALID", "SUSPECTED"] },
                        submittedAt: { gte: dateFrom, lt: dateToExclusive },
                    },
                    select: {
                        employeeId: true,
                        employeeLabelSnapshot: true,
                        overallRating: true,
                        reasonKeys: true,
                        validity: true,
                    },
                }),
                // รวมผู้ที่มี QR พนักงานตั้งแต่ก่อนจบรอบ แม้ยังไม่มีลูกค้าประเมินเลย
                tx.user.findMany({
                    where: {
                        isActive: true,
                        role: { in: ["EMPLOYEE", "CASHIER", "MANAGER"] },
                        feedbackQrs: {
                            some: {
                                targetType: "EMPLOYEE",
                                isTest: false,
                                createdAt: { lt: dateToExclusive },
                            },
                        },
                    },
                    select: { id: true, name: true },
                }),
            ]);

            const byEmployee = new Map<string, { label: string; ratings: number[]; reasons: Map<string, number> }>();
            for (const response of periodResponses) {
                if (response.validity !== "VALID" || response.overallRating === null) continue;
                if (!response.employeeId) continue;
                const entry = byEmployee.get(response.employeeId) ?? {
                    label: response.employeeLabelSnapshot ?? response.employeeId,
                    ratings: [],
                    reasons: new Map<string, number>(),
                };
                entry.ratings.push(response.overallRating!);
                for (const reasonKey of response.reasonKeys) {
                    entry.reasons.set(reasonKey, (entry.reasons.get(reasonKey) ?? 0) + 1);
                }
                byEmployee.set(response.employeeId, entry);
            }

            const suspectedMap = new Map<string, number>();
            for (const response of periodResponses) {
                if (response.validity !== "SUSPECTED") continue;
                if (!response.employeeId) continue;
                suspectedMap.set(response.employeeId, (suspectedMap.get(response.employeeId) ?? 0) + 1);
                if (!byEmployee.has(response.employeeId)) {
                    byEmployee.set(response.employeeId, {
                        label: response.employeeLabelSnapshot ?? response.employeeId,
                        ratings: [],
                        reasons: new Map<string, number>(),
                    });
                }
            }
            for (const employee of eligibleEmployees) {
                if (!byEmployee.has(employee.id)) {
                    byEmployee.set(employee.id, {
                        label: employee.name,
                        ratings: [],
                        reasons: new Map<string, number>(),
                    });
                }
            }

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
                        topReasonKeys: [...entry.reasons.entries()]
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([key]) => key),
                        generatedById: access.ctx.userId,
                    },
                });
            }

            return { snapshotCount: byEmployee.size };
        });

        return NextResponse.json({ message: "ปิดรอบประเมินและสร้าง snapshot แล้ว", snapshotCount: result.snapshotCount });
    } catch (error) {
        if (error instanceof ReviewPeriodAlreadyClosedError) {
            const { id } = await params;
            const [snapshotCount, currentPeriod] = await Promise.all([
                prisma.customerFeedbackReviewSnapshot.count({ where: { reviewPeriodId: id } }),
                prisma.reviewPeriod.findUnique({ where: { id }, select: { closedAt: true } }),
            ]);
            return NextResponse.json({ message: "รอบนี้ปิดไปแล้ว", snapshotCount, closedAt: currentPeriod?.closedAt ?? null });
        }
        console.error("Error closing review period:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
