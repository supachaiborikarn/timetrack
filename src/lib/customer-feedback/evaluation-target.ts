import { startOfDayBangkok } from "@/lib/date-utils";

export const EMPLOYEE_DAILY_EVALUATION_TARGET = 5;
export const EMPLOYEE_DAILY_EVALUATION_NEAR_THRESHOLD = 3;

export type EmployeeDailyEvaluationStatus = "NOT_YET" | "NEAR" | "DONE";

export function getBangkokEvaluationDayBounds(now: Date = new Date()): { from: Date; toExclusive: Date } {
    const from = startOfDayBangkok(now);
    return {
        from,
        toExclusive: new Date(from.getTime() + 24 * 60 * 60 * 1000),
    };
}

export function getEmployeeDailyEvaluationStatus(count: number): EmployeeDailyEvaluationStatus {
    if (count >= EMPLOYEE_DAILY_EVALUATION_TARGET) return "DONE";
    if (count >= EMPLOYEE_DAILY_EVALUATION_NEAR_THRESHOLD) return "NEAR";
    return "NOT_YET";
}
