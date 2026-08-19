import { describe, expect, it } from "vitest";
import {
    daysInMonth,
    defaultAllowanceDate,
    effectiveHousingAllowance,
    findHousingIssues,
    isEligibleForHousingAllowance,
    isHousingStatus,
    monthRange,
} from "../housing";

describe("isEligibleForHousingAllowance", () => {
    it("pays only people living in their own place", () => {
        expect(isEligibleForHousingAllowance("OWN_HOUSING")).toBe(true);
        expect(isEligibleForHousingAllowance("COMPANY_DORM")).toBe(false);
    });

    it("does not pay people who have not been surveyed yet", () => {
        // The whole point of keeping UNKNOWN separate: a blank field must never
        // read as "pays their own rent" and quietly trigger a payout.
        expect(isEligibleForHousingAllowance("UNKNOWN")).toBe(false);
    });
});

describe("effectiveHousingAllowance", () => {
    it("uses the company default when the employee has no override", () => {
        expect(effectiveHousingAllowance(null, 1500)).toBe(1500);
        expect(effectiveHousingAllowance(undefined, 1500)).toBe(1500);
    });

    it("prefers the per-employee rate when set", () => {
        expect(effectiveHousingAllowance(2000, 1500)).toBe(2000);
    });

    it("treats an explicit zero as a real override, not a missing value", () => {
        expect(effectiveHousingAllowance(0, 1500)).toBe(0);
    });

    it("falls back to the default for nonsense values", () => {
        expect(effectiveHousingAllowance(-100, 1500)).toBe(1500);
        expect(effectiveHousingAllowance(Number.NaN, 1500)).toBe(1500);
    });
});

describe("findHousingIssues", () => {
    const base = { housingStatus: "COMPANY_DORM" as const, dormitoryId: "d1", stationId: "st1", dormitoryStationId: "st1" };

    it("is happy with a consistent record", () => {
        expect(findHousingIssues(base)).toEqual([]);
    });

    it("flags a resident with no dorm chosen", () => {
        expect(findHousingIssues({ ...base, dormitoryId: null })).toContain("MISSING_DORMITORY");
    });

    it("flags a dorm left behind after someone moved out", () => {
        expect(findHousingIssues({ ...base, housingStatus: "OWN_HOUSING" })).toContain("DORMITORY_WITHOUT_STATUS");
    });

    it("flags living at a dorm belonging to another branch", () => {
        expect(findHousingIssues({ ...base, dormitoryStationId: "st2" })).toContain("STATION_MISMATCH");
    });

    it("does not flag a mismatch when the dorm serves no particular branch", () => {
        expect(findHousingIssues({ ...base, dormitoryStationId: null })).toEqual([]);
    });

    it("reports every problem, not just the first", () => {
        const issues = findHousingIssues({ housingStatus: "UNKNOWN", dormitoryId: "d1", stationId: "st1", dormitoryStationId: "st2" });
        expect(issues).toEqual(["DORMITORY_WITHOUT_STATUS"]);
    });
});

describe("month helpers", () => {
    it("knows month lengths including leap years", () => {
        expect(daysInMonth(2026, 2)).toBe(28);
        expect(daysInMonth(2028, 2)).toBe(29);
        expect(daysInMonth(2026, 8)).toBe(31);
        expect(daysInMonth(2026, 4)).toBe(30);
    });

    it("dates the allowance on the last day of the month", () => {
        expect(defaultAllowanceDate(2026, 8)).toBe("2026-08-31");
        expect(defaultAllowanceDate(2026, 2)).toBe("2026-02-28");
        expect(defaultAllowanceDate(2026, 11)).toBe("2026-11-30");
    });

    it("brackets the whole month in Bangkok time", () => {
        const { start, end } = monthRange(2026, 8);
        // 1 Aug 00:00 +07:00 is 31 Jul 17:00 UTC — the offset has to be in there or
        // a record written on the 1st would fall outside its own month.
        expect(start.toISOString()).toBe("2026-07-31T17:00:00.000Z");
        expect(end.toISOString()).toBe("2026-08-31T16:59:59.000Z");

        const firstOfMonth = new Date("2026-08-01T00:00:00+07:00");
        const lastOfMonth = new Date("2026-08-31T00:00:00+07:00");
        expect(firstOfMonth >= start && firstOfMonth <= end).toBe(true);
        expect(lastOfMonth >= start && lastOfMonth <= end).toBe(true);

        const nextMonth = new Date("2026-09-01T00:00:00+07:00");
        expect(nextMonth > end).toBe(true);
    });
});

describe("isHousingStatus", () => {
    it("accepts only the three known statuses", () => {
        expect(isHousingStatus("OWN_HOUSING")).toBe(true);
        expect(isHousingStatus("RENTED")).toBe(false);
        expect(isHousingStatus(null)).toBe(false);
    });
});
