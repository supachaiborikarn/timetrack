import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { summarizeRatings, MIN_EMPLOYEE_SAMPLE } from "@/lib/customer-feedback/metrics";
import { getReasonOwner } from "@/lib/customer-feedback/questions";

/**
 * GET /api/admin/customer-feedback/summary
 * KPI และกราฟตาม filter — MANAGER จำกัด stationId ฝั่ง server
 * ตัดข้อมูล incident ออกเมื่อไม่มี customer_feedback.view_incident
 */

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.view_dashboard");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const canViewIncident = access.ctx.role === "ADMIN" || access.ctx.role === "HR" ||
            (await import("@/lib/permissions")).hasPermission(access.ctx.role, "customer_feedback.view_incident");

        const url = request.nextUrl;
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const stationId = url.searchParams.get("stationId") ?? scope.stationId ?? undefined;
        const targetType = url.searchParams.get("targetType") === "STATION" ? "STATION" : url.searchParams.get("targetType") === "EMPLOYEE" ? "EMPLOYEE" : undefined;

        const dateFrom = from ? new Date(from) : new Date(Date.now() - 30 * 86400 * 1000);
        const dateTo = to ? new Date(`${to}T23:59:59+07:00`) : new Date();

        const where: import("@prisma/client").Prisma.CustomerFeedbackResponseWhereInput = {
            kind: "STANDARD",
            validity: "VALID" as const,
            submittedAt: { gte: dateFrom, lte: dateTo },
            ...(stationId ? { stationId } : {}),
            ...(targetType ? { targetType } : {}),
        };

        const responses = await prisma.customerFeedbackResponse.findMany({
            where,
            select: {
                id: true,
                stationId: true,
                employeeId: true,
                targetType: true,
                overallRating: true,
                reasonKeys: true,
                submittedAt: true,
                stationLabelSnapshot: true,
                employeeLabelSnapshot: true,
            },
            take: 5000,
        });

        const ratings = responses.map((r) => r.overallRating!).filter((r) => r !== null);
        const summary = summarizeRatings(ratings);

        // แนวโน้มรายวัน (7 วันล่าสุดของช่วง)
        const daily = new Map<string, number[]>();
        for (const r of responses) {
            const key = new Date(r.submittedAt.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
            const arr = daily.get(key) ?? [];
            arr.push(r.overallRating!);
            daily.set(key, arr);
        }
        const trend = [...daily.entries()]
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, rs]) => ({ date, count: rs.length, average: rs.reduce((a, b) => a + b, 0) / rs.length }));

        // สาเหตุ แยกเจ้าของปัญหา
        const reasonCounts = new Map<string, number>();
        for (const r of responses) {
            for (const k of r.reasonKeys) reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
        }
        const reasons = [...reasonCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => ({ key, count, owner: getReasonOwner(key) }));

        // ตารางสถานี
        const byStation = new Map<string, { name: string; ratings: number[] }>();
        for (const r of responses) {
            const key = r.stationId ?? "unknown";
            const entry = byStation.get(key) ?? { name: r.stationLabelSnapshot ?? key, ratings: [] };
            entry.ratings.push(r.overallRating!);
            byStation.set(key, entry);
        }
        const stationsTable = [...byStation.entries()].map(([id, v]) => ({
            id,
            name: v.name,
            ...summarizeRatings(v.ratings),
        })).sort((a, b) => b.count - a.count);

        // ตารางพนักงาน — แสดงเฉพาะคนที่ถึง minimum sample และใช้ข้อมูลจาก QR พนักงานเท่านั้น
        const byEmployee = new Map<string, { name: string; ratings: number[] }>();
        for (const r of responses) {
            if (r.targetType !== "EMPLOYEE" || !r.employeeId) continue;
            const entry = byEmployee.get(r.employeeId) ?? { name: r.employeeLabelSnapshot ?? r.employeeId, ratings: [] };
            entry.ratings.push(r.overallRating!);
            byEmployee.set(r.employeeId, entry);
        }
        const employeesTable = [...byEmployee.entries()]
            .map(([id, v]) => ({ id, ...summarizeRatings(v.ratings), name: v.name }))
            .filter((e) => e.count >= MIN_EMPLOYEE_SAMPLE)
            .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

        // เคสค้าง
        const openCases = await prisma.customerFeedbackCase.count({
            where: {
                status: { in: ["OPEN", "IN_PROGRESS"] },
                ...(stationId ? { stationId } : {}),
            },
        });

        // suspected rate
        const [validCount, suspectedCount] = await Promise.all([
            prisma.customerFeedbackResponse.count({ where: { ...where, validity: "VALID" } }),
            prisma.customerFeedbackResponse.count({ where: { ...where, validity: "SUSPECTED" } }),
        ]);

        const payload: Record<string, unknown> = {
            summary: { ...summary, suspectedCount, validCount, openCases },
            trend,
            reasons,
            stations: stationsTable,
            employees: employeesTable,
            minimumEmployeeSample: MIN_EMPLOYEE_SAMPLE,
            disclaimer: "แบบประเมิน QR เป็นข้อมูลจากลูกค้าที่เลือกตอบและไม่แทนลูกค้าทุกคน",
        };

        if (canViewIncident) {
            const incidentCount = await prisma.customerFeedbackResponse.count({
                where: {
                    kind: "INCIDENT",
                    submittedAt: { gte: dateFrom, lte: dateTo },
                    ...(stationId ? { stationId } : {}),
                },
            });
            payload.incidentCount = incidentCount;
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Error building summary:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
