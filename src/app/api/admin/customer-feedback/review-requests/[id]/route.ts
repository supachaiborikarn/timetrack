import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * PATCH /api/admin/customer-feedback/review-requests/[id]
 * actions: start | resolve | dismiss — ปิดต้องมี resolution note / dismissed reason
 */

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
            return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
        }
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.review_request_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });

        const { id } = await params;
        const body = (await request.json()) as {
            action: "start" | "resolve" | "dismiss";
            resolutionNote?: unknown;
            dismissedReason?: unknown;
        };

        const req = await prisma.customerFeedbackReviewRequest.findUnique({ where: { id } });
        if (!req) return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });
        if (req.status === "RESOLVED" || req.status === "DISMISSED") {
            return NextResponse.json({ error: "คำขอนี้ปิดแล้ว" }, { status: 409 });
        }

        const now = new Date();
        let data: Record<string, unknown>;
        switch (body.action) {
            case "start":
                data = { status: "IN_REVIEW", reviewedById: access.ctx.userId };
                break;
            case "resolve":
                if (typeof body.resolutionNote !== "string" || !body.resolutionNote.trim()) {
                    return NextResponse.json({ error: "ต้องมีรายละเอียดผลการทบทวน" }, { status: 400 });
                }
                if (body.resolutionNote.trim().length > 2000) {
                    return NextResponse.json({ error: "รายละเอียดผลการทบทวนยาวไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });
                }
                data = { status: "RESOLVED", resolutionNote: body.resolutionNote.trim(), reviewedById: access.ctx.userId, resolvedAt: now };
                break;
            case "dismiss":
                if (typeof body.dismissedReason !== "string" || !body.dismissedReason.trim()) {
                    return NextResponse.json({ error: "ต้องมีเหตุผลการยกเลิก" }, { status: 400 });
                }
                if (body.dismissedReason.trim().length > 2000) {
                    return NextResponse.json({ error: "เหตุผลการยกเลิกยาวไม่เกิน 2,000 ตัวอักษร" }, { status: 400 });
                }
                data = { status: "DISMISSED", resolutionNote: body.dismissedReason.trim(), reviewedById: access.ctx.userId, resolvedAt: now };
                break;
            default:
                return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }

        const updated = await prisma.$transaction(async (tx) => {
            const result = await tx.customerFeedbackReviewRequest.updateMany({
                where: body.action === "start"
                    ? { id, status: "OPEN" }
                    : { id, status: { in: ["OPEN", "IN_REVIEW"] } },
                data,
            });
            if (result.count === 0) return false;
            await tx.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_REVIEW_REQUEST_UPDATED",
                    entity: "CustomerFeedbackReviewRequest",
                    entityId: id,
                    details: JSON.stringify({ action: body.action, fromStatus: req.status, toStatus: data.status }),
                    userId: access.ctx.userId,
                },
            });
            return true;
        });
        if (!updated) {
            return NextResponse.json({ error: "คำขอนี้ถูกอัปเดตหรือปิดโดยผู้ใช้อื่นแล้ว" }, { status: 409 });
        }
        return NextResponse.json({ message: "อัปเดตคำขอแล้ว" });
    } catch (error) {
        console.error("Error updating review request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
