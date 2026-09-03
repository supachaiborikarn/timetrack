import { describe, expect, it } from "vitest";
import { buildFuelCashierTeamFeedback } from "@/lib/dashboard/fuel-cashier-team-feedback";

describe("buildFuelCashierTeamFeedback", () => {
    const standings = [
        { userId: "u1", label: "หนึ่ง", rank: 1, totalScore: 91.25, isEligible: true, fairPlayStatus: "CLEAR" },
        { userId: "u2", label: "สอง", rank: 2, totalScore: 82.5, isEligible: true, fairPlayStatus: "REVIEW" },
        { userId: "u3", label: "สาม", rank: 3, totalScore: 40, isEligible: false, fairPlayStatus: "CLEAR" },
        { userId: "off", label: "หยุด", rank: 4, totalScore: 75, isEligible: true, fairPlayStatus: "CLEAR" },
    ];

    it("shows exact daily progress only for front-yard employees working today", () => {
        const result = buildFuelCashierTeamFeedback({
            standings,
            workingUserIds: ["u1", "u2", "u3"],
            feedbackResponses: [
                ...Array.from({ length: 5 }, () => ({ employeeId: "u1" })),
                ...Array.from({ length: 3 }, () => ({ employeeId: "u2" })),
                { employeeId: "u3" },
                ...Array.from({ length: 9 }, () => ({ employeeId: "off" })),
                { employeeId: null },
            ],
        });

        expect(result.dailyTarget).toBe(5);
        expect(result.teamMetTargetCount).toBe(1);
        expect(result.teamNeedsMoreCount).toBe(2);
        expect(result.employees.map((employee) => employee.userId)).toEqual(["u3", "u2", "u1"]);
        expect(result.employees).toEqual([
            expect.objectContaining({
                userId: "u3",
                todayEvaluationCount: 1,
                remainingToday: 4,
                dailyStatus: "NOT_YET",
                leagueRank: null,
                leagueScore: null,
            }),
            expect.objectContaining({
                userId: "u2",
                todayEvaluationCount: 3,
                remainingToday: 2,
                dailyStatus: "NEAR",
                leagueRank: 2,
                leagueScore: 82.5,
                leagueNeedsReview: true,
            }),
            expect.objectContaining({
                userId: "u1",
                todayEvaluationCount: 5,
                remainingToday: 0,
                dailyStatus: "DONE",
                leagueRank: 1,
                leagueScore: 91.25,
            }),
        ]);
    });

    it("does not expose hidden League sample-threshold fields", () => {
        const result = buildFuelCashierTeamFeedback({
            standings,
            workingUserIds: ["u1"],
            feedbackResponses: [],
        });

        expect(JSON.stringify(result)).not.toContain("minimumSample");
        expect(JSON.stringify(result)).not.toContain("customerMinimumSample");
    });
});
