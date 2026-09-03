import {
    EMPLOYEE_DAILY_EVALUATION_TARGET,
    getEmployeeDailyEvaluationStatus,
    type EmployeeDailyEvaluationStatus,
} from "@/lib/customer-feedback/evaluation-target";

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

export type FuelCashierTeamFeedbackEmployee = {
    userId: string;
    label: string;
    todayEvaluationCount: number;
    remainingToday: number;
    dailyStatus: EmployeeDailyEvaluationStatus;
    leagueRank: number | null;
    leagueScore: number | null;
    leagueNeedsReview: boolean;
};

export type FuelCashierTeamFeedback = {
    dailyTarget: number;
    teamMetTargetCount: number;
    teamNeedsMoreCount: number;
    employees: FuelCashierTeamFeedbackEmployee[];
};

type BuildFuelCashierTeamFeedbackParams = {
    standings: FuelCashierLeagueStandingInput[];
    feedbackResponses: FuelCashierFeedbackResponseInput[];
    workingUserIds: Iterable<string>;
};

export function buildFuelCashierTeamFeedback({
    standings,
    feedbackResponses,
    workingUserIds,
}: BuildFuelCashierTeamFeedbackParams): FuelCashierTeamFeedback {
    const workingIds = new Set(workingUserIds);
    const responseCounts = new Map<string, number>();

    for (const response of feedbackResponses) {
        if (!response.employeeId || !workingIds.has(response.employeeId)) continue;
        responseCounts.set(response.employeeId, (responseCounts.get(response.employeeId) ?? 0) + 1);
    }

    const employees = standings
        .filter((standing) => workingIds.has(standing.userId))
        .map((standing) => {
            const todayEvaluationCount = responseCounts.get(standing.userId) ?? 0;
            return {
                userId: standing.userId,
                label: standing.label,
                todayEvaluationCount,
                remainingToday: Math.max(0, EMPLOYEE_DAILY_EVALUATION_TARGET - todayEvaluationCount),
                dailyStatus: getEmployeeDailyEvaluationStatus(todayEvaluationCount),
                leagueRank: standing.isEligible ? standing.rank : null,
                leagueScore: standing.isEligible ? standing.totalScore : null,
                leagueNeedsReview: standing.fairPlayStatus === "REVIEW",
            } satisfies FuelCashierTeamFeedbackEmployee;
        })
        .sort((a, b) =>
            b.remainingToday - a.remainingToday
            || (a.leagueRank ?? Number.MAX_SAFE_INTEGER) - (b.leagueRank ?? Number.MAX_SAFE_INTEGER)
            || a.label.localeCompare(b.label, "th")
        );

    const teamMetTargetCount = employees.filter((employee) => employee.dailyStatus === "DONE").length;

    return {
        dailyTarget: EMPLOYEE_DAILY_EVALUATION_TARGET,
        teamMetTargetCount,
        teamNeedsMoreCount: employees.length - teamMetTargetCount,
        employees,
    };
}
