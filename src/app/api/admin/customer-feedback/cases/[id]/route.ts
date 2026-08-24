import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canViewFeedbackIncident, getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
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
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const { id } = await params;
        const body = (await request.json()) as {
            action: "acknowledge" | "assign" | "start" | "resolve" | "dismiss" | "set-station";
            assignedToId?: unknown;
            resolutionNote?: unknown;
            dismissedReason?: unknown;
            stationId?: unknown;
        };

        const existingCase = await prisma.customerFeedbackCase.findUnique({
            where: { id },
            include: { response: { select: { id: true, kind: true, contact: true } } },
        });
        if (!existingCase) return NextResponse.json({ error: "ไม่พบเคส" }, { status: 404 });
        // เคสที่ยังไม่ระบุสถานี (stationId null) จัดการได้เฉพาะ ADMIN/HR
        if (existingCase.stationId === null && access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
            return NextResponse.json({ error: "เคสนี้รอให้ ADMIN หรือ HR ระบุสถานีก่อน" }, { status: 403 });
        }
        if (scope.stationId && existingCase.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }
        if (existingCase.response.kind === "INCIDENT" && !canViewIncident) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเหตุเร่งด่วน" }, { status: 403 });
        }

        const now = new Date();
        let data: Record<string, unknown> = {};
        const auditDetails: Record<string, unknown> = { action: body.action };
        let allowedCurrentStatuses: Array<"OPEN" | "IN_PROGRESS"> | null = null;

        switch (body.action) {
            case "acknowledge":
                if (existingCase.acknowledgedAt) return NextResponse.json({ message: "รับทราบแล้ว" });
                data = { acknowledgedAt: now };
                break;
            case "assign":
                if (
                    typeof body.assignedToId !== "string" ||
                    !body.assignedToId.trim() ||
                    body.assignedToId.length > 100
                ) {
                    return NextResponse.json({ error: "ต้องระบุผู้รับผิดชอบ" }, { status: 400 });
                }
                if (existingCase.status === "RESOLVED" || existingCase.status === "DISMISSED") {
                    return NextResponse.json({ error: "เคสนี้ปิดแล้ว" }, { status: 409 });
                }
                const assignee = await prisma.user.findUnique({
                    where: { id: body.assignedToId.trim() },
                    select: { id: true, isActive: true, role: true, stationId: true },
                });
                if (!assignee || !assignee.isActive || !["ADMIN", "HR", "MANAGER"].includes(assignee.role)) {
                    return NextResponse.json({ error: "ไม่พบผู้รับผิดชอบที่ยังใช้งานอยู่" }, { status: 400 });
                }
                if (
                    access.ctx.role === "MANAGER" &&
                    (assignee.role !== "MANAGER" || assignee.stationId !== existingCase.stationId)
                ) {
                    return NextResponse.json({ error: "ผู้จัดการมอบหมายได้เฉพาะผู้จัดการในสถานีเดียวกัน" }, { status: 403 });
                }
                if (
                    assignee.role === "MANAGER" &&
                    (!existingCase.stationId || assignee.stationId !== existingCase.stationId)
                ) {
                    return NextResponse.json({ error: "ผู้รับผิดชอบต้องอยู่สถานีเดียวกับเคส" }, { status: 403 });
                }
                data = { assignedToId: body.assignedToId.trim() };
                auditDetails.assignedToId = body.assignedToId.trim();
                allowedCurrentStatuses = ["OPEN", "IN_PROGRESS"];
                break;
            case "start":
                if (existingCase.status === "RESOLVED" || existingCase.status === "DISMISSED") {
                    return NextResponse.json({ error: "เคสนี้ปิดแล้ว" }, { status: 409 });
                }
                if (existingCase.status === "IN_PROGRESS") return NextResponse.json({ message: "กำลังดำเนินการอยู่แล้ว" });
                data = { status: "IN_PROGRESS" };
                allowedCurrentStatuses = ["OPEN"];
                break;
            case "resolve":
                if (existingCase.status === "RESOLVED" || existingCase.status === "DISMISSED") {
                    return NextResponse.json({ error: "เคสนี้ปิดแล้ว" }, { status: 409 });
                }
                if (typeof body.resolutionNote !== "string" || !body.resolutionNote.trim()) {
                    return NextResponse.json({ error: "การปิดเคสต้องมีรายละเอียดวิธีจัดการ" }, { status: 400 });
                }
                if (body.resolutionNote.trim().length > 2000) {
                    return NextResponse.json({ error: "รายละเอียดวิธีจัดการยาวไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });
                }
                data = { status: "RESOLVED", resolutionNote: body.resolutionNote.trim(), resolvedAt: now };
                auditDetails.resolutionNote = body.resolutionNote.trim();
                allowedCurrentStatuses = ["OPEN", "IN_PROGRESS"];
                break;
            case "dismiss":
                if (existingCase.status === "RESOLVED" || existingCase.status === "DISMISSED") {
                    return NextResponse.json({ error: "เคสนี้ปิดแล้ว" }, { status: 409 });
                }
                if (typeof body.dismissedReason !== "string" || !body.dismissedReason.trim()) {
                    return NextResponse.json({ error: "การยกเลิกเคสต้องมีเหตุผล" }, { status: 400 });
                }
                if (body.dismissedReason.trim().length > 2000) {
                    return NextResponse.json({ error: "เหตุผลการยกเลิกยาวไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });
                }
                data = { status: "DISMISSED", dismissedReason: body.dismissedReason.trim(), resolvedAt: now };
                auditDetails.dismissedReason = body.dismissedReason.trim();
                allowedCurrentStatuses = ["OPEN", "IN_PROGRESS"];
                break;
            case "set-station":
                if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
                    return NextResponse.json({ error: "เฉพาะ ADMIN หรือ HR ระบุสถานีได้" }, { status: 403 });
                }
                if (existingCase.status === "RESOLVED" || existingCase.status === "DISMISSED") {
                    return NextResponse.json({ error: "เคสนี้ปิดแล้ว" }, { status: 409 });
                }
                if (typeof body.stationId !== "string" || !body.stationId.trim() || body.stationId.length > 100) {
                    return NextResponse.json({ error: "ต้องระบุสถานี" }, { status: 400 });
                }
                const station = await prisma.station.findUnique({
                    where: { id: body.stationId.trim() },
                    select: { id: true, isActive: true },
                });
                if (!station) return NextResponse.json({ error: "ไม่พบสถานี" }, { status: 404 });
                if (!station.isActive) return NextResponse.json({ error: "สถานีนี้ปิดใช้งานอยู่" }, { status: 400 });
                if (existingCase.stationId === station.id) {
                    return NextResponse.json({ message: "เคสอยู่สถานีนี้แล้ว" });
                }
                // เปลี่ยนสถานีต้องคืนเคสเข้าคิว เพื่อไม่ทิ้งผู้จัดการสถานีเดิมเป็นผู้รับผิดชอบ
                data = { stationId: body.stationId.trim(), assignedToId: null };
                auditDetails.stationId = body.stationId.trim();
                auditDetails.clearedAssignedToId = existingCase.assignedToId;
                allowedCurrentStatuses = ["OPEN", "IN_PROGRESS"];
                break;
            default:
                return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const updateResult = await tx.customerFeedbackCase.updateMany({
                where: {
                    id,
                    // กัน assign กับ set-station ชนกันแล้วได้ผู้รับผิดชอบคนละสถานี
                    stationId: existingCase.stationId,
                    ...(allowedCurrentStatuses ? { status: { in: allowedCurrentStatuses } } : {}),
                },
                data,
            });
            if (updateResult.count === 0) return false;

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
            return true;
        });

        if (!updated) {
            return NextResponse.json({ error: "เคสนี้ถูกอัปเดตหรือปิดโดยผู้ใช้อื่นแล้ว" }, { status: 409 });
        }

        return NextResponse.json({ message: "อัปเดตเคสแล้ว" });
    } catch (error) {
        console.error("Error updating case:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
