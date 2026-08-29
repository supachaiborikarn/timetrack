import { describe, expect, it } from "vitest";
import { summarizeEmployeeRubric } from "@/lib/customer-feedback/employee-score";
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
