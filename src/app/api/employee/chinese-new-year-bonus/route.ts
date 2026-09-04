import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFuelCashier } from "@/lib/cashier-employee-scope";
import { reviewPeriodDayBounds } from "@/lib/customer-feedback/access";
import { summarizeEmployeeRubric, type EmployeeScoreResponseInput } from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS, EMPLOYEE_SCORE_TOTAL } from "@/lib/customer-feedback/questions";
import { startOfDayBangkok } from "@/lib/date-utils";
import { calculateEmployeePerformance } from "@/lib/employee-performance";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";
import {
    averageAvailableTeamPoints,
    bangkokDateKey,
    calculateChineseNewYearBonusPreview,
    calculateCompleteTeamCustomerQualityPoints,
    calculateDisciplineSafetyPoints,
    calculateEvaluationCooperationPoints,
    CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY,
    getChineseNewYearBonusWeights,
    type ChineseNewYearBonusProfile,
} from "@/lib/chinese-new-year-bonus";

function round1(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
}

type FeedbackRow = {
    id: string;
    employeeId?: string | null;
    submittedAt: Date;
    answers: Array<{ questionKey: string; choiceValues: string[] }>;
};

function toRubricResponse(response: FeedbackRow): EmployeeScoreResponseInput {
    return {
        responseId: response.id,
        submittedAt: response.submittedAt,
        answers: response.answers.flatMap((answer) => {
            const value = answer.choiceValues[0];
            return value === "YES" || value === "NO" || value === "UNSURE"
                ? [{ questionKey: answer.questionKey, answer: value }]
                : [];
        }),
    };
}

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const [user, periodConfig] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    isActive: true,
                    employeeStatus: true,
                    role: true,
                    employeeId: true,
                    stationId: true,
                    station: { select: { code: true } },
                    department: { select: { isFrontYard: true } },
                },
            }),
            prisma.systemConfig.findUnique({
                where: { key: CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY },
                select: { value: true },
            }),
        ]);

        if (!user?.isActive || user.employeeStatus !== "ACTIVE") {
            return NextResponse.json({ error: "บัญชีพนักงานถูกปิดใช้งาน" }, { status: 403 });
        }

        const isFrontYardEmployee = user.role === "EMPLOYEE" && Boolean(user.department?.isFrontYard);
        const isEligibleFuelCashier = isFuelCashier(user) && Boolean(user.stationId);
        const profile: ChineseNewYearBonusProfile | null = isFrontYardEmployee
            ? "FRONT_YARD"
            : isEligibleFuelCashier
                ? "FUEL_CASHIER"
                : null;
        if (!profile) {
            return NextResponse.json({ enabled: false, reason: "NOT_ELIGIBLE" });
        }
        if (!periodConfig?.value) {
            return NextResponse.json({ enabled: false, reason: "NO_PERIOD" });
        }

        const period = await prisma.reviewPeriod.findUnique({
            where: { id: periodConfig.value },
            select: {
                id: true,
                title: true,
                startDate: true,
                endDate: true,
                isActive: true,
                closedAt: true,
            },
        });
        if (!period) {
            return NextResponse.json({ enabled: false, reason: "NO_PERIOD" });
        }

        const now = new Date();
        const periodFrom = reviewPeriodDayBounds(period.startDate).dayStart;
        const periodEndBounds = reviewPeriodDayBounds(period.endDate);
        const periodToExclusive = periodEndBounds.nextDayStart;
        const today = startOfDayBangkok(now);
        const workTo = new Date(Math.min(periodEndBounds.dayStart.getTime(), today.getTime()));
        const feedbackToExclusive = new Date(Math.min(periodToExclusive.getTime(), now.getTime()));
        const hasWorkRange = periodFrom.getTime() <= workTo.getTime();
        const hasFeedbackRange = periodFrom.getTime() < feedbackToExclusive.getTime();

        const [attendances, assignments, leaves, submission, teamMembers] = await Promise.all([
            hasWorkRange
                ? prisma.attendance.findMany({
                    where: { userId, date: { gte: periodFrom, lte: workTo } },
                    select: {
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
                    where: { userId, date: { gte: periodFrom, lte: workTo } },
                    select: {
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
                        userId,
                        status: { in: ["APPROVED", "PENDING"] },
                        startDate: { lte: workTo },
                        endDate: { gte: periodFrom },
                    },
                    select: { startDate: true, endDate: true, status: true },
                })
                : Promise.resolve([]),
            prisma.reviewSubmission.findUnique({
                where: { employeeId_periodId: { employeeId: userId, periodId: period.id } },
                select: { rating: true, status: true, completedAt: true },
            }),
            profile === "FUEL_CASHIER" && user.stationId
                ? prisma.user.findMany({
                    where: {
                        stationId: user.stationId,
                        isActive: true,
                        employeeStatus: "ACTIVE",
                        role: "EMPLOYEE",
                        department: { is: { isFrontYard: true } },
                    },
                    select: { id: true },
                })
                : Promise.resolve([]),
        ]);

        const performance = calculateEmployeePerformance({
            assignments,
            attendances,
            leaves,
            customer: {
                applicable: false,
                score64: null,
                responseCount: 0,
                minimumSample: 0,
                meetsMinimumSample: false,
            },
            stationCode: user.station?.code,
            referenceTime: now,
            attendanceGraceMinutes: DEFAULT_ATTENDANCE_GRACE_MINUTES,
        });

        const weights = getChineseNewYearBonusWeights(profile);
        const attendancePoints = performance.counts.requiredDays > 0
            ? round1(performance.components.presence)
            : null;
        const disciplineSafetyPoints = performance.counts.presentDays > 0
            ? calculateDisciplineSafetyPoints({
                presencePoints: performance.components.presence,
                punctualityPoints: performance.components.punctuality,
                completionPoints: performance.components.completion,
                breakDisciplinePoints: performance.components.breakDiscipline,
                maxPoints: weights.disciplineSafety,
            })
            : null;
        const supervisorRating = submission?.rating;
        const supervisorSopPoints = supervisorRating != null
            && Number.isInteger(supervisorRating)
            && supervisorRating >= 1
            && supervisorRating <= 5
            ? round1((supervisorRating / 5) * weights.supervisorSop)
            : null;

        let customerQualityPoints: number | null = null;
        let cooperationPoints: number | null = null;
        let safetyCaseCount = 0;

        if (profile === "FRONT_YARD") {
            const [feedbackResponses, openSafetyCaseCount] = await Promise.all([
                hasFeedbackRange
                    ? prisma.customerFeedbackResponse.findMany({
                        where: {
                            kind: "STANDARD",
                            targetType: "EMPLOYEE",
                            employeeId: userId,
                            surveyVersion: { in: ["employee-v3", "employee-v4"] },
                            validity: "VALID",
                            submittedAt: { gte: periodFrom, lt: feedbackToExclusive },
                        },
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
                hasFeedbackRange
                    ? prisma.customerFeedbackCase.count({
                        where: {
                            status: { in: ["OPEN", "IN_PROGRESS"] },
                            response: {
                                employeeId: userId,
                                validity: "VALID",
                                submittedAt: { gte: periodFrom, lt: feedbackToExclusive },
                                OR: [
                                    { reasonKeys: { has: "employee_safety" } },
                                    { incidentKey: "safety_accident" },
                                ],
                            },
                        },
                    })
                    : Promise.resolve(0),
            ]);
            safetyCaseCount = openSafetyCaseCount;

            const rubric = summarizeEmployeeRubric(feedbackResponses.map((response) => toRubricResponse(response)));
            customerQualityPoints = rubric.meetsMinimumSample && rubric.score64 != null
                ? round1((rubric.score64 / EMPLOYEE_SCORE_TOTAL) * weights.customerQuality)
                : null;

            const assignmentByDay = new Map(assignments.map((assignment) => [bangkokDateKey(assignment.date), assignment]));
            const workedDayKeys = attendances.flatMap((attendance) => {
                if (!attendance.checkInTime) return [];
                const key = bangkokDateKey(attendance.date);
                const assignment = assignmentByDay.get(key);
                return assignment && !assignment.isDayOff ? [key] : [];
            });
            cooperationPoints = calculateEvaluationCooperationPoints({
                workedDayKeys,
                evaluationSubmittedAts: feedbackResponses.map((response) => response.submittedAt),
                maxPoints: weights.cooperation,
            });
        } else {
            const teamIds = teamMembers.map((member) => member.id);
            const [teamFeedbackResponses, teamAssignments, teamAttendances] = teamIds.length > 0
                ? await Promise.all([
                    hasFeedbackRange
                        ? prisma.customerFeedbackResponse.findMany({
                            where: {
                                kind: "STANDARD",
                                targetType: "EMPLOYEE",
                                employeeId: { in: teamIds },
                                surveyVersion: { in: ["employee-v3", "employee-v4"] },
                                validity: "VALID",
                                submittedAt: { gte: periodFrom, lt: feedbackToExclusive },
                            },
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
                    hasWorkRange
                        ? prisma.shiftAssignment.findMany({
                            where: { userId: { in: teamIds }, date: { gte: periodFrom, lte: workTo } },
                            select: { userId: true, date: true, isDayOff: true },
                        })
                        : Promise.resolve([]),
                    hasWorkRange
                        ? prisma.attendance.findMany({
                            where: { userId: { in: teamIds }, date: { gte: periodFrom, lte: workTo } },
                            select: { userId: true, date: true, checkInTime: true },
                        })
                        : Promise.resolve([]),
                ])
                : [[], [], []] as const;

            const responsesByEmployee = new Map<string, FeedbackRow[]>();
            for (const response of teamFeedbackResponses) {
                if (!response.employeeId) continue;
                const list = responsesByEmployee.get(response.employeeId) ?? [];
                list.push(response);
                responsesByEmployee.set(response.employeeId, list);
            }

            const teamScores64 = teamMembers.map((member) => {
                const rubric = summarizeEmployeeRubric((responsesByEmployee.get(member.id) ?? []).map(toRubricResponse));
                return rubric.meetsMinimumSample ? rubric.score64 : null;
            });
            customerQualityPoints = calculateCompleteTeamCustomerQualityPoints({
                memberScores64: teamScores64,
                rubricTotal: EMPLOYEE_SCORE_TOTAL,
                maxPoints: weights.customerQuality,
            });

            const teamAssignmentByDay = new Map(
                teamAssignments.map((assignment) => [`${assignment.userId}::${bangkokDateKey(assignment.date)}`, assignment]),
            );
            const memberCooperationPoints = teamMembers.map((member) => {
                const workedDayKeys = teamAttendances.flatMap((attendance) => {
                    if (attendance.userId !== member.id || !attendance.checkInTime) return [];
                    const dayKey = bangkokDateKey(attendance.date);
                    const assignment = teamAssignmentByDay.get(`${member.id}::${dayKey}`);
                    return assignment && !assignment.isDayOff ? [dayKey] : [];
                });
                return calculateEvaluationCooperationPoints({
                    workedDayKeys,
                    evaluationSubmittedAts: (responsesByEmployee.get(member.id) ?? []).map((response) => response.submittedAt),
                    maxPoints: weights.cooperation,
                });
            });
            cooperationPoints = averageAvailableTeamPoints(memberCooperationPoints);
        }

        const preview = calculateChineseNewYearBonusPreview({
            profile,
            attendancePoints,
            customerQualityPoints,
            cooperationPoints,
            supervisorSopPoints,
            disciplineSafetyPoints,
            periodClosed: Boolean(period.closedAt) && !period.isActive,
            safetyReviewRequired: safetyCaseCount > 0,
        });

        const isCashier = profile === "FUEL_CASHIER";
        return NextResponse.json({
            enabled: true,
            profile,
            period: {
                id: period.id,
                title: period.title,
                startDate: periodFrom.toISOString(),
                endDate: periodEndBounds.dayStart.toISOString(),
                closed: Boolean(period.closedAt) && !period.isActive,
            },
            preview,
            // ห้ามส่ง exact customer count / daily target ไปหน้าพนักงาน ตาม privacy/fair-play decision เดิม
            messages: {
                customerQuality: customerQualityPoints == null
                    ? isCashier ? "กำลังรวบรวมข้อมูลคุณภาพบริการให้ครบทั้งทีม" : "กำลังรวบรวมข้อมูลเสียงลูกค้า"
                    : isCashier ? "คะแนนคุณภาพบริการของทีมพร้อมใช้แล้ว" : "คะแนนเสียงลูกค้าพร้อมใช้แล้ว",
                cooperation: cooperationPoints == null
                    ? isCashier ? "รอวันทำงานของทีมในรอบนี้" : "รอวันทำงานในรอบนี้"
                    : isCashier ? "คำนวณจากความสม่ำเสมอของทีมตามวันทำงานจริง" : "คำนวณจากความสม่ำเสมอของภารกิจรายวัน",
                supervisorSop: supervisorSopPoints == null
                    ? isCashier ? "รอหัวหน้างานประเมินงานเสมียน / SOP" : "รอหัวหน้างานบันทึกคะแนน"
                    : isCashier ? "หัวหน้างานประเมินงานเสมียนแล้ว" : "หัวหน้างานประเมินแล้ว",
                disciplineSafety: safetyCaseCount > 0
                    ? "มีเคสความปลอดภัยที่ต้องตรวจสอบก่อนสรุปผล"
                    : "คำนวณวินัยจากตรงเวลา อยู่ครบกะ และเวลาพัก",
            },
        });
    } catch (error) {
        console.error("[employee/chinese-new-year-bonus]", error instanceof Error ? error.message : "unknown error");
        return NextResponse.json({ error: "โหลดคาดการณ์แต๊ะเอียไม่สำเร็จ" }, { status: 500 });
    }
}
