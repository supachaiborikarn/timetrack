import { describe, expect, it } from "vitest";
import {
    resolveAttendanceStatus,
    shiftStartOnBangkokDate,
    toBangkokDateKey,
} from "../attendance-summary";
import { isDailyAttendanceReportDue } from "../attendance-alerts";

describe("attendance summary rules", () => {
    const dueAt = new Date("2026-07-16T22:45:00.000Z"); // 05:45 Bangkok
    const afterDue = new Date("2026-07-16T22:46:00.000Z");

    it("builds the shift start from the Bangkok work date", () => {
        const shiftStart = shiftStartOnBangkokDate("2026-07-17", "05:30");
        expect(shiftStart.toISOString()).toBe("2026-07-16T22:30:00.000Z");
        expect(toBangkokDateKey(shiftStart)).toBe("2026-07-17");
    });

    it("counts a checked-in employee as present even when a leave exists", () => {
        expect(resolveAttendanceStatus({
            hasCheckIn: true,
            leaveStatuses: ["APPROVED"],
            dueAt,
            referenceTime: afterDue,
        })).toBe("PRESENT");
    });

    it("separates approved and pending leave", () => {
        expect(resolveAttendanceStatus({
            hasCheckIn: false,
            leaveStatuses: ["APPROVED"],
            dueAt,
            referenceTime: afterDue,
        })).toBe("APPROVED_LEAVE");

        expect(resolveAttendanceStatus({
            hasCheckIn: false,
            leaveStatuses: ["PENDING"],
            dueAt,
            referenceTime: afterDue,
        })).toBe("PENDING_LEAVE");
    });

    it("marks an employee absent only after the grace period", () => {
        expect(resolveAttendanceStatus({
            hasCheckIn: false,
            leaveStatuses: [],
            dueAt,
            referenceTime: new Date("2026-07-16T22:44:00.000Z"),
        })).toBe("UPCOMING");

        expect(resolveAttendanceStatus({
            hasCheckIn: false,
            leaveStatuses: [],
            dueAt,
            referenceTime: afterDue,
        })).toBe("ABSENT_WITHOUT_LEAVE");
    });

    it("starts the daily summary at the configured Bangkok time", () => {
        expect(isDailyAttendanceReportDue(
            new Date("2026-07-17T16:29:00.000Z"),
            "23:30",
        )).toBe(false);
        expect(isDailyAttendanceReportDue(
            new Date("2026-07-17T16:30:00.000Z"),
            "23:30",
        )).toBe(true);
    });
});
