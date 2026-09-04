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
import { RESTROOM_CLEANLINESS_QUESTION_KEYS } from "@/lib/customer-feedback/questions";
import {
    isRestroomScoreEligibleHousekeeper,
    summarizeRestroomScore,
    type RestroomScoreResponseInput,
} from "@/lib/customer-feedback/restroom-score";

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
            request.nextUrl.searchParams.get("to"),
        );
        if (!dateRange.ok) return NextResponse.json({ error: dateRange.message }, { status: 400 });

        const stationId = resolveFeedbackStationId(scope.stationId, request.nextUrl.searchParams.get("stationId"));
        const now = new Date();
        const from = dateRange.value.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const toExclusive = dateRange.value.toExclusive ?? now;
        const effectiveTo = new Date(Math.min(toExclusive.getTime(), now.getTime()));

        const responseWhere = {
            kind: "STANDARD" as const,
            targetType: "STATION" as const,
            surveyVersion: "restroom-v1",
            validity: "VALID" as const,
            submittedAt: { gte: from, lt: effectiveTo },
            ...(stationId ? { stationId } : {}),
        };

        const [responses, employees, unattributedCount] = await Promise.all([
            prisma.customerFeedbackResponse.findMany({
                where: { ...responseWhere, employeeId: { not: null } },
                orderBy: { submittedAt: "asc" },
                select: {
                    id: true,
                    employeeId: true,
                    submittedAt: true,
                    overallRating: true,
                    answers: {
                        where: { questionKey: { in: [...RESTROOM_CLEANLINESS_QUESTION_KEYS] } },
                        select: { questionKey: true, choiceValues: true },
                    },
                },
            }),
            prisma.user.findMany({
                where: {
                    isActive: true,
                    ...(stationId ? { stationId } : {}),
                    department: {
                        is: {
                            OR: [
                                { code: "MAID" },
                                { name: { contains: "แม่บ้าน" } },
                            ],
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    nickName: true,
                    stationId: true,
                    station: { select: { name: true, code: true } },
                },
                orderBy: [{ stationId: "asc" }, { name: "asc" }],
            }),
            prisma.customerFeedbackResponse.count({
                where: { ...responseWhere, employeeId: null },
            }),
        ]);

        const eligibleEmployees = employees.filter((employee) =>
            isRestroomScoreEligibleHousekeeper({
                stationCode: employee.station?.code ?? null,
                name: employee.name,
                nickName: employee.nickName,
            })
        );
        const eligibleEmployeeIds = new Set(eligibleEmployees.map((employee) => employee.id));
        const explicitlyExcludedEmployeeIds = new Set(
            employees
                .filter((employee) => !eligibleEmployeeIds.has(employee.id))
                .map((employee) => employee.id)
        );
        let excludedAttributedCount = 0;

        const byEmployee = new Map<string, RestroomScoreResponseInput[]>();
        const latestByEmployee = new Map<string, Date>();
        for (const response of responses) {
            if (!response.employeeId || response.overallRating === null) continue;
            if (!eligibleEmployeeIds.has(response.employeeId)) {
                if (explicitlyExcludedEmployeeIds.has(response.employeeId)) excludedAttributedCount++;
                continue;
            }
            const bucket = byEmployee.get(response.employeeId) ?? [];
            bucket.push({
                responseId: response.id,
                overallRating: response.overallRating,
                answers: response.answers.flatMap((answer) => {
                    const value = answer.choiceValues[0];
                    return value === "YES" || value === "NO" || value === "UNSURE"
                        ? [{ questionKey: answer.questionKey, answer: value }]
                        : [];
                }),
            });
            byEmployee.set(response.employeeId, bucket);
            latestByEmployee.set(response.employeeId, response.submittedAt);
        }

        const housekeepers = eligibleEmployees
            .map((employee) => ({
                employeeId: employee.id,
                label: employee.nickName?.trim() || employee.name,
                stationId: employee.stationId,
                stationLabel: employee.station?.name ?? null,
                latestResponseAt: latestByEmployee.get(employee.id)?.toISOString() ?? null,
                ...summarizeRestroomScore(byEmployee.get(employee.id) ?? []),
            }))
            .sort((a, b) => {
                if (a.score === null && b.score !== null) return 1;
                if (a.score !== null && b.score === null) return -1;
                if (a.score !== null && b.score !== null && b.score !== a.score) return b.score - a.score;
                if (b.responseCount !== a.responseCount) return b.responseCount - a.responseCount;
                return a.label.localeCompare(b.label, "th");
            });

        return NextResponse.json({
            surveyVersion: "restroom-v1",
            from: from.toISOString(),
            toExclusive: effectiveTo.toISOString(),
            calculatedAt: now.toISOString(),
            unattributedCount: unattributedCount + excludedAttributedCount,
            housekeepers,
        });
    } catch (error) {
        console.error("[feedback/restroom-scores]", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "โหลดคะแนนความสะอาดห้องน้ำไม่สำเร็จ" }, { status: 500 });
    }
}
