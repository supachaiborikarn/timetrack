import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reviewPeriodDayBounds } from "@/lib/customer-feedback/access";
import { summarizeEmployeeRubric, type EmployeeScoreResponseInput } from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS, EMPLOYEE_SCORE_TOTAL } from "@/lib/customer-feedback/questions";
import { startOfDayBangkok } from "@/lib/date-utils";
import { calculateEmployeePerformance } from "@/lib/employee-performance";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";
import {
    bangkokDateKey,
    calculateChineseNewYearBonusPreview,
    calculateDisciplineSafetyPoints,
    calculateEvaluationCooperationPoints,
    CHINESE_NEW_YEAR_BONUS_PERIOD_CONFIG_KEY,
    CHINESE_NEW_YEAR_BONUS_WEIGHTS,
} from "@/lib/chinese-new-year-bonus";

function round1(value: number): number {
    return Math.round((value + Number.EPSILON) * 10) / 10;
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
        if (!user.department?.isFrontYard) {
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

        const [attendances, assignments, leaves, feedbackResponses, submission, safetyCaseCount] = await Promise.all([
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
                        submittedAt: true,
                        answers: {
                            where: { questionKey: { in: [...EMPLOYEE_SCORE_QUESTION_KEYS] } },
                            select: { questionKey: true, choiceValues: true },
                        },
                    },
                })
                : Promise.resolve([]),
            prisma.reviewSubmission.findUnique({
                where: { employeeId_periodId: { employeeId: userId, periodId: period.id } },
                select: { rating: true, status: true, completedAt: true },
            }),
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

        const rubricResponses: EmployeeScoreResponseInput[] = feedbackResponses.map((response) => ({
            responseId: response.id,
            submittedAt: response.submittedAt,
            answers: response.answers.flatMap((answer) => {
                const value = answer.choiceValues[0];
                return value === "YES" || value === "NO" || value === "UNSURE"
                    ? [{ questionKey: answer.questionKey, answer: value }]
                    : [];
            }),
        }));
        const customerRubric = summarizeEmployeeRubric(rubricResponses);

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

        const assignmentByDay = new Map(assignments.map((assignment) => [bangkokDateKey(assignment.date), assignment]));
        const workedDayKeys = attendances.flatMap((attendance) => {
            if (!attendance.checkInTime) return [];
            const key = bangkokDateKey(attendance.date);
            const assignment = assignmentByDay.get(key);
            return assignment && !assignment.isDayOff ? [key] : [];
        });

        const attendancePoints = performance.counts.requiredDays > 0
            ? round1(performance.components.presence)
            : null;
        const customerQualityPoints = customerRubric.meetsMinimumSample && customerRubric.score64 != null
            ? round1((customerRubric.score64 / EMPLOYEE_SCORE_TOTAL) * CHINESE_NEW_YEAR_BONUS_WEIGHTS.customerQuality)
            : null;
        const cooperationPoints = calculateEvaluationCooperationPoints({
            workedDayKeys,
            evaluationSubmittedAts: feedbackResponses.map((response) => response.submittedAt),
        });
        const supervisorRating = submission?.rating;
        const supervisorSopPoints = supervisorRating != null
            && Number.isInteger(supervisorRating)
            && supervisorRating >= 1
            && supervisorRating <= 5
            ? round1((supervisorRating / 5) * CHINESE_NEW_YEAR_BONUS_WEIGHTS.supervisorSop)
            : null;
        const disciplineSafetyPoints = performance.counts.presentDays > 0
            ? calculateDisciplineSafetyPoints({
                presencePoints: performance.components.presence,
                punctualityPoints: performance.components.punctuality,
                completionPoints: performance.components.completion,
                breakDisciplinePoints: performance.components.breakDiscipline,
            })
            : null;

        const preview = calculateChineseNewYearBonusPreview({
            attendancePoints,
            customerQualityPoints,
            cooperationPoints,
            supervisorSopPoints,
            disciplineSafetyPoints,
            periodClosed: Boolean(period.closedAt) && !period.isActive,
            safetyReviewRequired: safetyCaseCount > 0,
        });

        return NextResponse.json({
            enabled: true,
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
                customerQuality: customerQualityPoints == null ? "กำลังรวบรวมข้อมูลเสียงลูกค้า" : "คะแนนเสียงลูกค้าพร้อมใช้แล้ว",
                cooperation: cooperationPoints == null ? "รอวันทำงานในรอบนี้" : "คำนวณจากความสม่ำเสมอของภารกิจรายวัน",
                supervisorSop: supervisorSopPoints == null ? "รอหัวหน้างานบันทึกคะแนน" : "หัวหน้างานประเมินแล้ว",
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
