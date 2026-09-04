import { describe, expect, it } from "vitest";
import {
    averageAvailableTeamPoints,
    calculateChineseNewYearBonusPreview,
    calculateCompleteTeamCustomerQualityPoints,
    calculateDisciplineSafetyPoints,
    calculateEvaluationCooperationPoints,
    resolveChineseNewYearBonusTier,
} from "./chinese-new-year-bonus";

describe("Chinese New Year bonus preview", () => {
    it("uses the approved payout tiers", () => {
        expect(resolveChineseNewYearBonusTier(90)).toEqual({ minScore: 90, bonusPercent: 100 });
        expect(resolveChineseNewYearBonusTier(85)).toEqual({ minScore: 85, bonusPercent: 90 });
        expect(resolveChineseNewYearBonusTier(80)).toEqual({ minScore: 80, bonusPercent: 80 });
        expect(resolveChineseNewYearBonusTier(75)).toEqual({ minScore: 75, bonusPercent: 70 });
        expect(resolveChineseNewYearBonusTier(70)).toEqual({ minScore: 70, bonusPercent: 50 });
        expect(resolveChineseNewYearBonusTier(69.9)).toEqual({ minScore: 0, bonusPercent: 0 });
    });

    it("projects missing components instead of treating them as zero", () => {
        const result = calculateChineseNewYearBonusPreview({
            attendancePoints: 22.5,
            customerQualityPoints: 27,
            cooperationPoints: null,
            supervisorSopPoints: null,
            disciplineSafetyPoints: 9,
            periodClosed: false,
        });

        expect(result.profile).toBe("FRONT_YARD");
        expect(result.knownWeight).toBe(65);
        expect(result.knownPoints).toBe(58.5);
        expect(result.forecastScore).toBe(90);
        expect(result.bonusPercent).toBe(100);
        expect(result.missingComponents).toEqual(["cooperation", "supervisorSop"]);
        expect(result.isProvisional).toBe(true);
    });

    it("reports distance to the next payout tier", () => {
        const result = calculateChineseNewYearBonusPreview({
            attendancePoints: 20,
            customerQualityPoints: 24,
            cooperationPoints: 12,
            supervisorSopPoints: 16,
            disciplineSafetyPoints: 8,
            periodClosed: true,
        });

        expect(result.forecastScore).toBe(80);
        expect(result.bonusPercent).toBe(80);
        expect(result.nextTierScore).toBe(85);
        expect(result.pointsToNextTier).toBe(5);
        expect(result.isProvisional).toBe(false);
    });

    it("keeps a safety review provisional without automatically deducting points", () => {
        const result = calculateChineseNewYearBonusPreview({
            attendancePoints: 25,
            customerQualityPoints: 30,
            cooperationPoints: 15,
            supervisorSopPoints: 20,
            disciplineSafetyPoints: 10,
            periodClosed: true,
            safetyReviewRequired: true,
        });

        expect(result.forecastScore).toBe(100);
        expect(result.bonusPercent).toBe(100);
        expect(result.safetyReviewRequired).toBe(true);
        expect(result.isProvisional).toBe(true);
    });

    it("uses the fuel-cashier role profile so team outcomes motivate coaching without dominating the score", () => {
        const result = calculateChineseNewYearBonusPreview({
            profile: "FUEL_CASHIER",
            attendancePoints: 25,
            customerQualityPoints: 20,
            cooperationPoints: 15,
            supervisorSopPoints: 30,
            disciplineSafetyPoints: 10,
            periodClosed: true,
        });

        expect(result.profile).toBe("FUEL_CASHIER");
        expect(result.knownWeight).toBe(100);
        expect(result.forecastScore).toBe(100);
        expect(result.components).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: "customerQuality", label: "คุณภาพบริการของทีม", maxPoints: 20 }),
            expect.objectContaining({ key: "cooperation", label: "ความร่วมมือแบบประเมินของทีม", maxPoints: 15 }),
            expect.objectContaining({ key: "supervisorSop", label: "งานเสมียน / SOP", maxPoints: 30 }),
        ]));
    });
});

describe("evaluation cooperation points", () => {
    it("averages daily completion and caps each day at the daily target", () => {
        const result = calculateEvaluationCooperationPoints({
            workedDayKeys: ["2026-09-01", "2026-09-02"],
            evaluationSubmittedAts: [
                "2026-09-01T02:00:00.000Z",
                "2026-09-01T03:00:00.000Z",
                "2026-09-01T04:00:00.000Z",
                "2026-09-01T05:00:00.000Z",
                "2026-09-01T06:00:00.000Z",
                "2026-09-01T07:00:00.000Z",
                "2026-09-02T02:00:00.000Z",
                "2026-09-02T03:00:00.000Z",
                "2026-09-02T04:00:00.000Z",
            ],
            dailyTarget: 5,
        });

        // day 1 = 100%, day 2 = 60%; average 80% of 15 points
        expect(result).toBe(12);
    });

    it("returns null before there is a worked day", () => {
        expect(calculateEvaluationCooperationPoints({
            workedDayKeys: [],
            evaluationSubmittedAts: [],
        })).toBeNull();
    });
});

describe("fuel cashier team points", () => {
    it("weights each team member equally and waits until every active member has a customer-quality score", () => {
        expect(calculateCompleteTeamCustomerQualityPoints({
            memberScores64: [64, 32],
            rubricTotal: 64,
            maxPoints: 20,
        })).toBe(15);
        expect(calculateCompleteTeamCustomerQualityPoints({
            memberScores64: [64, null],
            rubricTotal: 64,
            maxPoints: 20,
        })).toBeNull();
    });

    it("averages cooperation only across team members who actually have worked days", () => {
        expect(averageAvailableTeamPoints([15, 7.5, null])).toBe(11.3);
        expect(averageAvailableTeamPoints([null, null])).toBeNull();
    });
});

describe("discipline and safety points", () => {
    it("removes attendance-rate duplication before scaling discipline to 10 points", () => {
        const result = calculateDisciplineSafetyPoints({
            presencePoints: 20, // 80% attendance
            punctualityPoints: 12, // 15 * .8 * 1
            completionPoints: 8,
            breakDisciplinePoints: 8,
        });

        expect(result).toBe(10);
    });
});
