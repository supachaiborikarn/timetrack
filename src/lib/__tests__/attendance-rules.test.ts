import { describe, expect, it } from "vitest";
import {
    getBangkokDateKey,
    isHousekeepingDepartment,
    isHousekeepingOvernightAttendance,
    resolveHousekeepingOvernightClose,
} from "../attendance-rules";

describe("attendance-rules", () => {
    it("detects housekeeping departments", () => {
        expect(isHousekeepingDepartment({ code: "MAID", name: "ทั่วไป" })).toBe(true);
        expect(isHousekeepingDepartment({ code: "MISC", name: "แม่บ้าน" })).toBe(true);
        expect(isHousekeepingDepartment({ code: "FUEL", name: "หน้าลาน" })).toBe(false);
    });

    it("detects housekeeping overnight records in the morning", () => {
        const checkInTime = new Date("2026-04-20T09:55:00.000Z"); // 16:55 Bangkok
        const referenceTime = new Date("2026-04-21T00:01:00.000Z"); // 07:01 Bangkok

        expect(isHousekeepingOvernightAttendance({
            checkInTime,
            referenceTime,
            department: { code: "MAID", name: "แม่บ้าน" },
            shift: { isNightShift: false },
        })).toBe(true);
    });

    it("does not flag night shift departments", () => {
        const checkInTime = new Date("2026-04-20T13:00:00.000Z");
        const referenceTime = new Date("2026-04-21T00:00:00.000Z");

        expect(isHousekeepingOvernightAttendance({
            checkInTime,
            referenceTime,
            department: { code: "MAID", name: "แม่บ้าน" },
            shift: { isNightShift: true },
        })).toBe(false);
    });

    it("closes a normal morning housekeeping record at the same-day shift end", () => {
        const checkInTime = new Date("2026-02-27T23:53:00.000Z"); // 06:53 Bangkok
        const referenceTime = new Date("2026-02-28T23:47:00.000Z"); // next day 06:47 Bangkok

        const fixed = resolveHousekeepingOvernightClose(
            checkInTime,
            referenceTime,
            { endTime: "17:00", breakMinutes: 60, isNightShift: false },
        );

        expect(getBangkokDateKey(fixed.checkOutTime)).toBe("2026-02-28");
        expect(fixed.actualHours).toBe(9.12);
        expect(fixed.reason).toBe("shift-end");
    });

    it("closes a late housekeeping check-in as invalid with zero hours", () => {
        const checkInTime = new Date("2026-04-20T09:55:00.000Z"); // 16:55 Bangkok
        const referenceTime = new Date("2026-04-21T00:01:00.000Z"); // next day 07:01 Bangkok

        const fixed = resolveHousekeepingOvernightClose(
            checkInTime,
            referenceTime,
            { endTime: "17:00", breakMinutes: 60, isNightShift: false },
        );

        expect(fixed.checkOutTime).toEqual(checkInTime);
        expect(fixed.actualHours).toBe(0);
        expect(fixed.reason).toBe("invalid-check-in");
    });
});
