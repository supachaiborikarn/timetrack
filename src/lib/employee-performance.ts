import { calculateBreakOverageMinutes, resolveAllowedBreakMinutes } from "@/lib/break-rules";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PERFORMANCE_WEIGHTS = {
    presence: 25,
    punctuality: 15,
    completion: 10,
    breakDiscipline: 10,
    customer: 40,
} as const;

export const WORK_PERFORMANCE_TOTAL = 60;
export const CUSTOMER_RUBRIC_TOTAL = 64;

export type PerformanceShiftAssignment = {
    date: Date;
    isDayOff: boolean;
    shift: {
        startTime: string;
        endTime: string;
        breakMinutes: number;
        isNightShift?: boolean | null;
    };
};

export type PerformanceAttendance = {
    date: Date;
    checkInTime: Date | null;
    checkOutTime: Date | null;
    lateMinutes: number | null;
    breakStartTime?: Date | null;
    breakEndTime?: Date | null;
    breakDurationMin: number | null;
};

export type PerformanceLeave = {
    startDate: Date;
    endDate: Date;
    status: "PENDING" | "APPROVED" | "REJECTED";
};

export type PerformanceCustomerScore = {
    applicable: boolean;
    score64: number | null;
    responseCount: number;
    minimumSample: number;
    meetsMinimumSample: boolean;
};

export type EmployeePerformanceResult = {
    score: number | null;
    isProvisional: boolean;
    workPoints: number;
    workPointsMax: number;
    customerPoints: number | null;
    customerPointsMax: number;
    customerScore64: number | null;
    customerResponseCount: number;
    customerMinimumSample: number;
    customerIncluded: boolean;
    components: {
        presence: number;
        punctuality: number;
        completion: number;
        breakDiscipline: number;
    };
    counts: {
        scheduledDays: number;
        requiredDays: number;
        presentDays: number;
        absentDays: number;
        approvedLeaveDays: number;
        pendingLeaveDays: number;
        dayOffDays: number;
        upcomingDays: number;
        inProgressDays: number;
        lateDays: number;
        earlyLeaveDays: number;
        overBreakDays: number;
        leaveAttendanceOverlapDays: number;
        duplicateLeaveDays: number;
        unscheduledAttendanceDays: number;
    };
};

function roundPoints(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toBangkokDateKey(date: Date): string {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function timeOnBangkokDate(dateKey: string, time: string): Date {
    const [hour, minute] = time.split(":").map(Number);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        throw new Error(`Invalid shift time: ${time}`);
    }
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, hour, minute) - BANGKOK_OFFSET_MS);
}

export function getBangkokShiftWindow(assignment: PerformanceShiftAssignment): { start: Date; end: Date } {
    const dateKey = toBangkokDateKey(assignment.date);
    const start = timeOnBangkokDate(dateKey, assignment.shift.startTime);
    let end = timeOnBangkokDate(dateKey, assignment.shift.endTime);
    if (assignment.shift.isNightShift || end <= start) end = new Date(end.getTime() + DAY_MS);
    return { start, end };
}

function attendanceBreakMinutes(attendance: PerformanceAttendance, referenceTime: Date): number {
    if (attendance.breakDurationMin != null) return Math.max(0, attendance.breakDurationMin);
    if (!attendance.breakStartTime) return 0;
    const end = attendance.breakEndTime ?? attendance.checkOutTime ?? referenceTime;
    return Math.max(0, Math.floor((end.getTime() - attendance.breakStartTime.getTime()) / 60_000));
}

export function calculateEmployeePerformance(input: {
    assignments: PerformanceShiftAssignment[];
    attendances: PerformanceAttendance[];
    leaves: PerformanceLeave[];
    customer: PerformanceCustomerScore;
    stationCode?: string | null;
    referenceTime?: Date;
    attendanceGraceMinutes?: number;
}): EmployeePerformanceResult {
    const referenceTime = input.referenceTime ?? new Date();
    const graceMinutes = Math.max(0, Math.round(input.attendanceGraceMinutes ?? 0));
    const assignmentByDate = new Map<string, PerformanceShiftAssignment>();
    for (const assignment of input.assignments) {
        assignmentByDate.set(toBangkokDateKey(assignment.date), assignment);
    }

    const attendanceByDate = new Map<string, PerformanceAttendance>();
    for (const attendance of input.attendances) {
        const key = toBangkokDateKey(attendance.date);
        const existing = attendanceByDate.get(key);
        if (!existing || (!existing.checkInTime && attendance.checkInTime)) attendanceByDate.set(key, attendance);
    }

    const counts = {
        scheduledDays: 0,
        requiredDays: 0,
        presentDays: 0,
        absentDays: 0,
        approvedLeaveDays: 0,
        pendingLeaveDays: 0,
        dayOffDays: 0,
        upcomingDays: 0,
        inProgressDays: 0,
        lateDays: 0,
        earlyLeaveDays: 0,
        overBreakDays: 0,
        leaveAttendanceOverlapDays: 0,
        duplicateLeaveDays: 0,
        unscheduledAttendanceDays: 0,
    };

    let lateSeverityTotal = 0;
    let completionSeverityTotal = 0;
    let breakSeverityTotal = 0;

    const sortedAssignments = [...assignmentByDate.entries()].sort(([left], [right]) => left.localeCompare(right));
    for (const [dateKey, assignment] of sortedAssignments) {
        if (assignment.isDayOff) {
            counts.dayOffDays++;
            continue;
        }

        counts.scheduledDays++;
        const dayStart = timeOnBangkokDate(dateKey, "00:00");
        const dayEnd = new Date(dayStart.getTime() + DAY_MS);
        const coveringLeaves = input.leaves.filter((leave) => leave.startDate < dayEnd && leave.endDate >= dayStart);
        const approvedLeaves = coveringLeaves.filter((leave) => leave.status === "APPROVED");
        const pendingLeaves = coveringLeaves.filter((leave) => leave.status === "PENDING");
        if (approvedLeaves.length + pendingLeaves.length > 1) counts.duplicateLeaveDays++;

        const attendance = attendanceByDate.get(dateKey);
        const hasCheckIn = Boolean(attendance?.checkInTime);
        const window = getBangkokShiftWindow(assignment);
        const dueAt = new Date(window.start.getTime() + graceMinutes * 60_000);

        if (!hasCheckIn && approvedLeaves.length > 0) {
            counts.approvedLeaveDays++;
            continue;
        }
        if (!hasCheckIn && pendingLeaves.length > 0) {
            counts.pendingLeaveDays++;
            continue;
        }
        if (!hasCheckIn && referenceTime < dueAt) {
            counts.upcomingDays++;
            continue;
        }

        counts.requiredDays++;
        if (!attendance?.checkInTime) {
            counts.absentDays++;
            continue;
        }

        counts.presentDays++;
        if (coveringLeaves.length > 0) counts.leaveAttendanceOverlapDays++;

        const lateMinutes = Math.max(0, attendance.lateMinutes ?? 0);
        if (lateMinutes > 0) counts.lateDays++;
        lateSeverityTotal += Math.min(1, lateMinutes / 60);

        let earlyMinutes = 0;
        if (attendance.checkOutTime) {
            earlyMinutes = Math.max(0, Math.floor((window.end.getTime() - attendance.checkOutTime.getTime()) / 60_000));
        } else if (referenceTime >= window.end) {
            earlyMinutes = 60;
        } else {
            counts.inProgressDays++;
        }
        if (earlyMinutes > 0) counts.earlyLeaveDays++;
        completionSeverityTotal += Math.min(1, earlyMinutes / 60);

        const allowedBreak = resolveAllowedBreakMinutes(input.stationCode, assignment.shift.breakMinutes);
        const breakMinutes = attendanceBreakMinutes(attendance, referenceTime);
        const overBreakMinutes = calculateBreakOverageMinutes(breakMinutes, allowedBreak);
        if (overBreakMinutes > 0) counts.overBreakDays++;
        breakSeverityTotal += Math.min(1, overBreakMinutes / 30);
    }

    for (const dateKey of attendanceByDate.keys()) {
        const assignment = assignmentByDate.get(dateKey);
        if (!assignment || assignment.isDayOff) counts.unscheduledAttendanceDays++;
    }

    const attendanceRate = counts.requiredDays > 0 ? counts.presentDays / counts.requiredDays : 0;
    const punctualityQuality = counts.presentDays > 0 ? 1 - lateSeverityTotal / counts.presentDays : 0;
    const completionQuality = counts.presentDays > 0 ? 1 - completionSeverityTotal / counts.presentDays : 0;
    const breakQuality = counts.presentDays > 0 ? 1 - breakSeverityTotal / counts.presentDays : 0;

    const components = {
        presence: roundPoints(PERFORMANCE_WEIGHTS.presence * attendanceRate),
        punctuality: roundPoints(PERFORMANCE_WEIGHTS.punctuality * attendanceRate * punctualityQuality),
        completion: roundPoints(PERFORMANCE_WEIGHTS.completion * attendanceRate * completionQuality),
        breakDiscipline: roundPoints(PERFORMANCE_WEIGHTS.breakDiscipline * attendanceRate * breakQuality),
    };
    const workPoints = roundPoints(Object.values(components).reduce((sum, value) => sum + value, 0));

    const customerIncluded = input.customer.applicable
        && input.customer.meetsMinimumSample
        && input.customer.score64 != null;
    const customerPoints = customerIncluded
        ? roundPoints((Math.max(0, Math.min(CUSTOMER_RUBRIC_TOTAL, input.customer.score64!)) / CUSTOMER_RUBRIC_TOTAL) * PERFORMANCE_WEIGHTS.customer)
        : null;

    let score: number | null = null;
    if (counts.requiredDays > 0) {
        score = customerIncluded
            ? Math.round(workPoints + customerPoints!)
            : Math.round((workPoints / WORK_PERFORMANCE_TOTAL) * 100);
    }

    return {
        score,
        isProvisional: counts.pendingLeaveDays > 0
            || counts.inProgressDays > 0
            || (input.customer.applicable && !customerIncluded),
        workPoints,
        workPointsMax: WORK_PERFORMANCE_TOTAL,
        customerPoints,
        customerPointsMax: PERFORMANCE_WEIGHTS.customer,
        customerScore64: input.customer.score64,
        customerResponseCount: input.customer.responseCount,
        customerMinimumSample: input.customer.minimumSample,
        customerIncluded,
        components,
        counts,
    };
}
