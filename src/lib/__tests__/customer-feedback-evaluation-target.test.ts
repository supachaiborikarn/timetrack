import { describe, expect, it } from "vitest";
import { EMPLOYEE_DAILY_EVALUATION_TARGET, getBangkokEvaluationDayBounds } from "@/lib/customer-feedback/evaluation-target";

describe("employee customer evaluation daily target", () => {
    it("uses five valid evaluations per day", () => {
        expect(EMPLOYEE_DAILY_EVALUATION_TARGET).toBe(5);
    });

    it("uses Bangkok midnight boundaries independent of server timezone", () => {
        const beforeBangkokMidnight = getBangkokEvaluationDayBounds(new Date("2026-08-31T16:59:59.000Z"));
        expect(beforeBangkokMidnight.from.toISOString()).toBe("2026-08-30T17:00:00.000Z");
        expect(beforeBangkokMidnight.toExclusive.toISOString()).toBe("2026-08-31T17:00:00.000Z");

        const afterBangkokMidnight = getBangkokEvaluationDayBounds(new Date("2026-08-31T17:00:00.000Z"));
        expect(afterBangkokMidnight.from.toISOString()).toBe("2026-08-31T17:00:00.000Z");
        expect(afterBangkokMidnight.toExclusive.toISOString()).toBe("2026-09-01T17:00:00.000Z");
    });
});
