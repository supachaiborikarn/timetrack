import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    canViewFeedbackIncident,
    getFeedbackAccessContext,
    getStationScope,
    parseFeedbackDateRange,
    parseFeedbackPagination,
    parseOptionalFeedbackFilter,
    requireFeedbackPermission,
    resolveFeedbackStationId,
} from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * GET /api/admin/customer-feedback/responses — รายการคำตอบแบบแบ่งหน้า
 * ข้อมูลติดต่อไม่อยู่ใน response list ปกติ (ไม่ include contact)
 * ตัด INCIDENT row ทั้งหมดเมื่อไม่มี customer_feedback.view_incident
 */

const MAX_PAGE_SIZE = 50;

export async function GET(request: NextRequest) {
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
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const url = request.nextUrl;
        const pagination = parseFeedbackPagination(url.searchParams.get("page"), url.searchParams.get("pageSize"), {
            pageSize: 20,
            maxPageSize: MAX_PAGE_SIZE,
        });
        if (!pagination.ok) return NextResponse.json({ error: pagination.message }, { status: 400 });
        const kind = parseOptionalFeedbackFilter(url.searchParams.get("kind"), ["STANDARD", "INCIDENT"] as const, "kind");
        if (!kind.ok) return NextResponse.json({ error: kind.message }, { status: 400 });
        const validity = parseOptionalFeedbackFilter(
            url.searchParams.get("validity"),
            ["VALID", "SUSPECTED", "HIDDEN", "TEST"] as const,
            "validity"
        );
        if (!validity.ok) return NextResponse.json({ error: validity.message }, { status: 400 });
        const dateRange = parseFeedbackDateRange(url.searchParams.get("from"), url.searchParams.get("to"));
        if (!dateRange.ok) return NextResponse.json({ error: dateRange.message }, { status: 400 });

        const { page, pageSize } = pagination.value;
        const stationId = resolveFeedbackStationId(scope.stationId, url.searchParams.get("stationId"));

        const where: import("@prisma/client").Prisma.CustomerFeedbackResponseWhereInput = {
            ...(stationId ? { stationId } : {}),
            ...(kind.value ? { kind: kind.value } : {}),
            ...(validity.value ? { validity: validity.value } : {}),
            ...(dateRange.value.from || dateRange.value.toExclusive
                ? {
                      submittedAt: {
                          ...(dateRange.value.from ? { gte: dateRange.value.from } : {}),
                          ...(dateRange.value.toExclusive ? { lt: dateRange.value.toExclusive } : {}),
                      },
                  }
                : {}),
            // ไม่มีสิทธิ์ดู incident -> ตัด INCIDENT row ออกทั้งหมด
            ...(canViewIncident ? {} : { kind: "STANDARD" as const }),
        };

        const [total, responses] = await Promise.all([
            prisma.customerFeedbackResponse.count({ where }),
            prisma.customerFeedbackResponse.findMany({
                where,
                orderBy: { submittedAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                // serializer: field allowlist — ไม่ส่ง Prisma object ทั้งแถว และไม่แตะ relation contact
                select: {
                    id: true,
                    refCode: true,
                    kind: true,
                    targetType: true,
                    employeeLabelSnapshot: true,
                    stationLabelSnapshot: true,
                    overallRating: true,
                    reasonKeys: true,
                    incidentKey: true,
                    dangerStatus: true,
                    noDetail: true,
                    comment: true,
                    wantsFollowUp: true,
                    validity: true,
                    abuseReasons: true,
                    language: true,
                    surveyVersion: true,
                    submittedAt: true,
                },
            }),
        ]);

        return NextResponse.json({ responses, total, page, pageSize });
    } catch (error) {
        console.error("Error listing responses:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
