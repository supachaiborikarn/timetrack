import { startOfDayBangkok } from "@/lib/date-utils";

export const EMPLOYEE_DAILY_EVALUATION_TARGET = 5;
export const EMPLOYEE_DAILY_EVALUATION_NEAR_THRESHOLD = 3;

export type EmployeeDailyEvaluationStatus = "NOT_YET" | "NEAR" | "DONE";
export type EmployeeMissionSegment = "START" | "MIDDLE" | "END";

export type EmployeeDailyMissionProgress = {
    status: EmployeeDailyEvaluationStatus;
    meetsVolumeTarget: boolean;
    spreadApplicable: boolean;
    segmentCoverage: Record<EmployeeMissionSegment, boolean> | null;
    coveredSegments: number;
    complete: boolean;
};

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

function parseClockMinutes(value?: string | null): number | null {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (
        !Number.isInteger(hours)
        || !Number.isInteger(minutes)
        || hours < 0
        || hours > 23
        || minutes < 0
        || minutes > 59
    ) {
        return null;
    }
    return hours * 60 + minutes;
}

export function getEmployeeMissionShiftWindow(input: {
    shiftDate?: Date | null;
    startTime?: string | null;
    endTime?: string | null;
}): { start: Date; end: Date } | null {
    if (!input.shiftDate) return null;
    const startMinutes = parseClockMinutes(input.startTime);
    const endMinutesRaw = parseClockMinutes(input.endTime);
    if (startMinutes === null || endMinutesRaw === null) return null;

    const dayStart = startOfDayBangkok(input.shiftDate);
    const start = new Date(dayStart.getTime() + startMinutes * 60_000);
    let endMinutes = endMinutesRaw;
    if (endMinutes <= startMinutes) endMinutes += 24 * 60;
    const end = new Date(dayStart.getTime() + endMinutes * 60_000);
    if (end <= start) return null;
    return { start, end };
}

export function getEmployeeDailyMissionProgress(input: {
    validCount: number;
    responseTimes?: Date[];
    shiftDate?: Date | null;
    startTime?: string | null;
    endTime?: string | null;
}): EmployeeDailyMissionProgress {
    const window = getEmployeeMissionShiftWindow(input);
    const fallbackStatus = getEmployeeDailyEvaluationStatus(input.validCount);
    if (!window) {
        return {
            status: fallbackStatus,
            meetsVolumeTarget: input.validCount >= EMPLOYEE_DAILY_EVALUATION_TARGET,
            spreadApplicable: false,
            segmentCoverage: null,
            coveredSegments: 0,
            complete: input.validCount >= EMPLOYEE_DAILY_EVALUATION_TARGET,
        };
    }

    const duration = window.end.getTime() - window.start.getTime();
    const firstBoundary = window.start.getTime() + duration / 3;
    const secondBoundary = window.start.getTime() + (duration * 2) / 3;
    const coverage: Record<EmployeeMissionSegment, boolean> = {
        START: false,
        MIDDLE: false,
        END: false,
    };

    let inShiftCount = 0;
    for (const responseTime of input.responseTimes ?? []) {
        const timestamp = responseTime.getTime();
        if (!Number.isFinite(timestamp) || timestamp < window.start.getTime() || timestamp >= window.end.getTime()) {
            continue;
        }
        inShiftCount++;
        if (timestamp < firstBoundary) coverage.START = true;
        else if (timestamp < secondBoundary) coverage.MIDDLE = true;
        else coverage.END = true;
    }

    const coveredSegments = Object.values(coverage).filter(Boolean).length;
    const meetsVolumeTarget = inShiftCount >= EMPLOYEE_DAILY_EVALUATION_TARGET;
    const complete = meetsVolumeTarget && coveredSegments === 3;
    const status: EmployeeDailyEvaluationStatus = complete
        ? "DONE"
        : inShiftCount >= EMPLOYEE_DAILY_EVALUATION_NEAR_THRESHOLD
            ? "NEAR"
            : "NOT_YET";

    return {
        status,
        meetsVolumeTarget,
        spreadApplicable: true,
        segmentCoverage: coverage,
        coveredSegments,
        complete,
    };
}
