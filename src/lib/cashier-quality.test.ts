import { describe, expect, it } from "vitest";
import { resolveCashierQuality } from "./cashier-quality";
import { calculateFuelCashierScore } from "./cashier-score";

describe("cashier quality fallback", () => {
    it("grants full quality only for the explicitly requested historical week", () => {
        expect(resolveCashierQuality(null, 0, null, true)).toEqual({ score: 100, source: "INITIAL_GRANT" });
        expect(resolveCashierQuality(null, 0, null, false)).toEqual({ score: null, source: "MISSING" });
        expect(calculateFuelCashierScore({ teamPerformanceScore: 80, stationScore: 100, restroomScore: 100 }).score).toBe(88);
    });
    it("allows zero and only uses an admin fallback with no customer responses", () => {
        expect(resolveCashierQuality(null, 0, 0, false)).toEqual({ score: 0, source: "ADMIN" });
        expect(resolveCashierQuality(75, 20, 100, false)).toEqual({ score: 75, source: "CUSTOMER" });
        expect(resolveCashierQuality(null, 1, 100, false)).toEqual({ score: null, source: "CUSTOMER" });
    });
});
