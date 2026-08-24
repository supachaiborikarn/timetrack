import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    canViewFeedbackIncident,
    getFeedbackAccessContext,
    getStationScope,
    parseFeedbackDateRange,
    parseOptionalFeedbackFilter,
    requireFeedbackPermission,
    resolveFeedbackStationId,
} from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * GET /api/admin/customer-feedback/export — export CSV ที่ตัดข้อมูลติดต่อ
 * abuseReasons และข้อมูลภายในออก พร้อมป้องกัน formula injection
 */

function escapeCsvValue(value: string): string {
    // ป้องกัน formula injection ในค่าที่ขึ้นต้นด้วยเครื่องหมายพิเศษ
    let safe = value;
    if (/^[=+\-@\t\r]/.test(safe)) {
        safe = `'${safe}`;
    }
    return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.export");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const url = request.nextUrl;
        const dateRange = parseFeedbackDateRange(url.searchParams.get("from"), url.searchParams.get("to"));
        if (!dateRange.ok) return NextResponse.json({ error: dateRange.message }, { status: 400 });
        const kind = parseOptionalFeedbackFilter(url.searchParams.get("kind"), ["STANDARD", "INCIDENT"] as const, "kind");
        if (!kind.ok) return NextResponse.json({ error: kind.message }, { status: 400 });
        const validity = parseOptionalFeedbackFilter(
            url.searchParams.get("validity"),
            ["VALID", "SUSPECTED", "HIDDEN", "TEST"] as const,
            "validity"
        );
        if (!validity.ok) return NextResponse.json({ error: validity.message }, { status: 400 });
        if (kind.value === "INCIDENT" && !canViewIncident) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูเหตุเร่งด่วน" }, { status: 403 });
        }
        const stationId = resolveFeedbackStationId(scope.stationId, url.searchParams.get("stationId"));

        const responses = await prisma.customerFeedbackResponse.findMany({
            where: {
                submittedAt: {
                    gte: dateRange.value.from ?? new Date(Date.now() - 90 * 86400 * 1000),
                    ...(dateRange.value.toExclusive ? { lt: dateRange.value.toExclusive } : {}),
                },
                ...(stationId ? { stationId } : {}),
                validity: validity.value ?? { in: ["VALID", "SUSPECTED", "HIDDEN"] },
                ...(kind.value ? { kind: kind.value } : {}),
                ...(canViewIncident ? {} : { kind: "STANDARD" as const }),
            },
            orderBy: { submittedAt: "desc" },
            take: 10000,
            // export ปกติตัดข้อมูลติดต่อ (ไม่ select relation contact เลย)
            select: {
                refCode: true,
                kind: true,
                targetType: true,
                employeeLabelSnapshot: true,
                stationLabelSnapshot: true,
                overallRating: true,
                reasonKeys: true,
                comment: true,
                validity: true,
                language: true,
                surveyVersion: true,
                submittedAt: true,
            },
        });

        const header = ["ref_code", "kind", "target_type", "employee_label", "station_label", "overall_rating", "reason_keys", "comment", "validity", "language", "survey_version", "submitted_at"];
        const rows = responses.map((r) =>
            [
                r.refCode,
                r.kind,
                r.targetType,
                r.employeeLabelSnapshot ?? "",
                r.stationLabelSnapshot ?? "",
                r.overallRating?.toString() ?? "",
                r.reasonKeys.join(";"),
                r.comment ?? "",
                r.validity,
                r.language,
                r.surveyVersion,
                r.submittedAt.toISOString(),
            ]
                .map((v) => escapeCsvValue(v))
                .join(",")
        );

        const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");
        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="customer-feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
            },
        });
    } catch (error) {
        console.error("Error exporting feedback:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
