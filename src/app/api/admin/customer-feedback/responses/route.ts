import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
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
        const { hasPermission } = await import("@/lib/permissions");
        const canViewIncident = access.ctx.role === "ADMIN" || (await hasPermission(access.ctx.role, "customer_feedback.view_incident"));

        const url = request.nextUrl;
        const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
        const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(url.searchParams.get("pageSize") ?? 20)));
        const stationId = url.searchParams.get("stationId") ?? scope.stationId ?? undefined;
        const kind = url.searchParams.get("kind");
        const validity = url.searchParams.get("validity");
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        const where: import("@prisma/client").Prisma.CustomerFeedbackResponseWhereInput = {
            ...(stationId ? { stationId } : {}),
            ...(kind === "STANDARD" || kind === "INCIDENT" ? { kind } : {}),
            ...(validity && ["VALID", "SUSPECTED", "HIDDEN", "TEST"].includes(validity) ? { validity: validity as "VALID" | "SUSPECTED" | "HIDDEN" | "TEST" } : {}),
            ...(from || to
                ? {
                      submittedAt: {
                          ...(from ? { gte: new Date(from) } : {}),
                          ...(to ? { lte: new Date(`${to}T23:59:59+07:00`) } : {}),
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
