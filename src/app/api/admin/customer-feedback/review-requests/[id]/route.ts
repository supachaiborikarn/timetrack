import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, requireFeedbackPermission } from "@/lib/customer-feedback/access";

/**
 * PATCH /api/admin/customer-feedback/review-requests/[id]
 * actions: start | resolve | dismiss — ปิดต้องมี resolution note / dismissed reason
 */

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.review_request_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });

        const { id } = await params;
        const body = (await request.json()) as { action: "start" | "resolve" | "dismiss"; resolutionNote?: string; dismissedReason?: string };

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
                if (!body.resolutionNote?.trim()) return NextResponse.json({ error: "ต้องมีรายละเอียดผลการทบทวน" }, { status: 400 });
                data = { status: "RESOLVED", resolutionNote: body.resolutionNote.trim(), reviewedById: access.ctx.userId, resolvedAt: now };
                break;
            case "dismiss":
                if (!body.dismissedReason?.trim()) return NextResponse.json({ error: "ต้องมีเหตุผลการยกเลิก" }, { status: 400 });
                data = { status: "DISMISSED", resolutionNote: body.dismissedReason.trim(), reviewedById: access.ctx.userId, resolvedAt: now };
                break;
            default:
                return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }

        await prisma.customerFeedbackReviewRequest.update({ where: { id }, data });
        return NextResponse.json({ message: "อัปเดตคำขอแล้ว" });
    } catch (error) {
        console.error("Error updating review request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
