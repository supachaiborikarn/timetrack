import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { shrinkContactPurgeAfter } from "@/lib/customer-feedback/retention";

/**
 * PATCH /api/admin/customer-feedback/cases/[id]
 * actions: acknowledge | assign | start | resolve | dismiss | set-station
 * การปิดเคสต้องมี resolution note และการยกเลิกต้องมี dismissed reason
 * การเปลี่ยนผู้รับผิดชอบ สถานะ ระดับ และรายละเอียดการปิดต้องบันทึก AuditLog
 */

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.case_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

        const { id } = await params;
        const body = (await request.json()) as {
            action: "acknowledge" | "assign" | "start" | "resolve" | "dismiss" | "set-station";
            assignedToId?: string;
            resolutionNote?: string;
            dismissedReason?: string;
            stationId?: string;
        };

        const existingCase = await prisma.customerFeedbackCase.findUnique({ where: { id }, include: { response: { select: { id: true, contact: true } } } });
        if (!existingCase) return NextResponse.json({ error: "ไม่พบเคส" }, { status: 404 });
        // เคสที่ยังไม่ระบุสถานี (stationId null) จัดการได้เฉพาะ ADMIN/HR
        if (existingCase.stationId === null && access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
            return NextResponse.json({ error: "เคสนี้รอให้ ADMIN หรือ HR ระบุสถานีก่อน" }, { status: 403 });
        }
        if (scope.stationId && existingCase.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }

        const now = new Date();
        let data: Record<string, unknown> = {};
        const auditDetails: Record<string, unknown> = { action: body.action };

        switch (body.action) {
            case "acknowledge":
                if (existingCase.acknowledgedAt) return NextResponse.json({ message: "รับทราบแล้ว" });
                data = { acknowledgedAt: now };
                break;
            case "assign":
                if (!body.assignedToId) return NextResponse.json({ error: "ต้องระบุผู้รับผิดชอบ" }, { status: 400 });
                data = { assignedToId: body.assignedToId };
                auditDetails.assignedToId = body.assignedToId;
                break;
            case "start":
                data = { status: "IN_PROGRESS" };
                break;
            case "resolve":
                if (!body.resolutionNote?.trim()) return NextResponse.json({ error: "การปิดเคสต้องมีรายละเอียดวิธีจัดการ" }, { status: 400 });
                data = { status: "RESOLVED", resolutionNote: body.resolutionNote.trim(), resolvedAt: now };
                auditDetails.resolutionNote = body.resolutionNote.trim();
                break;
            case "dismiss":
                if (!body.dismissedReason?.trim()) return NextResponse.json({ error: "การยกเลิกเคสต้องมีเหตุผล" }, { status: 400 });
                data = { status: "DISMISSED", dismissedReason: body.dismissedReason.trim(), resolvedAt: now };
                auditDetails.dismissedReason = body.dismissedReason.trim();
                break;
            case "set-station":
                if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
                    return NextResponse.json({ error: "เฉพาะ ADMIN หรือ HR ระบุสถานีได้" }, { status: 403 });
                }
                if (!body.stationId) return NextResponse.json({ error: "ต้องระบุสถานี" }, { status: 400 });
                data = { stationId: body.stationId };
                auditDetails.stationId = body.stationId;
                break;
            default:
                return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }

        await prisma.$transaction(async (tx) => {
            await tx.customerFeedbackCase.update({ where: { id }, data });

            // ปิดเคสแล้วไม่เหลือเคสเปิดของ response -> ลด retention ข้อมูลติดต่อ
            if (body.action === "resolve" || body.action === "dismiss") {
                const openCount = await tx.customerFeedbackCase.count({
                    where: { responseId: existingCase.responseId, status: { in: ["OPEN", "IN_PROGRESS"] } },
                });
                if (openCount === 0 && existingCase.response.contact) {
                    await tx.customerFeedbackContact.update({
                        where: { responseId: existingCase.responseId },
                        data: { purgeAfter: shrinkContactPurgeAfter(existingCase.response.contact.purgeAfter, now) },
                    });
                }
            }

            await tx.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_CASE_UPDATED",
                    entity: "CustomerFeedbackCase",
                    entityId: id,
                    details: auditDetails as never,
                    userId: access.ctx.userId,
                },
            });
        });

        return NextResponse.json({ message: "อัปเดตเคสแล้ว" });
    } catch (error) {
        console.error("Error updating case:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
