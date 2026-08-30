import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getFeedbackAccessContext,
    getStationScope,
    parseFeedbackDateRange,
    requireFeedbackPermission,
    resolveFeedbackStationId,
} from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { summarizeEmployeeRubric, type EmployeeScoreResponseInput } from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS, EMPLOYEE_SCORE_TOTAL } from "@/lib/customer-feedback/questions";

/**
 * GET /api/admin/customer-feedback/employee-scores
 * คะแนนบริการหน้าลาน employee-v3 ตาม rubric 64 คะแนน
 * ใช้เฉพาะ STANDARD + VALID; TEST/SUSPECTED/HIDDEN ไม่เข้าคะแนน
 */
export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const permission = await requireFeedbackPermission(access.ctx, "customer_feedback.view_dashboard");
        if (!permission.ok) return NextResponse.json({ error: permission.message }, { status: permission.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

        const dateRange = parseFeedbackDateRange(
            request.nextUrl.searchParams.get("from"),
            request.nextUrl.searchParams.get("to")
        );
        if (!dateRange.ok) return NextResponse.json({ error: dateRange.message }, { status: 400 });
        const stationId = resolveFeedbackStationId(scope.stationId, request.nextUrl.searchParams.get("stationId"));
        const now = new Date();
        const from = dateRange.value.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const toExclusive = dateRange.value.toExclusive ?? now;
        // Monthly target is always the current Bangkok calendar month, independent from score date filters.
        const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
        const monthlyYear = bangkokNow.getUTCFullYear();
        const monthlyMonth = bangkokNow.getUTCMonth();
        const monthlyFrom = new Date(Date.UTC(monthlyYear, monthlyMonth, 1) - 7 * 60 * 60 * 1000);
        const monthlyToExclusive = new Date(Date.UTC(monthlyYear, monthlyMonth + 1, 1) - 7 * 60 * 60 * 1000);
        const monthlyEvaluationTarget = 60;

        const responses = await prisma.customerFeedbackResponse.findMany({
            where: {
                kind: "STANDARD",
                targetType: "EMPLOYEE",
                surveyVersion: "employee-v3",
                validity: "VALID",
                employeeId: { not: null },
                submittedAt: { gte: from, lt: toExclusive },
                ...(stationId ? { stationId } : {}),
            },
            orderBy: { submittedAt: "asc" },
            select: {
                id: true,
                employeeId: true,
                employeeLabelSnapshot: true,
                stationId: true,
                stationLabelSnapshot: true,
                submittedAt: true,
                answers: {
                    where: { questionKey: { in: [...EMPLOYEE_SCORE_QUESTION_KEYS] } },
                    select: { questionKey: true, choiceValues: true },
                },
            },
        });

        const monthlyResponses = await prisma.customerFeedbackResponse.findMany({
            where: {
                kind: "STANDARD",
                targetType: "EMPLOYEE",
                surveyVersion: "employee-v3",
                validity: "VALID",
                employeeId: { not: null },
                submittedAt: { gte: monthlyFrom, lt: monthlyToExclusive },
                ...(stationId ? { stationId } : {}),
            },
            select: { employeeId: true },
        });
        // Include active frontyard employees with zero responses so admins can see 0 / 60 rather than losing them from the table.
        const activeEmployees = await prisma.user.findMany({
            where: {
                isActive: true,
                ...(stationId ? { stationId } : {}),
            },
            select: {
                id: true,
                name: true,
                nickName: true,
                stationId: true,
                station: { select: { name: true } },
                department: { select: { isFrontYard: true } },
            },
        });
        const monthlyCountByEmployee = new Map<string, number>();
        for (const response of monthlyResponses) {
            if (!response.employeeId) continue;
            monthlyCountByEmployee.set(response.employeeId, (monthlyCountByEmployee.get(response.employeeId) ?? 0) + 1);
        }

        type Bucket = {
            employeeId: string;
            label: string;
            stationId: string | null;
            stationLabel: string | null;
            latestAt: Date | null;
            responses: EmployeeScoreResponseInput[];
        };
        const grouped = new Map<string, Bucket>();
        for (const response of responses) {
            if (!response.employeeId) continue;
            const bucket = grouped.get(response.employeeId) ?? {
                employeeId: response.employeeId,
                label: response.employeeLabelSnapshot ?? "พนักงาน",
                stationId: response.stationId,
                stationLabel: response.stationLabelSnapshot,
                latestAt: response.submittedAt,
                responses: [],
            };
            if (!bucket.latestAt || response.submittedAt >= bucket.latestAt) {
                bucket.label = response.employeeLabelSnapshot ?? bucket.label;
                bucket.stationId = response.stationId;
                bucket.stationLabel = response.stationLabelSnapshot;
                bucket.latestAt = response.submittedAt;
            }
            bucket.responses.push({
                responseId: response.id,
                answers: response.answers.flatMap((answer) => {
                    const value = answer.choiceValues[0];
                    return value === "YES" || value === "NO" || value === "UNSURE"
                        ? [{ questionKey: answer.questionKey, answer: value }]
                        : [];
                }),
            });
            grouped.set(response.employeeId, bucket);
        }

        for (const employee of activeEmployees) {
            if (!employee.department?.isFrontYard || grouped.has(employee.id)) continue;
            grouped.set(employee.id, {
                employeeId: employee.id,
                label: employee.nickName?.trim() || employee.name || "พนักงาน",
                stationId: employee.stationId,
                stationLabel: employee.station?.name ?? null,
                latestAt: null,
                responses: [],
            });
        }

        const employees = [...grouped.values()]
            .map((bucket) => ({
                employeeId: bucket.employeeId,
                label: bucket.label,
                stationId: bucket.stationId,
                stationLabel: bucket.stationLabel,
                latestResponseAt: bucket.latestAt?.toISOString() ?? null,
                monthlyEvaluationCount: monthlyCountByEmployee.get(bucket.employeeId) ?? 0,
                ...summarizeEmployeeRubric(bucket.responses),
            }))
            .sort((a, b) => {
                if (a.score64 === null && b.score64 !== null) return 1;
                if (a.score64 !== null && b.score64 === null) return -1;
                if (a.score64 !== null && b.score64 !== null && b.score64 !== a.score64) return b.score64 - a.score64;
                return a.label.localeCompare(b.label, "th");
            });

        return NextResponse.json({
            rubricVersion: "employee-v3",
            totalPoints: EMPLOYEE_SCORE_TOTAL,
            from: from.toISOString(),
            toExclusive: toExclusive.toISOString(),
            monthlyEvaluationTarget,
            monthlyFrom: monthlyFrom.toISOString(),
            monthlyToExclusive: monthlyToExclusive.toISOString(),
            employees,
        });
    } catch (error) {
        console.error("[feedback/employee-scores]", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "โหลดคะแนนพนักงานไม่สำเร็จ" }, { status: 500 });
    }
}
