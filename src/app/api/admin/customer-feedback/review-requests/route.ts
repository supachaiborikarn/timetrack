import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, parseFeedbackPagination, parseOptionalFeedbackFilter, requireFeedbackPermission } from "@/lib/customer-feedback/access";
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
        if (access.ctx.role !== "ADMIN" && access.ctx.role !== "HR") {
            return NextResponse.json({ error: "ไม่มีสิทธิ์เข้าถึง" }, { status: 403 });
        }
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.review_request_manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });

        const status = parseOptionalFeedbackFilter(
            request.nextUrl.searchParams.get("status"),
            ["OPEN", "IN_REVIEW", "RESOLVED", "DISMISSED"] as const,
            "status"
        );
        if (!status.ok) return NextResponse.json({ error: status.message }, { status: 400 });
        const pagination = parseFeedbackPagination(
            request.nextUrl.searchParams.get("page"),
            request.nextUrl.searchParams.get("pageSize"),
            { pageSize: 50, maxPageSize: 100 }
        );
        if (!pagination.ok) return NextResponse.json({ error: pagination.message }, { status: 400 });
        const { page, pageSize } = pagination.value;
        const where = status.value ? { status: status.value } : {};
        const [total, requests] = await Promise.all([
            prisma.customerFeedbackReviewRequest.count({ where }),
            prisma.customerFeedbackReviewRequest.findMany({
                where,
                orderBy: [{ status: "asc" }, { submittedAt: "asc" }],
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);
        return NextResponse.json({ requests, total, page, pageSize });
    } catch (error) {
        console.error("Error listing review requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
