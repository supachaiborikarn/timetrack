import {
    format,
    parseISO,
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay,
    differenceInMinutes,
    differenceInHours,
    addDays,
    subDays,
    isWeekend,
    getDate,
    setDate,
    subMonths,
    addMonths,
} from "date-fns";
import { th } from "date-fns/locale";

// Bangkok timezone offset
const BANGKOK_OFFSET = 7 * 60; // +7 hours in minutes
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // +7 hours in ms

/**
 * Get current Bangkok time as a Date object
 * This works correctly on both client (browser) and server
 */
export function getBangkokNow(): Date {
    const now = new Date();
    // Convert local time to UTC, then add Bangkok offset
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utc + BANGKOK_OFFSET * 60000);
}

/**
 * Get start of day in Bangkok timezone (for database queries)
 * This returns a Date at 00:00:00 Bangkok time
 * For example: 2026-02-06 00:00:00 Bangkok = 2026-02-05 17:00:00 UTC
 * 
 * IMPORTANT: This function works correctly regardless of server timezone
 * by calculating based on UTC time directly
 * 
 * @param inputDate - Optional date to get start of day for. If not provided, uses current time.
 */
export function startOfDayBangkok(inputDate?: Date): Date {
    // Use inputDate if provided, otherwise current time
    const baseDate = inputDate || new Date();
    const utcTimestamp = baseDate.getTime();

    // Calculate what time it is in Bangkok for the given date
    // by adding Bangkok offset to UTC
    const bangkokTimestamp = utcTimestamp + BANGKOK_OFFSET_MS;

    // Create a temp Date to extract Bangkok date components
    // We use the shifted timestamp and UTC methods to get Bangkok date
    const tempDate = new Date(bangkokTimestamp);
    const year = tempDate.getUTCFullYear();
    const month = tempDate.getUTCMonth();
    const day = tempDate.getUTCDate();

    // Calculate midnight Bangkok time in UTC
    // Midnight in Bangkok = Date.UTC(year, month, day) - 7 hours
    const midnightBangkokInUTC = Date.UTC(year, month, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;

    return new Date(midnightBangkokInUTC);
}

/**
 * Get Bangkok hour (0-23) for a given date
 * Useful for checking if it's morning/evening in Bangkok timezone
 */
export function getBangkokHour(date?: Date): number {
    const baseDate = date || new Date();
    const bangkokTimestamp = baseDate.getTime() + BANGKOK_OFFSET_MS;
    const tempDate = new Date(bangkokTimestamp);
    return tempDate.getUTCHours();
}

/**
 * Format date in Thai locale
 */
export function formatThaiDate(date: Date | string, formatStr: string = "d MMM yyyy"): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, formatStr, { locale: th });
}

/**
 * Format time in HH:mm format
 */
export function formatTime(date: Date | string): string {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "HH:mm");
}

/**
 * Calculate work hours between check-in and check-out
 * @param breakMinutes - Break time to deduct (default 60 minutes)
 */
export function calculateWorkHours(
    checkIn: Date,
    checkOut: Date,
    breakMinutes: number = 60
): { totalHours: number; overtimeHours: number } {
    const totalMinutes = differenceInMinutes(checkOut, checkIn) - breakMinutes;
    const regularMinutes = 8 * 60; // 8 hours standard workday

    const totalHours = Math.max(0, totalMinutes / 60);
    const overtimeHours = Math.max(0, (totalMinutes - regularMinutes) / 60);

    return {
        totalHours: Math.round(totalHours * 100) / 100,
        overtimeHours: Math.round(overtimeHours * 100) / 100,
    };
}

/**
 * Calculate late minutes
 * @param checkIn - Actual check-in time
 * @param shiftStart - Scheduled shift start time (e.g., "08:00")
 * @returns Minutes late (0 if on time or early)
 */
export function calculateLateMinutes(checkIn: Date, shiftStart: string): number {
    const [hours, minutes] = shiftStart.split(":").map(Number);
    const scheduledStart = new Date(checkIn);
    scheduledStart.setHours(hours, minutes, 0, 0);

    const lateMinutes = differenceInMinutes(checkIn, scheduledStart);
    return Math.max(0, lateMinutes);
}

/**
 * Calculate late penalty amount
 * Rule: Late > 5 minutes = 50 baht per hour
 */
export function calculateLatePenalty(lateMinutes: number): number {
    if (lateMinutes <= 5) return 0;

    const lateHours = Math.ceil(lateMinutes / 60);
    return lateHours * 50;
}

/**
 * Get payroll period dates based on department type
 * - หน้าลาน (Front Yard): 26th prev month to 25th current month
 * - Other departments: 1st to end of month
 */
export function getPayrollPeriod(
    forMonth: Date,
    isFrontYard: boolean
): { startDate: Date; endDate: Date; payDate: Date } {
    if (isFrontYard) {
        // 26th of previous month to 25th of current month
        const prevMonth = subMonths(forMonth, 1);
        const startDate = setDate(prevMonth, 26);
        const endDate = setDate(forMonth, 25);
        const payDate = setDate(forMonth, 26);

        return {
            startDate: startOfDay(startDate),
            endDate: endOfDay(endDate),
            payDate: startOfDay(payDate),
        };
    } else {
        // 1st to end of month
        return {
            startDate: startOfMonth(forMonth),
            endDate: endOfMonth(forMonth),
            payDate: setDate(forMonth, 26),
        };
    }
}

/**
 * Get advance payment dates for a month (10th and 20th)
 */
export function getAdvanceDates(forMonth: Date): { first: Date; second: Date } {
    return {
        first: setDate(forMonth, 10),
        second: setDate(forMonth, 20),
    };
}

/**
 * Check if a date is a working day (not weekend)
 */
export function isWorkingDay(date: Date): boolean {
    return !isWeekend(date);
}

/**
 * Parse time string (HH:mm) to Date object on given date
 */
export function parseTimeOnDate(date: Date, timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
}

/**
 * Parse a YYYY-MM-DD string to a Date object representing midnight in Bangkok
 * This is used for matching dates stored in the database where
 * 2026-02-13 in DB is actually 2026-02-12 17:00:00 UTC
 */
export function parseDateStringToBangkokMidnight(dateStr: string): Date {
    // Handle both "2026-02-13" and "2026-02-13T00:00:00.000Z"
    const simpleDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
    const [year, month, day] = simpleDate.split("-").map(Number);
    // Midnight in Bangkok = Date.UTC(year, month-1, day) - 7 hours
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

export {
    format,
    parseISO,
    startOfMonth,
    endOfMonth,
    startOfDay,
    endOfDay,
    differenceInMinutes,
    differenceInHours,
    addDays,
    subDays,
    isWeekend,
    getDate,
    setDate,
    subMonths,
    addMonths,
};
