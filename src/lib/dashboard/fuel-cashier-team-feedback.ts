import {
    EMPLOYEE_DAILY_EVALUATION_TARGET,
    getEmployeeDailyEvaluationStatus,
    type EmployeeDailyEvaluationStatus,
} from "@/lib/customer-feedback/evaluation-target";

export const FEEDBACK_COOPERATION_ROLLING_WORKDAYS = 5;
export const FEEDBACK_COOPERATION_NORMAL_RATE = 80;
export const FEEDBACK_COOPERATION_EXPLAIN_RATE = 60;

export type FuelCashierLeagueStandingInput = {
    userId: string;
    label: string;
    rank: number;
    totalScore: number;
    isEligible: boolean;
    fairPlayStatus: string;
};

export type FuelCashierFeedbackResponseInput = {
    employeeId: string | null;
};

export type FuelCashierRecentWorkdayInput = {
    userId: string;
    dayKey: string;
};

export type FuelCashierRecentFeedbackResponseInput = {
    employeeId: string | null;
    dayKey: string;
};

export type FuelCashierFeedbackCooperationStatus = "BUILDING" | "NORMAL" | "FOLLOW_UP" | "EXPLAIN";

export type FuelCashierTeamFeedbackEmployee = {
    userId: string;
    label: string;
    todayEvaluationCount: number;
    remainingToday: number;
    dailyStatus: EmployeeDailyEvaluationStatus;
    rollingWorkdayCount: number;
    rollingEvaluationCount: number;
    rollingTargetCount: number;
    cooperationRate: number | null;
    cooperationStatus: FuelCashierFeedbackCooperationStatus;
    leagueRank: number | null;
    leagueScore: number | null;
    leagueNeedsReview: boolean;
};

export type FuelCashierTeamFeedback = {
    dailyTarget: number;
    rollingWorkdayTarget: number;
    teamMetTargetCount: number;
    teamNeedsMoreCount: number;
    teamFollowUpCount: number;
    teamNeedsExplanationCount: number;
    employees: FuelCashierTeamFeedbackEmployee[];
};

type BuildFuelCashierTeamFeedbackParams = {
    standings: FuelCashierLeagueStandingInput[];
    feedbackResponses: FuelCashierFeedbackResponseInput[];
    workingUserIds: Iterable<string>;
    recentWorkdays?: FuelCashierRecentWorkdayInput[];
    recentFeedbackResponses?: FuelCashierRecentFeedbackResponseInput[];
};

function getCooperationStatus(workdayCount: number, rate: number | null): FuelCashierFeedbackCooperationStatus {
    if (workdayCount < FEEDBACK_COOPERATION_ROLLING_WORKDAYS || rate === null) return "BUILDING";
    if (rate >= FEEDBACK_COOPERATION_NORMAL_RATE) return "NORMAL";
    if (rate >= FEEDBACK_COOPERATION_EXPLAIN_RATE) return "FOLLOW_UP";
    return "EXPLAIN";
}

export function buildFuelCashierTeamFeedback({
    standings,
    feedbackResponses,
    workingUserIds,
    recentWorkdays = [],
    recentFeedbackResponses = [],
}: BuildFuelCashierTeamFeedbackParams): FuelCashierTeamFeedback {
    const workingIds = new Set(workingUserIds);
    const responseCounts = new Map<string, number>();
    const workdayKeysByUser = new Map<string, Set<string>>();
    const recentResponseCounts = new Map<string, number>();

    for (const response of feedbackResponses) {
        if (!response.employeeId || !workingIds.has(response.employeeId)) continue;
        responseCounts.set(response.employeeId, (responseCounts.get(response.employeeId) ?? 0) + 1);
    }

    for (const workday of recentWorkdays) {
        if (!workingIds.has(workday.userId)) continue;
        const dayKeys = workdayKeysByUser.get(workday.userId) ?? new Set<string>();
        dayKeys.add(workday.dayKey);
        workdayKeysByUser.set(workday.userId, dayKeys);
    }

    for (const response of recentFeedbackResponses) {
        if (!response.employeeId || !workingIds.has(response.employeeId)) continue;
        const key = `${response.employeeId}::${response.dayKey}`;
        recentResponseCounts.set(key, (recentResponseCounts.get(key) ?? 0) + 1);
    }

    const employees = standings
        .filter((standing) => workingIds.has(standing.userId))
        .map((standing) => {
            const todayEvaluationCount = responseCounts.get(standing.userId) ?? 0;
            const rollingDayKeys = [...(workdayKeysByUser.get(standing.userId) ?? new Set<string>())]
                .sort((a, b) => b.localeCompare(a))
                .slice(0, FEEDBACK_COOPERATION_ROLLING_WORKDAYS);
            const rollingWorkdayCount = rollingDayKeys.length;
            const rollingEvaluationCount = rollingDayKeys.reduce((sum, dayKey) => {
                const dayCount = recentResponseCounts.get(`${standing.userId}::${dayKey}`) ?? 0;
                return sum + Math.min(EMPLOYEE_DAILY_EVALUATION_TARGET, dayCount);
            }, 0);
            const rollingTargetCount = rollingWorkdayCount * EMPLOYEE_DAILY_EVALUATION_TARGET;
            const cooperationRate = rollingTargetCount > 0
                ? Math.min(100, Math.round((rollingEvaluationCount / rollingTargetCount) * 100))
                : null;
            const cooperationStatus = getCooperationStatus(rollingWorkdayCount, cooperationRate);

            return {
                userId: standing.userId,
                label: standing.label,
                todayEvaluationCount,
                remainingToday: Math.max(0, EMPLOYEE_DAILY_EVALUATION_TARGET - todayEvaluationCount),
                dailyStatus: getEmployeeDailyEvaluationStatus(todayEvaluationCount),
                rollingWorkdayCount,
                rollingEvaluationCount,
                rollingTargetCount,
                cooperationRate,
                cooperationStatus,
                leagueRank: standing.isEligible ? standing.rank : null,
                leagueScore: standing.isEligible ? standing.totalScore : null,
                leagueNeedsReview: standing.fairPlayStatus === "REVIEW",
            } satisfies FuelCashierTeamFeedbackEmployee;
        })
        .sort((a, b) => {
            const attentionPriority = (status: FuelCashierFeedbackCooperationStatus) =>
                status === "EXPLAIN" ? 0 : status === "FOLLOW_UP" ? 1 : 2;
            return attentionPriority(a.cooperationStatus) - attentionPriority(b.cooperationStatus)
                || b.remainingToday - a.remainingToday
                || (a.leagueRank ?? Number.MAX_SAFE_INTEGER) - (b.leagueRank ?? Number.MAX_SAFE_INTEGER)
                || a.label.localeCompare(b.label, "th");
        });

    const teamMetTargetCount = employees.filter((employee) => employee.dailyStatus === "DONE").length;

    return {
        dailyTarget: EMPLOYEE_DAILY_EVALUATION_TARGET,
        rollingWorkdayTarget: FEEDBACK_COOPERATION_ROLLING_WORKDAYS,
        teamMetTargetCount,
        teamNeedsMoreCount: employees.length - teamMetTargetCount,
        teamFollowUpCount: employees.filter((employee) => employee.cooperationStatus === "FOLLOW_UP").length,
        teamNeedsExplanationCount: employees.filter((employee) => employee.cooperationStatus === "EXPLAIN").length,
        employees,
    };
}
