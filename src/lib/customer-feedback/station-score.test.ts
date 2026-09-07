import { describe, expect, it } from "vitest";
import { STATION_SCORE_MINIMUM_SAMPLE, summarizeStationScore } from "./station-score";

describe("summarizeStationScore", () => {
    it("waits for the existing station comparison minimum", () => {
        const result = summarizeStationScore(Array(STATION_SCORE_MINIMUM_SAMPLE - 1).fill(5));
        expect(result.meetsMinimumSample).toBe(false);
        expect(result.score).toBeNull();
    });

    it("maps station rating 1-5 onto a 0-100 score", () => {
        expect(summarizeStationScore(Array(STATION_SCORE_MINIMUM_SAMPLE).fill(5)).score).toBe(100);
        expect(summarizeStationScore(Array(STATION_SCORE_MINIMUM_SAMPLE).fill(3)).score).toBe(50);
        expect(summarizeStationScore(Array(STATION_SCORE_MINIMUM_SAMPLE).fill(1)).score).toBe(0);
    });
});
