import { calculateLatePenalty, calculateWorkHours } from "@/lib/date-utils";

type RecalculateAttendanceInput = {
    date: string;
    existingCheckIn: Date | null;
    existingCheckOut: Date | null;
    requestedCheckIn?: Date | null;
    requestedCheckOut?: Date | null;
    breakMinutes: number;
    shiftStart?: string | null;
    canCrossMidnight: boolean;
};

export type RecalculatedAttendance = {
    checkInTime: Date | null;
    checkOutTime: Date | null;
    actualHours: number | null;
    overtimeHours: number | null;
    lateMinutes: number;
    latePenaltyAmount: number;
};

export class InvalidAttendanceTimeError extends Error {}

export function recalculateAttendanceTimes(input: RecalculateAttendanceInput): RecalculatedAttendance {
    const checkInTime = input.requestedCheckIn === undefined ? input.existingCheckIn : input.requestedCheckIn;
    let checkOutTime = input.requestedCheckOut === undefined ? input.existingCheckOut : input.requestedCheckOut;

    if (checkInTime && checkOutTime && checkOutTime < checkInTime) {
        if (!input.canCrossMidnight) throw new InvalidAttendanceTimeError("CHECKOUT_BEFORE_CHECKIN");
        checkOutTime = new Date(checkOutTime.getTime() + 24 * 60 * 60 * 1000);
    }

    let actualHours: number | null = null;
    let overtimeHours: number | null = null;
    if (checkInTime && checkOutTime) {
        const calculated = calculateWorkHours(checkInTime, checkOutTime, Math.max(0, input.breakMinutes));
        actualHours = calculated.totalHours;
        overtimeHours = calculated.overtimeHours;
    }

    let lateMinutes = 0;
    if (checkInTime && input.shiftStart) {
        const shiftStart = new Date(`${input.date}T${input.shiftStart}:00+07:00`);
        lateMinutes = Math.max(0, Math.floor((checkInTime.getTime() - shiftStart.getTime()) / 60_000));
    }

    return {
        checkInTime,
        checkOutTime,
        actualHours,
        overtimeHours,
        lateMinutes,
        latePenaltyAmount: calculateLatePenalty(lateMinutes),
    };
}
