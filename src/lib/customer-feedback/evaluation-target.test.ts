import { describe, expect, it } from "vitest";
import { getEmployeeDailyMissionProgress } from "./evaluation-target";

const shiftDate = new Date("2026-09-14T17:00:00.000Z"); // 2026-09-15 Bangkok

describe("customer feedback daily Mission spread", () => {
    it("completes a five-feedback Mission only when all three shift segments are covered", () => {
        const result = getEmployeeDailyMissionProgress({
            validCount: 5,
            responseTimes: [
                new Date("2026-09-15T07:00:00+07:00"),
                new Date("2026-09-15T08:30:00+07:00"),
                new Date("2026-09-15T11:00:00+07:00"),
                new Date("2026-09-15T15:00:00+07:00"),
                new Date("2026-09-15T17:00:00+07:00"),
            ],
            shiftDate,
            startTime: "06:00",
            endTime: "18:00",
        });

        expect(result).toMatchObject({
            status: "DONE",
            meetsVolumeTarget: true,
            spreadApplicable: true,
            coveredSegments: 3,
            complete: true,
            segmentCoverage: { START: true, MIDDLE: true, END: true },
        });
    });

    it("does not complete Mission when all five feedback entries are clustered in one segment", () => {
        const result = getEmployeeDailyMissionProgress({
            validCount: 5,
            responseTimes: [7, 7.5, 8, 8.5, 9].map((hour) => {
                const wholeHour = Math.floor(hour);
                const minutes = (hour - wholeHour) * 60;
                return new Date(`2026-09-15T${String(wholeHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00+07:00`);
            }),
            shiftDate,
            startTime: "06:00",
            endTime: "18:00",
        });

        expect(result.status).toBe("NEAR");
        expect(result.meetsVolumeTarget).toBe(true);
        expect(result.segmentCoverage).toEqual({ START: true, MIDDLE: false, END: false });
        expect(result.complete).toBe(false);
    });

    it("requires five total even when all three segments already have feedback", () => {
        const result = getEmployeeDailyMissionProgress({
            validCount: 4,
            responseTimes: [
                new Date("2026-09-15T07:00:00+07:00"),
                new Date("2026-09-15T11:00:00+07:00"),
                new Date("2026-09-15T15:00:00+07:00"),
                new Date("2026-09-15T16:00:00+07:00"),
            ],
            shiftDate,
            startTime: "06:00",
            endTime: "18:00",
        });

        expect(result.meetsVolumeTarget).toBe(false);
        expect(result.coveredSegments).toBe(3);
        expect(result.complete).toBe(false);
    });

    it("handles an overnight shift and puts post-midnight feedback into the same Mission", () => {
        const result = getEmployeeDailyMissionProgress({
            validCount: 5,
            responseTimes: [
                new Date("2026-09-15T19:00:00+07:00"),
                new Date("2026-09-15T21:00:00+07:00"),
                new Date("2026-09-15T23:00:00+07:00"),
                new Date("2026-09-16T03:00:00+07:00"),
                new Date("2026-09-16T05:00:00+07:00"),
            ],
            shiftDate,
            startTime: "18:00",
            endTime: "06:00",
        });

        expect(result.segmentCoverage).toEqual({ START: true, MIDDLE: true, END: true });
        expect(result.complete).toBe(true);
    });

    it("falls back to the legacy quantity rule when shift metadata is missing", () => {
        const result = getEmployeeDailyMissionProgress({ validCount: 5 });

        expect(result).toMatchObject({
            status: "DONE",
            meetsVolumeTarget: true,
            spreadApplicable: false,
            segmentCoverage: null,
            complete: true,
        });
    });
});
