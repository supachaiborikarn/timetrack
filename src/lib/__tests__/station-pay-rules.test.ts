import { describe, expect, it } from "vitest";
import {
    calculateStationTimePay,
    STATION_TIME_PAY_EFFECTIVE_DATE,
} from "../station-pay-rules";

function calculate(stationCode: string, actualHours: number, dateKey = STATION_TIME_PAY_EFFECTIVE_DATE) {
    return calculateStationTimePay({
        dateKey,
        stationCode,
        actualHours,
        hasCompletedShift: true,
    });
}

describe("station time pay rules", () => {
    it("does not apply the new rules before 26 Aug 2026", () => {
        expect(calculate("WKO", 12, "2026-08-25")).toEqual({
            thresholdHours: null,
            overtimeHours: 0,
            overtimePay: 0,
            earlyLeavePenalty: 0,
        });
    });

    it("uses a 10.5 hour threshold for Wacharakiat and Phonganan", () => {
        expect(calculate("WKO", 10.5)).toMatchObject({ overtimeHours: 0, overtimePay: 0, earlyLeavePenalty: 0 });
        expect(calculate("PAP", 10)).toMatchObject({ overtimeHours: 0, overtimePay: 0, earlyLeavePenalty: 50 });
        expect(calculate("PAP_GAS", 11)).toMatchObject({ overtimeHours: 0.5, overtimePay: 17.5, earlyLeavePenalty: 0 });
        expect(calculate("WKO", 11.5)).toMatchObject({ overtimeHours: 1, overtimePay: 35, earlyLeavePenalty: 0 });
    });

    it("uses an 11 hour threshold for Supachai", () => {
        expect(calculate("SPC", 10.75)).toMatchObject({ overtimeHours: 0, overtimePay: 0, earlyLeavePenalty: 50 });
        expect(calculate("SPC_GAS", 11)).toMatchObject({ overtimeHours: 0, overtimePay: 0, earlyLeavePenalty: 0 });
        expect(calculate("SPC", 12.25)).toMatchObject({ overtimeHours: 1.25, overtimePay: 43.75, earlyLeavePenalty: 0 });
    });

    it("does not deduct an incomplete attendance record", () => {
        expect(calculateStationTimePay({
            dateKey: STATION_TIME_PAY_EFFECTIVE_DATE,
            stationCode: "WKO",
            actualHours: 8,
            hasCompletedShift: false,
        })).toMatchObject({ overtimePay: 0, earlyLeavePenalty: 0 });
    });
});
