import { describe, expect, it } from "vitest";
import {
    RESTROOM_SCORE_MINIMUM_SAMPLE,
    restroomChecklistPoints,
    restroomOverallPoints,
    selectUniqueOnDutyHousekeeper,
    summarizeRestroomScore,
} from "./restroom-score";
import { RESTROOM_CLEANLINESS_QUESTION_KEYS } from "./questions";

function response(index: number, rating = 5, answer: "YES" | "NO" | "UNSURE" = "YES") {
    return {
        responseId: `r-${index}`,
        overallRating: rating,
        answers: RESTROOM_CLEANLINESS_QUESTION_KEYS.map((questionKey) => ({ questionKey, answer })),
    };
}

describe("restroom score policy", () => {
    it("maps overall rating to 0-40 points", () => {
        expect(restroomOverallPoints(1)).toBe(0);
        expect(restroomOverallPoints(3)).toBe(20);
        expect(restroomOverallPoints(5)).toBe(40);
    });

    it("excludes UNSURE from checklist denominator instead of turning it into zero", () => {
        const points = restroomChecklistPoints([
            { questionKey: RESTROOM_CLEANLINESS_QUESTION_KEYS[0], answer: "YES" },
            { questionKey: RESTROOM_CLEANLINESS_QUESTION_KEYS[1], answer: "NO" },
            { questionKey: RESTROOM_CLEANLINESS_QUESTION_KEYS[2], answer: "UNSURE" },
            { questionKey: RESTROOM_CLEANLINESS_QUESTION_KEYS[3], answer: "UNSURE" },
            { questionKey: RESTROOM_CLEANLINESS_QUESTION_KEYS[4], answer: "UNSURE" },
        ]);
        expect(points).toBe(30);
    });

    it("does not reveal a numeric score before the minimum VALID sample", () => {
        const summary = summarizeRestroomScore(
            Array.from({ length: RESTROOM_SCORE_MINIMUM_SAMPLE - 1 }, (_, index) => response(index)),
        );
        expect(summary.meetsMinimumSample).toBe(false);
        expect(summary.score).toBeNull();
        expect(summary.responseCount).toBe(RESTROOM_SCORE_MINIMUM_SAMPLE - 1);
    });

    it("returns a 100-point score when the minimum sample is met", () => {
        const summary = summarizeRestroomScore(
            Array.from({ length: RESTROOM_SCORE_MINIMUM_SAMPLE }, (_, index) => response(index)),
        );
        expect(summary.meetsMinimumSample).toBe(true);
        expect(summary.score).toBe(100);
        expect(summary.overallPoints).toBe(40);
        expect(summary.checklistPoints).toBe(60);
    });

    it("assigns only when exactly one unique housekeeper is on duty", () => {
        expect(selectUniqueOnDutyHousekeeper([{ userId: "maid-1", row: 1 }])).toMatchObject({ userId: "maid-1" });
        expect(selectUniqueOnDutyHousekeeper([{ userId: "maid-1" }, { userId: "maid-1" }])).toMatchObject({ userId: "maid-1" });
        expect(selectUniqueOnDutyHousekeeper([{ userId: "maid-1" }, { userId: "maid-2" }])).toBeNull();
        expect(selectUniqueOnDutyHousekeeper([])).toBeNull();
    });
});
