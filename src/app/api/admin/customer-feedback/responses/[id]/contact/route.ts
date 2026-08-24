import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { decryptField } from "@/lib/crypto-field";
import { canViewFeedbackIncident, getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * GET /api/admin/customer-feedback/responses/[id]/contact
 * ถอดรหัสข้อมูลติดต่อ — ตรวจ customer_feedback.view_contact และสร้าง
 * AuditLog แบบ fail closed ก่อนคืนค่า ห้ามใช้ logActivity เดิมที่กลืน error
 */

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.view_contact");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const { id } = await params;
        const response = await prisma.customerFeedbackResponse.findUnique({
            where: { id },
            select: { id: true, stationId: true, kind: true, contact: true },
        });
        if (!response) return NextResponse.json({ error: "ไม่พบคำตอบ" }, { status: 404 });
        if (scope.stationId && response.stationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });
        }
        if (response.kind === "INCIDENT" && !canViewIncident) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเหตุเร่งด่วน" }, { status: 403 });
        }
        if (!response.contact) {
            return NextResponse.json({ error: "คำตอบนี้ไม่มีข้อมูลติดต่อ" }, { status: 404 });
        }

        // บันทึก AuditLog ให้สำเร็จก่อน — ถ้าเขียนไม่ได้ตอบ 500 โดยไม่คืนข้อมูลติดต่อ
        try {
            await prisma.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_CONTACT_VIEWED",
                    entity: "CustomerFeedbackResponse",
                    entityId: id,
                    userId: access.ctx.userId,
                },
            });
        } catch {
            return NextResponse.json({ error: "บันทึกประวัติการเข้าถึงไม่สำเร็จ" }, { status: 500 });
        }

        return NextResponse.json({
            contact: {
                channel: response.contact.channel,
                value: decryptField(response.contact.valueEncrypted),
                name: response.contact.nameEncrypted ? decryptField(response.contact.nameEncrypted) : null,
                preferredTime: response.contact.preferredTime,
                consentAt: response.contact.consentAt,
                purgeAfter: response.contact.purgeAfter,
            },
        });
    } catch {
        console.error("Error viewing contact:");
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
