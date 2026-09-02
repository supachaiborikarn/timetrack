import { describe, expect, it } from "vitest";
import { classifyCompetitionFeedback, getBangkokWeekBounds } from "./league";

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
