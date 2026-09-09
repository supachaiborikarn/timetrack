import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { fairPlayPenaltyLevelForViolation } from "@/lib/customer-feedback/fair-play";
import { refreshWeeklyCompetitionAfterFeedbackFairPlay } from "@/lib/competition/league";

async function requireFairPlayAdmin() {
    if (!isCustomerFeedbackEnabled()) {
        return { ok: false as const, response: NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 }) };
    }
    const access = await getFeedbackAccessContext();
    if (!access.ok) return { ok: false as const, response: NextResponse.json({ error: access.message }, { status: access.status }) };
    if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
        return { ok: false as const, response: NextResponse.json({ error: "เฉพาะ ADMIN/HR เท่านั้น" }, { status: 403 }) };
    }
    const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.review_request_manage");
    if (!perm.ok) return { ok: false as const, response: NextResponse.json({ error: perm.message }, { status: perm.status }) };
    const scope = await getStationScope(access.ctx);
    if (!scope.ok) return { ok: false as const, response: NextResponse.json({ error: scope.message }, { status: scope.status }) };
    return { ok: true as const, ctx: access.ctx, stationId: scope.stationId };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const access = await requireFairPlayAdmin();
        if (!access.ok) return access.response;
        const { id } = await params;
        const body = (await request.json()) as { action?: unknown; note?: unknown };
        if (body.action !== "confirm" && body.action !== "dismiss") {
            return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }
        if (typeof body.note !== "string" || !body.note.trim()) {
            return NextResponse.json({ error: "กรุณาระบุผลการตรวจ" }, { status: 400 });
        }
        const note = body.note.trim();
        if (note.length > 2000) return NextResponse.json({ error: "รายละเอียดผลตรวจยาวไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });

        const review = await prisma.customerFeedbackFairPlayReview.findUnique({
            where: { id },
            include: {
                response: {
                    select: {
                        id: true,
                        refCode: true,
                        employeeId: true,
                        employeeLabelSnapshot: true,
                        stationId: true,
                        submittedAt: true,
                        validity: true,
                    },
                },
            },
        });
        if (!review) return NextResponse.json({ error: "ไม่พบรายการ Fair Play" }, { status: 404 });
        if (access.stationId && review.stationId !== access.stationId) return NextResponse.json({ error: "ไม่มีสิทธิ์ในสถานีนี้" }, { status: 403 });
        if (review.status !== "REVIEW") return NextResponse.json({ error: "รายการนี้ตรวจเสร็จแล้ว" }, { status: 409 });

        const now = new Date();
        const nextStatus = body.action === "confirm" ? "CONFIRMED" : "DISMISSED";
        const updated = await prisma.$transaction(async (tx) => {
            const claimed = await tx.customerFeedbackFairPlayReview.updateMany({
                where: { id, status: "REVIEW" },
                data: {
                    status: nextStatus,
                    reasonNote: review.reasonNote ? `${review.reasonNote}\nผลตรวจ: ${note}` : `ผลตรวจ: ${note}`,
                    reviewedById: access.ctx.userId,
                    reviewedAt: now,
                },
            });
            if (claimed.count !== 1) return false;

            if (body.action === "confirm") {
                // ไม่ลบหลักฐานเดิม: เปลี่ยนเป็น HIDDEN เพื่อให้หลุดจาก daily target / score / League / RP / CNY
                await tx.customerFeedbackResponse.updateMany({
                    where: { id: review.responseId, validity: { not: "TEST" } },
                    data: { validity: "HIDDEN" },
                });
            }

            await tx.auditLog.create({
                data: {
                    action: body.action === "confirm"
                        ? "CUSTOMER_FEEDBACK_FAIR_PLAY_CONFIRMED"
                        : "CUSTOMER_FEEDBACK_FAIR_PLAY_DISMISSED",
                    entity: "CustomerFeedbackFairPlayReview",
                    entityId: id,
                    details: JSON.stringify({
                        responseId: review.responseId,
                        refCode: review.response.refCode,
                        employeeId: review.employeeId,
                        source: review.source,
                        reasonCode: review.reasonCode,
                        signals: review.signals,
                        note,
                        previousValidity: review.response.validity,
                        nextValidity: body.action === "confirm" ? "HIDDEN" : review.response.validity,
                    }),
                    userId: access.ctx.userId,
                },
            });
            return true;
        });
        if (!updated) return NextResponse.json({ error: "รายการนี้ถูกตรวจโดยผู้ใช้อื่นแล้ว กรุณาโหลดใหม่" }, { status: 409 });

        const competitionRefresh = review.stationId
            ? await refreshWeeklyCompetitionAfterFeedbackFairPlay({
                stationId: review.stationId,
                occurredAt: review.response.submittedAt,
            })
            : null;

        if (body.action === "dismiss" || !review.employeeId) {
            return NextResponse.json({
                message: "ยกเลิกข้อสงสัยแล้ว แบบประเมินยังคงสถานะเดิม",
                competitionRefresh,
            });
        }

        const occurredAt = review.response.submittedAt;
        const from = new Date(occurredAt.getTime() - 30 * 24 * 60 * 60 * 1000);
        const confirmed = await prisma.customerFeedbackFairPlayReview.findMany({
            where: {
                employeeId: review.employeeId,
                status: "CONFIRMED",
                response: { submittedAt: { gte: from, lte: occurredAt } },
            },
            select: { response: { select: { submittedAt: true } } },
        });
        const penalty = fairPlayPenaltyLevelForViolation(
            confirmed.map((row) => ({ occurredAt: row.response.submittedAt })),
            occurredAt
        );

        const eventKey = `feedback-fair-play:${id}`;
        const existingNotification = await prisma.notification.findFirst({ where: { userId: review.employeeId, eventKey }, select: { id: true } });
        if (!existingNotification) {
            await prisma.notification.create({
                data: {
                    userId: review.employeeId,
                    type: "CUSTOMER_FEEDBACK_FAIR_PLAY",
                    title: "⚠️ ผลตรวจ Fair Play แบบประเมินลูกค้า",
                    message: `ยืนยันว่ามีแบบประเมินไม่เป็นธรรมและตัดแบบนั้นออกจากคะแนนแล้ว · ${penalty.label}`,
                    link: "/league",
                    eventKey,
                },
            });
        }

        return NextResponse.json({
            message: "ยืนยัน Fair Play แล้ว แบบประเมินนี้ถูกตัดออกจากการคำนวณทั้งหมด",
            penalty,
            responseId: review.responseId,
            occurredAt,
            stationId: review.stationId,
            employeeId: review.employeeId,
            competitionRefresh,
        });
    } catch (error) {
        console.error("Error reviewing customer feedback fair-play item:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
