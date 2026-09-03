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
        expect(result.rollingWorkdayTarget).toBe(5);
        expect(result.teamMetTargetCount).toBe(1);
        expect(result.teamNeedsMoreCount).toBe(2);
        expect(result.employees.map((employee) => employee.userId)).toEqual(["u3", "u2", "u1"]);
        expect(result.employees).toEqual([
            expect.objectContaining({
                userId: "u3",
                todayEvaluationCount: 1,
                remainingToday: 4,
                dailyStatus: "NOT_YET",
                cooperationStatus: "BUILDING",
                leagueRank: null,
                leagueScore: null,
            }),
            expect.objectContaining({
                userId: "u2",
                todayEvaluationCount: 3,
                remainingToday: 2,
                dailyStatus: "NEAR",
                cooperationStatus: "BUILDING",
                leagueRank: 2,
                leagueScore: 82.5,
                leagueNeedsReview: true,
            }),
            expect.objectContaining({
                userId: "u1",
                todayEvaluationCount: 5,
                remainingToday: 0,
                dailyStatus: "DONE",
                cooperationStatus: "BUILDING",
                leagueRank: 1,
                leagueScore: 91.25,
            }),
        ]);
    });

    it("classifies cooperation from the latest five actual workdays", () => {
        const dayKeys = ["2026-09-03", "2026-09-02", "2026-09-01", "2026-08-31", "2026-08-30"];
        const recentWorkdays = ["u1", "u2", "u3"].flatMap((userId) => dayKeys.map((dayKey) => ({ userId, dayKey })));
        const dailyCounts: Record<string, number[]> = {
            u1: [5, 5, 5, 5, 0],
            u2: [5, 5, 3, 2, 0],
            u3: [5, 4, 0, 0, 0],
        };
        const recentFeedbackResponses = Object.entries(dailyCounts).flatMap(([employeeId, counts]) =>
            counts.flatMap((count, index) => Array.from({ length: count }, () => ({ employeeId, dayKey: dayKeys[index] }))),
        );

        const result = buildFuelCashierTeamFeedback({
            standings,
            workingUserIds: ["u1", "u2", "u3"],
            feedbackResponses: [],
            recentWorkdays,
            recentFeedbackResponses,
        });

        const byUser = new Map(result.employees.map((employee) => [employee.userId, employee]));
        expect(byUser.get("u1")).toEqual(expect.objectContaining({
            rollingWorkdayCount: 5,
            rollingEvaluationCount: 20,
            rollingTargetCount: 25,
            cooperationRate: 80,
            cooperationStatus: "NORMAL",
        }));
        expect(byUser.get("u2")).toEqual(expect.objectContaining({
            rollingEvaluationCount: 15,
            cooperationRate: 60,
            cooperationStatus: "FOLLOW_UP",
        }));
        expect(byUser.get("u3")).toEqual(expect.objectContaining({
            rollingEvaluationCount: 9,
            cooperationRate: 36,
            cooperationStatus: "EXPLAIN",
        }));
        expect(result.teamFollowUpCount).toBe(1);
        expect(result.teamNeedsExplanationCount).toBe(1);
        expect(result.employees.slice(0, 2).map((employee) => employee.userId)).toEqual(["u3", "u2"]);
    });

    it("caps each workday at the daily target so one busy day cannot hide repeated zero days", () => {
        const dayKeys = ["2026-09-03", "2026-09-02", "2026-09-01", "2026-08-31", "2026-08-30"];
        const result = buildFuelCashierTeamFeedback({
            standings,
            workingUserIds: ["u1"],
            feedbackResponses: [],
            recentWorkdays: dayKeys.map((dayKey) => ({ userId: "u1", dayKey })),
            recentFeedbackResponses: Array.from({ length: 25 }, () => ({ employeeId: "u1", dayKey: dayKeys[0] })),
        });

        expect(result.employees[0]).toEqual(expect.objectContaining({
            rollingEvaluationCount: 5,
            rollingTargetCount: 25,
            cooperationRate: 20,
            cooperationStatus: "EXPLAIN",
        }));
    });

    it("does not label an employee uncooperative before five worked days are available", () => {
        const result = buildFuelCashierTeamFeedback({
            standings,
            workingUserIds: ["u1"],
            feedbackResponses: [],
            recentWorkdays: [
                { userId: "u1", dayKey: "2026-09-03" },
                { userId: "u1", dayKey: "2026-09-02" },
                { userId: "u1", dayKey: "2026-09-01" },
                { userId: "u1", dayKey: "2026-08-31" },
            ],
            recentFeedbackResponses: [],
        });

        expect(result.employees[0]).toEqual(expect.objectContaining({
            rollingWorkdayCount: 4,
            cooperationRate: 0,
            cooperationStatus: "BUILDING",
        }));
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
