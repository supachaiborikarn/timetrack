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
import { startOfDayBangkok } from "@/lib/date-utils";
import {
    calculateEmployeePerformance,
    PERFORMANCE_WEIGHTS,
    WORK_PERFORMANCE_TOTAL,
} from "@/lib/employee-performance";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";

/**
 * GET /api/admin/customer-feedback/employee-scores
 * อันดับผลงานรวม: เวลาทำงาน 60 + ลูกค้า 40
 * ลูกค้าใช้เฉพาะ STANDARD + VALID; TEST/SUSPECTED/HIDDEN ไม่เข้าคะแนน
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

        const feedbackToExclusive = new Date(Math.min(toExclusive.getTime(), now.getTime()));
        const hasFeedbackRange = from.getTime() < feedbackToExclusive.getTime();
        const [responses, monthlyResponses, activeEmployees] = await Promise.all([
            hasFeedbackRange
                ? prisma.customerFeedbackResponse.findMany({
                    where: {
                        kind: "STANDARD",
                        targetType: "EMPLOYEE",
                        surveyVersion: { in: ["employee-v3", "employee-v4"] },
                        validity: "VALID",
                        employeeId: { not: null },
                        submittedAt: { gte: from, lt: feedbackToExclusive },
                        ...(stationId ? { stationId } : {}),
                    },
                    orderBy: { submittedAt: "asc" },
                    select: {
                        id: true,
                        employeeId: true,
                        submittedAt: true,
                        answers: {
                            where: { questionKey: { in: [...EMPLOYEE_SCORE_QUESTION_KEYS] } },
                            select: { questionKey: true, choiceValues: true },
                        },
                    },
                })
                : Promise.resolve([]),
            prisma.customerFeedbackResponse.findMany({
                where: {
                    kind: "STANDARD",
                    targetType: "EMPLOYEE",
                    surveyVersion: { in: ["employee-v3", "employee-v4"] },
                    validity: "VALID",
                    employeeId: { not: null },
                    submittedAt: { gte: monthlyFrom, lt: monthlyToExclusive },
                    ...(stationId ? { stationId } : {}),
                },
                select: { employeeId: true },
            }),
            prisma.user.findMany({
                where: {
                    isActive: true,
                    ...(stationId ? { stationId } : {}),
                },
                select: {
                    id: true,
                    name: true,
                    nickName: true,
                    stationId: true,
                    station: { select: { name: true, code: true } },
                    department: { select: { isFrontYard: true } },
                },
            }),
        ]);

        // อันดับนี้ใช้กับพนักงานหน้าลานที่ยังทำงานอยู่เท่านั้น เพื่อไม่ดึงพนักงานเก่ามาปนกับอันดับปัจจุบัน
        const frontYardEmployees = activeEmployees.filter((employee) => employee.department?.isFrontYard);
        const employeeIds = frontYardEmployees.map((employee) => employee.id);
        const todayBangkok = startOfDayBangkok(now);
        const selectedLastDay = startOfDayBangkok(new Date(toExclusive.getTime() - 1));
        const workTo = new Date(Math.min(selectedLastDay.getTime(), todayBangkok.getTime()));
        const hasWorkRange = employeeIds.length > 0 && from.getTime() <= workTo.getTime();
        const [attendances, assignments, leaves] = await Promise.all([
            hasWorkRange
                ? prisma.attendance.findMany({
                    where: { userId: { in: employeeIds }, date: { gte: from, lte: workTo } },
                    select: {
                        userId: true,
                        date: true,
                        checkInTime: true,
                        checkOutTime: true,
                        lateMinutes: true,
                        breakStartTime: true,
                        breakEndTime: true,
                        breakDurationMin: true,
                    },
                })
                : Promise.resolve([]),
            hasWorkRange
                ? prisma.shiftAssignment.findMany({
                    where: { userId: { in: employeeIds }, date: { gte: from, lte: workTo } },
                    select: {
                        userId: true,
                        date: true,
                        isDayOff: true,
                        shift: {
                            select: {
                                startTime: true,
                                endTime: true,
                                breakMinutes: true,
                                isNightShift: true,
                            },
                        },
                    },
                })
                : Promise.resolve([]),
            hasWorkRange
                ? prisma.leave.findMany({
                    where: {
                        userId: { in: employeeIds },
                        status: { in: ["APPROVED", "PENDING"] },
                        startDate: { lte: workTo },
                        endDate: { gte: from },
                    },
                    select: { userId: true, startDate: true, endDate: true, status: true },
                })
                : Promise.resolve([]),
        ]);
        const monthlyCountByEmployee = new Map<string, number>();
        for (const response of monthlyResponses) {
            if (!response.employeeId) continue;
            monthlyCountByEmployee.set(response.employeeId, (monthlyCountByEmployee.get(response.employeeId) ?? 0) + 1);
        }

        const grouped = new Map<string, { latestAt: Date | null; responses: EmployeeScoreResponseInput[] }>();
        for (const response of responses) {
            if (!response.employeeId) continue;
            const bucket = grouped.get(response.employeeId) ?? {
                latestAt: response.submittedAt,
                responses: [],
            };
            if (!bucket.latestAt || response.submittedAt >= bucket.latestAt) {
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

        const employees = frontYardEmployees
            .map((employee) => {
                const bucket = grouped.get(employee.id) ?? { latestAt: null, responses: [] };
                const rubric = summarizeEmployeeRubric(bucket.responses);
                const performance = calculateEmployeePerformance({
                    assignments: assignments.filter((row) => row.userId === employee.id),
                    attendances: attendances.filter((row) => row.userId === employee.id),
                    leaves: leaves.filter((row) => row.userId === employee.id),
                    customer: {
                        applicable: true,
                        score64: rubric.score64,
                        responseCount: rubric.responseCount,
                        minimumSample: rubric.minimumSample,
                        meetsMinimumSample: rubric.meetsMinimumSample,
                    },
                    stationCode: employee.station?.code,
                    referenceTime: now,
                    attendanceGraceMinutes: DEFAULT_ATTENDANCE_GRACE_MINUTES,
                });
                // คะแนนรวมใช้จัดอันดับเมื่อมีทั้งวันทำงานและตัวอย่างลูกค้าครบแล้วเท่านั้น
                const overallScore = performance.counts.requiredDays > 0 && performance.customerIncluded
                    ? performance.score
                    : null;
                const dataIssues = [
                    performance.counts.leaveAttendanceOverlapDays > 0
                        ? `ลงเวลาและลาทับกัน ${performance.counts.leaveAttendanceOverlapDays} วัน`
                        : null,
                    performance.counts.duplicateLeaveDays > 0
                        ? `รายการลาซ้ำ ${performance.counts.duplicateLeaveDays} วัน`
                        : null,
                    performance.counts.unscheduledAttendanceDays > 0
                        ? `ลงเวลาโดยไม่มีกะ ${performance.counts.unscheduledAttendanceDays} วัน`
                        : null,
                ].filter((issue): issue is string => Boolean(issue));

                return {
                    employeeId: employee.id,
                    label: employee.nickName?.trim() || employee.name || "พนักงาน",
                    stationId: employee.stationId,
                    stationLabel: employee.station?.name ?? null,
                    latestResponseAt: bucket.latestAt?.toISOString() ?? null,
                    monthlyEvaluationCount: monthlyCountByEmployee.get(employee.id) ?? 0,
                    ...rubric,
                    rank: null as number | null,
                    overallScore,
                    workPoints: performance.workPoints,
                    workPointsMax: performance.workPointsMax,
                    customerPoints: performance.customerPoints,
                    customerPointsMax: performance.customerPointsMax,
                    customerIncluded: performance.customerIncluded,
                    isProvisional: performance.isProvisional,
                    components: performance.components,
                    counts: performance.counts,
                    dataIssues,
                };
            })
            .sort((a, b) => {
                if (a.overallScore === null && b.overallScore !== null) return 1;
                if (a.overallScore !== null && b.overallScore === null) return -1;
                if (a.overallScore !== null && b.overallScore !== null && b.overallScore !== a.overallScore) {
                    return b.overallScore - a.overallScore;
                }
                if (b.workPoints !== a.workPoints) return b.workPoints - a.workPoints;
                if ((b.customerPoints ?? -1) !== (a.customerPoints ?? -1)) {
                    return (b.customerPoints ?? -1) - (a.customerPoints ?? -1);
                }
                if (b.responseCount !== a.responseCount) return b.responseCount - a.responseCount;
                return a.label.localeCompare(b.label, "th");
            });

        let previousScore: number | null = null;
        let previousRank = 0;
        for (const [index, employee] of employees.entries()) {
            if (employee.overallScore === null) continue;
            if (previousScore === null || employee.overallScore !== previousScore) previousRank = index + 1;
            employee.rank = previousRank;
            previousScore = employee.overallScore;
        }

        return NextResponse.json({
            rubricVersion: "employee-v3+employee-v4",
            totalPoints: EMPLOYEE_SCORE_TOTAL,
            overallPoints: 100,
            workPoints: WORK_PERFORMANCE_TOTAL,
            customerPoints: PERFORMANCE_WEIGHTS.customer,
            from: from.toISOString(),
            toExclusive: toExclusive.toISOString(),
            calculatedAt: now.toISOString(),
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
