import { describe, expect, it } from "vitest";
import { toAttendanceShiftDisplay } from "./attendance-shift-display";

describe("toAttendanceShiftDisplay", () => {
    it("shows a day-off assignment as day off without leaking the linked work-shift time", () => {
        const result = toAttendanceShiftDisplay({
            isDayOff: true,
            shift: {
                name: "กะ 08:00-20:00",
                startTime: "08:00",
                endTime: "20:00",
                breakMinutes: 60,
            },
        }, "WKO");

        expect(result).toEqual({
            name: "วันหยุด",
            startTime: null,
            endTime: null,
            breakMinutes: 0,
            isDayOff: true,
        });
    });

    it("keeps normal work-shift details and marks them as working days", () => {
        const result = toAttendanceShiftDisplay({
            isDayOff: false,
            shift: {
                name: "กะ 06:00-18:00",
                startTime: "06:00",
                endTime: "18:00",
                breakMinutes: 60,
            },
        });

        expect(result).toMatchObject({
            name: "กะ 06:00-18:00",
            startTime: "06:00",
            endTime: "18:00",
            isDayOff: false,
        });
    });
});
