import { describe, expect, it } from "vitest";
import { InvalidAttendanceTimeError, recalculateAttendanceTimes } from "../attendance-edit";

describe("attendance-edit", () => {
    it("uses the assigned break when an admin edits both times", () => {
        const result = recalculateAttendanceTimes({
            date: "2026-06-10",
            existingCheckIn: null,
            existingCheckOut: null,
            requestedCheckIn: new Date("2026-06-10T08:00:00+07:00"),
            requestedCheckOut: new Date("2026-06-10T20:00:00+07:00"),
            breakMinutes: 60,
            shiftStart: "08:00",
            canCrossMidnight: false,
        });

        expect(result.actualHours).toBe(11);
        expect(result.overtimeHours).toBe(3);
    });

    it("clears stored hours when checkout is removed", () => {
        const result = recalculateAttendanceTimes({
            date: "2026-06-10",
            existingCheckIn: new Date("2026-06-10T08:00:00+07:00"),
            existingCheckOut: new Date("2026-06-10T20:00:00+07:00"),
            requestedCheckOut: null,
            breakMinutes: 60,
            shiftStart: "08:00",
            canCrossMidnight: false,
        });

        expect(result.checkOutTime).toBeNull();
        expect(result.actualHours).toBeNull();
        expect(result.overtimeHours).toBeNull();
    });

    it("recalculates late minutes and the late deduction", () => {
        const result = recalculateAttendanceTimes({
            date: "2026-06-10",
            existingCheckIn: null,
            existingCheckOut: null,
            requestedCheckIn: new Date("2026-06-10T09:05:00+07:00"),
            breakMinutes: 60,
            shiftStart: "08:00",
            canCrossMidnight: false,
        });

        expect(result.lateMinutes).toBe(65);
        expect(result.latePenaltyAmount).toBe(100);
    });

    it("rejects an overnight edit for a day shift", () => {
        expect(() => recalculateAttendanceTimes({
            date: "2026-06-10",
            existingCheckIn: null,
            existingCheckOut: null,
            requestedCheckIn: new Date("2026-06-10T20:00:00+07:00"),
            requestedCheckOut: new Date("2026-06-10T08:00:00+07:00"),
            breakMinutes: 60,
            shiftStart: "20:00",
            canCrossMidnight: false,
        })).toThrow(InvalidAttendanceTimeError);
    });
});
