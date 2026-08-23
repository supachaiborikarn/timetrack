import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * GET /api/admin/customer-feedback/review-requests — รายการคำขอทบทวน (ADMIN, HR)
 */

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.review_request_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });

        const status = request.nextUrl.searchParams.get("status");
        const requests = await prisma.customerFeedbackReviewRequest.findMany({
            where: status && ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"].includes(status)
                ? { status: status as "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED" }
                : {},
            orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
            take: 100,
        });
        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Error listing review requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
