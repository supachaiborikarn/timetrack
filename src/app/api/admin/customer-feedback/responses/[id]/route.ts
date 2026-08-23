import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * GET    /api/admin/customer-feedback/responses/[id] — รายละเอียดตามสิทธิ์
 * PATCH  /api/admin/customer-feedback/responses/[id] — เปลี่ยน validity (moderation)
 */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.view_response");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const { hasPermission } = await import("@/lib/permissions");
        const canViewIncident = access.ctx.role === "ADMIN" || (await hasPermission(access.ctx.role, "customer_feedback.view_incident"));

        const { id } = await params;
        const response = await prisma.customerFeedbackResponse.findUnique({
            where: { id },
            include: { answers: true, case: true },
        });
        if (!response) return NextResponse.json({ error: "ไม่พบคำตอบ" }, { status: 404 });
        if (scope.stationId && response.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }
        if (response.kind === "INCIDENT" && !canViewIncident) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเหตุเร่งด่วน" }, { status: 403 });
        }

        // serializer ตาม kind และ permission
        const payload: Record<string, unknown> = {
            id: response.id,
            refCode: response.refCode,
            kind: response.kind,
            targetType: response.targetType,
            employeeLabelSnapshot: response.employeeLabelSnapshot,
            stationLabelSnapshot: response.stationLabelSnapshot,
            overallRating: response.overallRating,
            reasonKeys: response.reasonKeys,
            comment: response.comment,
            wantsFollowUp: response.wantsFollowUp,
            validity: response.validity,
            abuseReasons: response.abuseReasons,
            language: response.language,
            surveyVersion: response.surveyVersion,
            serviceAreas: response.serviceAreas,
            submittedAt: response.submittedAt,
            durationSeconds: response.durationSeconds,
            answers: response.answers.map((a) => ({
                questionKey: a.questionKey,
                state: a.state,
                numberValue: a.numberValue,
                textValue: a.textValue,
                choiceValues: a.choiceValues,
            })),
            case: response.case
                ? { id: response.case.id, severity: response.case.severity, status: response.case.status, dueAt: response.case.dueAt }
                : null,
        };
        if (canViewIncident && response.kind === "INCIDENT") {
            payload.incidentKey = response.incidentKey;
            payload.dangerStatus = response.dangerStatus;
            payload.occurredAt = response.occurredAt;
            payload.noDetail = response.noDetail;
        }
        return NextResponse.json(payload);
    } catch (error) {
        console.error("Error fetching response detail:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.moderate");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

        const { id } = await params;
        const body = (await request.json()) as { validity?: string; reason?: string };
        if (!body.validity || !["VALID", "SUSPECTED", "HIDDEN"].includes(body.validity)) {
            return NextResponse.json({ error: "validity ไม่ถูกต้อง" }, { status: 400 });
        }
        if (body.validity === "HIDDEN" && !body.reason?.trim()) {
            return NextResponse.json({ error: "การซ่อนคำตอบต้องมีเหตุผล" }, { status: 400 });
        }

        const response = await prisma.customerFeedbackResponse.findUnique({ where: { id }, select: { id: true, stationId: true, validity: true } });
        if (!response) return NextResponse.json({ error: "ไม่พบคำตอบ" }, { status: 404 });
        if (scope.stationId && response.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }
        if (response.validity === "TEST") {
            return NextResponse.json({ error: "คำตอบทดสอบห้ามแก้ validity ย้อนหลัง" }, { status: 400 });
        }

        await prisma.$transaction([
            prisma.customerFeedbackResponse.update({
                where: { id },
                data: { validity: body.validity as "VALID" | "SUSPECTED" | "HIDDEN" },
            }),
            prisma.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_RESPONSE_MODERATED",
                    entity: "CustomerFeedbackResponse",
                    entityId: id,
                    details: JSON.stringify({ validity: body.validity, reason: body.reason ?? null }),
                    userId: access.ctx.userId,
                },
            }),
        ]);
        return NextResponse.json({ message: "อัปเดตสถานะแล้ว" });
    } catch (error) {
        console.error("Error moderating response:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
