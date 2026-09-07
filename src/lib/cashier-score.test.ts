import { describe, expect, it } from "vitest";
import { calculateCompleteTeamPerformanceScore, calculateFuelCashierScore } from "./cashier-score";

describe("fuel cashier score", () => {
    it("uses equal employee weight then 60/20/20", () => {
        const team = calculateCompleteTeamPerformanceScore([80, 100]);
        expect(team).toBe(90);
        expect(calculateFuelCashierScore({ teamPerformanceScore: team, stationScore: 80, restroomScore: 70 })).toMatchObject({
            score: 84,
            knownWeight: 100,
            points: { teamPerformance: 54, stationQuality: 16, restroomQuality: 14 },
        });
    });

    it("never treats a missing source as zero", () => {
        const result = calculateFuelCashierScore({ teamPerformanceScore: 90, stationScore: 80, restroomScore: null });
        expect(result.score).toBeNull();
        expect(result.knownWeight).toBe(80);
        expect(result.forecastScore).toBe(87.5);
    });

    it("waits when any relevant employee performance is unavailable", () => {
        expect(calculateCompleteTeamPerformanceScore([90, null, 80])).toBeNull();
        expect(calculateCompleteTeamPerformanceScore([])).toBeNull();
    });
});
