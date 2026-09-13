import { describe, expect, it } from "vitest";
import { calculateSupportStationBonus, classifyCompetitionFeedback, compareWeeklyLeagueStandings, getBangkokWeekBounds } from "./league";

describe("competition league fair play", () => {
    it("counts the same weekly client only once for the same employee", () => {
        const result = classifyCompetitionFeedback([
            { id: "first", validity: "VALID", abuseScore: 0, clientHashWeekly: "regular-customer" },
            { id: "second", validity: "VALID", abuseScore: 0, clientHashWeekly: "regular-customer" },
            { id: "third", validity: "VALID", abuseScore: 0, clientHashWeekly: "regular-customer" },
            { id: "other", validity: "VALID", abuseScore: 0, clientHashWeekly: "other-customer" },
        ]);

        expect(result.eligibleIds).toEqual(["first", "other"]);
        expect(result.excludedRepeatCustomerCount).toBe(2);
        expect(result.suspiciousCustomerCount).toBe(0);
    });

    it("excludes suspected/high-abuse feedback without deleting valid source feedback", () => {
        const result = classifyCompetitionFeedback([
            { id: "suspected", validity: "SUSPECTED", abuseScore: 0, clientHashWeekly: "a" },
            { id: "abuse", validity: "VALID", abuseScore: 3, clientHashWeekly: "b" },
            { id: "good", validity: "VALID", abuseScore: 0, clientHashWeekly: "c" },
        ]);

        expect(result.eligibleIds).toEqual(["good"]);
        expect(result.suspiciousCustomerCount).toBe(2);
        expect(result.fairPlayReasons).toContain("multiple-suspected-feedback");
    });

    it("flags a high repeat-customer ratio for manual Fair Play review", () => {
        const result = classifyCompetitionFeedback([
            { id: "a1", validity: "VALID", abuseScore: 0, clientHashWeekly: "a" },
            { id: "a2", validity: "VALID", abuseScore: 0, clientHashWeekly: "a" },
            { id: "a3", validity: "VALID", abuseScore: 0, clientHashWeekly: "a" },
            { id: "b1", validity: "VALID", abuseScore: 0, clientHashWeekly: "b" },
            { id: "c1", validity: "VALID", abuseScore: 0, clientHashWeekly: "c" },
        ]);

        expect(result.repeatRatio).toBe(0.4);
        expect(result.fairPlayReasons).toContain("high-repeat-customer-ratio");
    });

    it("does not let responses without a retained competition client signal count toward prizes", () => {
        const result = classifyCompetitionFeedback([
            { id: "missing-1", validity: "VALID", abuseScore: 0, clientHashWeekly: null },
            { id: "missing-2", validity: "VALID", abuseScore: 0, clientHashWeekly: null },
            { id: "good", validity: "VALID", abuseScore: 0, clientHashWeekly: "good" },
        ]);

        expect(result.eligibleIds).toEqual(["good"]);
        expect(result.missingClientSignalCount).toBe(2);
        expect(result.fairPlayReasons).toContain("missing-competition-client-signal");
    });
});

describe("competition Bangkok periods", () => {
    it("starts the weekly league Monday 00:00 Asia/Bangkok", () => {
        const bounds = getBangkokWeekBounds(new Date("2026-09-02T04:00:00.000Z"));
        expect(bounds.key).toBe("2026-08-31");
        expect(bounds.from.toISOString()).toBe("2026-08-30T17:00:00.000Z");
        expect(bounds.to.toISOString()).toBe("2026-09-06T17:00:00.000Z");
    });
});


describe("support-station League bonus", () => {
    it("counts at most one support point per Bangkok day", () => {
        const bonus = calculateSupportStationBonus([
            new Date("2026-09-07T01:00:00.000Z"),
            new Date("2026-09-07T09:00:00.000Z"),
        ]);
        expect(bonus).toEqual({ supportDays: 1, supportPoints: 1 });
    });

    it("caps the weekly support bonus at three points", () => {
        const bonus = calculateSupportStationBonus([
            new Date("2026-09-07T01:00:00.000Z"),
            new Date("2026-09-08T01:00:00.000Z"),
            new Date("2026-09-09T01:00:00.000Z"),
            new Date("2026-09-10T01:00:00.000Z"),
        ]);
        expect(bonus).toEqual({ supportDays: 4, supportPoints: 3 });
    });
});

describe("weekly League tie-break fairness", () => {
    it("uses customer quality instead of raw feedback volume when total and support points are tied", () => {
        const higherVolume = {
            isEligible: true,
            totalScore: 95,
            supportPoints: 0,
            customerPoints: 23.5,
            employeeId: "EMP001",
            eligibleCustomerCount: 40,
        };
        const higherQuality = {
            isEligible: true,
            totalScore: 95,
            supportPoints: 0,
            customerPoints: 24.5,
            employeeId: "EMP002",
            eligibleCustomerCount: 12,
        };

        const sorted = [higherVolume, higherQuality].sort(compareWeeklyLeagueStandings);
        expect(sorted.map((standing) => standing.employeeId)).toEqual(["EMP002", "EMP001"]);
    });

    it("keeps employee id as a stable final tie-break when score quality is identical", () => {
        const a = { isEligible: true, totalScore: 95, supportPoints: 0, customerPoints: 24, employeeId: "EMP001" };
        const b = { isEligible: true, totalScore: 95, supportPoints: 0, customerPoints: 24, employeeId: "EMP002" };
        expect([b, a].sort(compareWeeklyLeagueStandings).map((standing) => standing.employeeId)).toEqual(["EMP001", "EMP002"]);
    });
});
