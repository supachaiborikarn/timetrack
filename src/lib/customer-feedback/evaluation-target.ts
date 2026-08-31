import { startOfDayBangkok } from "@/lib/date-utils";

export const EMPLOYEE_DAILY_EVALUATION_TARGET = 5;

export function getBangkokEvaluationDayBounds(now: Date = new Date()): { from: Date; toExclusive: Date } {
    const from = startOfDayBangkok(now);
    return {
        from,
        toExclusive: new Date(from.getTime() + 24 * 60 * 60 * 1000),
    };
}
