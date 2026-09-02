import { resolveAllowedBreakMinutes } from "@/lib/break-rules";

type ShiftAssignmentForDisplay = {
    isDayOff: boolean;
    shift: {
        name: string;
        startTime: string;
        endTime: string;
        breakMinutes: number;
    } | null;
} | null;

export type AttendanceShiftDisplay = {
    name: string;
    startTime: string | null;
    endTime: string | null;
    breakMinutes: number;
    isDayOff: boolean;
};

/**
 * Convert a stored shift assignment into the employee-facing attendance shift.
 * Day-off rows still carry a Shift relation for schedule consistency, but that
 * linked work shift must never leak into the dashboard as today's working time.
 */
export function toAttendanceShiftDisplay(
    assignment: ShiftAssignmentForDisplay,
    stationCode?: string | null,
): AttendanceShiftDisplay | null {
    if (!assignment?.shift) return null;

    if (assignment.isDayOff) {
        return {
            name: "วันหยุด",
            startTime: null,
            endTime: null,
            breakMinutes: 0,
            isDayOff: true,
        };
    }

    return {
        name: assignment.shift.name,
        startTime: assignment.shift.startTime,
        endTime: assignment.shift.endTime,
        breakMinutes: resolveAllowedBreakMinutes(stationCode, assignment.shift.breakMinutes),
        isDayOff: false,
    };
}
