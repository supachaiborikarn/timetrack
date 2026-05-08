import { calculateWorkHours } from "@/lib/date-utils";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const MORNING_CUTOFF_HOUR = 12;
const LATE_HOUSEKEEPING_CHECK_IN_HOUR = 15;

type DepartmentLike = {
    code?: string | null;
    name?: string | null;
} | null | undefined;

type ShiftLike = {
    endTime?: string | null;
    breakMinutes?: number | null;
    isNightShift?: boolean | null;
} | null | undefined;

export function isHousekeepingDepartment(department: DepartmentLike): boolean {
    return department?.code === "MAID" || department?.name?.includes("แม่บ้าน") === true;
}

export function getBangkokDateKey(date: Date): string {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().split("T")[0];
}

export function getBangkokHourOfDay(date: Date): number {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).getUTCHours();
}

export function isHousekeepingOvernightAttendance(params: {
    checkInTime: Date | null | undefined;
    referenceTime: Date;
    department: DepartmentLike;
    shift: ShiftLike;
}): boolean {
    if (!params.checkInTime) return false;
    if (!isHousekeepingDepartment(params.department)) return false;
    if (params.shift?.isNightShift) return false;

    return (
        getBangkokDateKey(params.referenceTime) > getBangkokDateKey(params.checkInTime) &&
        getBangkokHourOfDay(params.referenceTime) < MORNING_CUTOFF_HOUR
    );
}

export function getShiftEndOnBangkokDate(checkInTime: Date, shiftEndTime: string = "17:00"): Date {
    const [hour, minute] = shiftEndTime.split(":").map(Number);
    const bangkokDate = new Date(checkInTime.getTime() + BANGKOK_OFFSET_MS);

    return new Date(
        Date.UTC(
            bangkokDate.getUTCFullYear(),
            bangkokDate.getUTCMonth(),
            bangkokDate.getUTCDate(),
            hour,
            minute,
            0,
            0,
        ) - BANGKOK_OFFSET_MS,
    );
}

export function resolveHousekeepingOvernightClose(
    checkInTime: Date,
    referenceTime: Date,
    shift: ShiftLike,
): { checkOutTime: Date; actualHours: number; overtimeHours: number; reason: "shift-end" | "invalid-check-in" } {
    const checkInHour = getBangkokHourOfDay(checkInTime);
    const shiftEndTime = getShiftEndOnBangkokDate(checkInTime, shift?.endTime || "17:00");

    if (
        checkInHour >= LATE_HOUSEKEEPING_CHECK_IN_HOUR ||
        shiftEndTime <= checkInTime ||
        shiftEndTime >= referenceTime
    ) {
        return {
            checkOutTime: checkInTime,
            actualHours: 0,
            overtimeHours: 0,
            reason: "invalid-check-in",
        };
    }

    const hours = calculateWorkHours(checkInTime, shiftEndTime, shift?.breakMinutes || 60);

    return {
        checkOutTime: shiftEndTime,
        actualHours: hours.totalHours,
        overtimeHours: hours.overtimeHours,
        reason: "shift-end",
    };
}
