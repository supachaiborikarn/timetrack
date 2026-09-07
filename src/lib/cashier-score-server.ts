import { prisma } from "@/lib/prisma";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";
import { calculateEmployeePerformance } from "@/lib/employee-performance";
import { summarizeEmployeeRubric, type EmployeeScoreResponseInput } from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS, RESTROOM_CLEANLINESS_QUESTION_KEYS } from "@/lib/customer-feedback/questions";
import { summarizeRestroomScore } from "@/lib/customer-feedback/restroom-score";
import { summarizeStationScore } from "@/lib/customer-feedback/station-score";
import { calculateCompleteTeamPerformanceScore, calculateFuelCashierScore } from "@/lib/cashier-score";

import { cashierOverrideKey, resolveCashierQuality, type QualityOverride } from "@/lib/cashier-quality";

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

export async function calculateFuelCashierStationScoreForRange(params: {
    qualityWeekKey?: string;
    stationId: string;
    stationCode?: string | null;
    feedbackFrom: Date;
    feedbackToExclusive: Date;
    workFrom: Date;
    workToExclusive: Date;
    referenceTime: Date;
}) {
    const hasFeedbackRange = params.feedbackFrom < params.feedbackToExclusive;
    const hasWorkRange = params.workFrom < params.workToExclusive;

    const teamMembers = await prisma.user.findMany({
        where: {
            stationId: params.stationId,
            isActive: true,
            employeeStatus: "ACTIVE",
            role: "EMPLOYEE",
            department: { is: { isFrontYard: true } },
        },
        select: { id: true },
    });
    const teamIds = teamMembers.map((member) => member.id);

    const [teamFeedbackResponses, teamAssignments, teamAttendances, teamLeaves, stationResponses, restroomResponses] = await Promise.all([
        teamIds.length > 0 && hasFeedbackRange
            ? prisma.customerFeedbackResponse.findMany({
                where: {
                    kind: "STANDARD",
                    targetType: "EMPLOYEE",
                    employeeId: { in: teamIds },
                    surveyVersion: { in: ["employee-v3", "employee-v4"] },
                    validity: "VALID",
                    submittedAt: { gte: params.feedbackFrom, lt: params.feedbackToExclusive },
                },
                select: {
                    id: true, employeeId: true, submittedAt: true,
                    answers: {
                        where: { questionKey: { in: [...EMPLOYEE_SCORE_QUESTION_KEYS] } },
                        select: { questionKey: true, choiceValues: true },
                    },
                },
            })
            : Promise.resolve([]),
        teamIds.length > 0 && hasWorkRange
            ? prisma.shiftAssignment.findMany({
                where: { userId: { in: teamIds }, date: { gte: params.workFrom, lt: params.workToExclusive } },
                select: {
                    userId: true, date: true, isDayOff: true,
                    shift: { select: { startTime: true, endTime: true, breakMinutes: true, isNightShift: true } },
                },
            })
            : Promise.resolve([]),
        teamIds.length > 0 && hasWorkRange
            ? prisma.attendance.findMany({
                where: { userId: { in: teamIds }, date: { gte: params.workFrom, lt: params.workToExclusive } },
                select: {
                    userId: true, date: true, checkInTime: true, checkOutTime: true, lateMinutes: true,
                    breakStartTime: true, breakEndTime: true, breakDurationMin: true,
                },
            })
            : Promise.resolve([]),
        teamIds.length > 0 && hasWorkRange
            ? prisma.leave.findMany({
                where: {
                    userId: { in: teamIds },
                    status: { in: ["APPROVED", "PENDING"] },
                    startDate: { lt: params.workToExclusive },
                    endDate: { gte: params.workFrom },
                },
                select: { userId: true, startDate: true, endDate: true, status: true },
            })
            : Promise.resolve([]),
        hasFeedbackRange
            ? prisma.customerFeedbackResponse.findMany({
                where: {
                    kind: "STANDARD", targetType: "STATION", stationId: params.stationId, surveyVersion: "station-v1", validity: "VALID",
                    overallRating: { not: null }, submittedAt: { gte: params.feedbackFrom, lt: params.feedbackToExclusive },
                },
                select: { overallRating: true },
            })
            : Promise.resolve([]),
        hasFeedbackRange
            ? prisma.customerFeedbackResponse.findMany({
                where: {
                    kind: "STANDARD", targetType: "STATION", stationId: params.stationId, surveyVersion: "restroom-v1", validity: "VALID",
                    overallRating: { not: null }, submittedAt: { gte: params.feedbackFrom, lt: params.feedbackToExclusive },
                },
                select: {
                    id: true, overallRating: true,
                    answers: {
                        where: { questionKey: { in: [...RESTROOM_CLEANLINESS_QUESTION_KEYS] } },
                        select: { questionKey: true, choiceValues: true },
                    },
                },
            })
            : Promise.resolve([]),
    ]);

    const responsesByEmployee = new Map<string, FeedbackRow[]>();
    for (const response of teamFeedbackResponses) {
        if (!response.employeeId) continue;
        const list = responsesByEmployee.get(response.employeeId) ?? [];
        list.push(response);
        responsesByEmployee.set(response.employeeId, list);
    }

    const relevantMemberScores: Array<number | null> = [];
    for (const member of teamMembers) {
        const rubric = summarizeEmployeeRubric((responsesByEmployee.get(member.id) ?? []).map(toRubricResponse));
        const memberPerformance = calculateEmployeePerformance({
            assignments: teamAssignments.filter((assignment) => assignment.userId === member.id),
            attendances: teamAttendances.filter((attendance) => attendance.userId === member.id),
            leaves: teamLeaves.filter((leave) => leave.userId === member.id),
            customer: {
                applicable: true, score64: rubric.score64, responseCount: rubric.responseCount,
                minimumSample: rubric.minimumSample, meetsMinimumSample: rubric.meetsMinimumSample,
            },
            stationCode: params.stationCode,
            referenceTime: params.referenceTime,
            attendanceGraceMinutes: DEFAULT_ATTENDANCE_GRACE_MINUTES,
        });
        if (memberPerformance.counts.requiredDays === 0) continue;
        relevantMemberScores.push(memberPerformance.customerIncluded ? memberPerformance.score : null);
    }

    const teamPerformanceScore = calculateCompleteTeamPerformanceScore(relevantMemberScores);
    const stationSummary = summarizeStationScore(stationResponses.flatMap((response) =>
        response.overallRating == null ? [] : [response.overallRating]
    ));
    const restroomSummary = summarizeRestroomScore(restroomResponses.flatMap((response) => {
        if (response.overallRating == null) return [];
        return [{
            responseId: response.id,
            overallRating: response.overallRating,
            answers: response.answers.flatMap((answer) => {
                const value = answer.choiceValues[0];
                return value === "YES" || value === "NO" || value === "UNSURE"
                    ? [{ questionKey: answer.questionKey, answer: value }]
                    : [];
            }),
        }];
    }));
    let stationScore = stationSummary.score;
    let restroomScore = restroomSummary.score;
    if (params.qualityWeekKey) {
        const config = await prisma.systemConfig.findUnique({ where: { key: cashierOverrideKey(params.stationId, params.qualityWeekKey) } });
        const manual: QualityOverride = config ? JSON.parse(config.value) : { station: null, restroom: null };
        // The historical full-score grant is display-only; ordinary weekly RP uses zero-response fallbacks.
        stationScore = resolveCashierQuality(stationScore, stationSummary.responseCount, manual.station, false).score;
        restroomScore = resolveCashierQuality(restroomScore, restroomSummary.responseCount, manual.restroom, false).score;
    }
    const score = calculateFuelCashierScore({ teamPerformanceScore, stationScore, restroomScore });

    return { score, teamPerformanceScore, stationSummary, restroomSummary, relevantTeamMemberCount: relevantMemberScores.length };
}
