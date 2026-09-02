import { describe, expect, it } from "vitest";
import {
    calculateBreakOverageMinutes,
    calculateBreakPenaltyAmount,
    resolveAllowedBreakMinutes,
} from "@/lib/break-rules";

describe("break rules", () => {
    it("uses the configured shift allowance", () => {
        expect(resolveAllowedBreakMinutes(null, 60)).toBe(60);
        expect(resolveAllowedBreakMinutes(null, 90)).toBe(90);
        expect(resolveAllowedBreakMinutes(null, null)).toBe(60);
    });

    it("uses the station allowance for all fuel and gas branches", () => {
        expect(resolveAllowedBreakMinutes("WKO", 60)).toBe(90);
        expect(resolveAllowedBreakMinutes("PAP", 60)).toBe(90);
        expect(resolveAllowedBreakMinutes("PAP_GAS", 60)).toBe(90);
        expect(resolveAllowedBreakMinutes("SPC", 90)).toBe(60);
        expect(resolveAllowedBreakMinutes("SPC_GAS", 90)).toBe(60);
    });

    it("allows five grace minutes before overage", () => {
        expect(calculateBreakOverageMinutes(65, 60)).toBe(0);
        expect(calculateBreakOverageMinutes(80, 60)).toBe(15);
    });

    it("charges one hourly rate only when the break exceeds allowance and grace", () => {
        expect(calculateBreakPenaltyAmount({ durationMinutes: 65, allowedMinutes: 60, hourlyRate: 50 })).toBe(0);
        expect(calculateBreakPenaltyAmount({ durationMinutes: 66, allowedMinutes: 60, hourlyRate: 50 })).toBe(50);
    });
});
