import { describe, expect, it } from "vitest";
import {
    calculateEmployeeTemporalStats,
    summarizeEmployeeRubric,
    type EmployeeScoreResponseInput,
} from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS, EMPLOYEE_SCORE_TOTAL } from "@/lib/customer-feedback/questions";

const all = (answer: "YES" | "NO" | "UNSURE", responseId: string) => ({
    responseId,
    answers: EMPLOYEE_SCORE_QUESTION_KEYS.map((questionKey) => ({ questionKey, answer })),
});

describe("employee-v3 64-point rubric", () => {
    it("has an exact total of 64 points", () => {
        expect(EMPLOYEE_SCORE_TOTAL).toBe(64);
        expect(EMPLOYEE_SCORE_QUESTION_KEYS).toHaveLength(9);
    });

    it("hides the score until the minimum sample is reached", () => {
        const score = summarizeEmployeeRubric(
            Array.from({ length: 9 }, (_, index) => all("YES", `r-${index}`))
        );
        expect(score.responseCount).toBe(9);
        expect(score.meetsMinimumSample).toBe(false);
        expect(score.score64).toBeNull();
    });

    it("returns 64 when ten valid evaluations answer YES to every evaluable criterion", () => {
        const score = summarizeEmployeeRubric(
            Array.from({ length: 10 }, (_, index) => all("YES", `r-${index}`))
        );
        expect(score.meetsMinimumSample).toBe(true);
        expect(score.score64).toBe(64);
    });

    it("excludes UNSURE from the denominator instead of treating it as zero", () => {
        const responses = Array.from({ length: 10 }, (_, index) => all("YES", `r-${index}`));
        const firstKey = EMPLOYEE_SCORE_QUESTION_KEYS[0];
        for (const response of responses) {
            const target = response.answers.find((answer) => answer.questionKey === firstKey);
            if (target) target.answer = "UNSURE";
        }
        const score = summarizeEmployeeRubric(responses);
        expect(score.score64).toBe(64);
        expect(score.criteria[0].unsure).toBe(10);
        expect(score.criteria[0].evaluable).toBe(0);
        expect(score.excludedWeight).toBe(15);
    });
});

describe("calculateEmployeeTemporalStats", () => {
    it("returns safe empty structures when responses list is empty", () => {
        const stats = calculateEmployeeTemporalStats([]);
        expect(stats.hourly).toHaveLength(24);
        expect(stats.timeSlots).toHaveLength(4);
        expect(stats.shifts).toEqual([]);
        expect(stats.dayOfWeek).toHaveLength(2);
        expect(stats.peakHour).toBeNull();
        expect(stats.peakSlot).toBeNull();
        expect(stats.progression.trend).toBe("insufficient_data");
        expect(stats.recentFeedbacks).toEqual([]);
    });

    it("groups Bangkok hours and identifies morning rush hour peak", () => {
        // UTC 01:00 = Bangkok 08:00 (Morning Rush)
        const responses: EmployeeScoreResponseInput[] = [
            {
                ...all("YES", "r1"),
                submittedAt: new Date("2026-08-10T01:15:00.000Z"),
                shiftLabelSnapshot: "กะเช้า",
            },
            {
                ...all("YES", "r2"),
                submittedAt: new Date("2026-08-10T01:45:00.000Z"),
                shiftLabelSnapshot: "กะเช้า",
            },
            {
                ...all("YES", "r3"),
                submittedAt: new Date("2026-08-10T07:00:00.000Z"), // UTC 07:00 = Bangkok 14:00 (Daytime)
                shiftLabelSnapshot: "กะบ่าย",
            },
        ];

        const stats = calculateEmployeeTemporalStats(responses);
        expect(stats.hourly[8].responseCount).toBe(2);
        expect(stats.hourly[14].responseCount).toBe(1);
        expect(stats.peakHour).toContain("08:00 - 09:00 (2 แบบ)");

        const morningSlot = stats.timeSlots.find((s) => s.slotKey === "morning_rush");
        expect(morningSlot?.responseCount).toBe(2);
        expect(morningSlot?.isPeak).toBe(true);
        expect(stats.peakSlot).toContain("เช้าเร่งด่วน");

        expect(stats.shifts).toHaveLength(2);
        expect(stats.shifts[0].shiftLabel).toBe("กะเช้า");
        expect(stats.shifts[0].responseCount).toBe(2);
    });

    it("detects rush hour drop alerts when score decreases during peak hours", () => {
        // Normal hours: 4 responses all YES
        const normal: EmployeeScoreResponseInput[] = Array.from({ length: 4 }, (_, i) => ({
            ...all("YES", `norm-${i}`),
            submittedAt: new Date(`2026-08-10T03:${10 + i}:00.000Z`), // UTC 03:00 = Bangkok 10:00 (Daytime)
        }));

        // Rush hours: 4 responses where question 0 (uniform) is NO
        const rush: EmployeeScoreResponseInput[] = Array.from({ length: 4 }, (_, i) => {
            const resp = all("YES", `rush-${i}`);
            resp.answers[0].answer = "NO";
            return {
                ...resp,
                submittedAt: new Date(`2026-08-10T01:${10 + i}:00.000Z`), // UTC 01:00 = Bangkok 08:00 (Morning Rush)
            };
        });

        const stats = calculateEmployeeTemporalStats([...normal, ...rush]);
        const q0Comparison = stats.rushHourRubric.find((r) => r.questionKey === EMPLOYEE_SCORE_QUESTION_KEYS[0]);
        expect(q0Comparison).toBeDefined();
        expect(q0Comparison?.normalRate).toBe(100);
        expect(q0Comparison?.rushHourRate).toBe(0);
        expect(q0Comparison?.gap).toBe(-100);
        expect(q0Comparison?.isDropAlert).toBe(true);
    });
});

