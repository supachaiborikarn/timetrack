import { beforeEach, describe, expect, it, vi } from "vitest";

const { periodMock, leagueMock, latestMock } = vi.hoisted(() => ({ periodMock: vi.fn(), leagueMock: vi.fn(), latestMock: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { competitionPeriod: { findUnique: periodMock, findFirst: latestMock } } }));
vi.mock("./league", async (importOriginal) => ({
    ...await importOriginal<typeof import("./league")>(),
    calculateStationWeeklyLeague: leagueMock,
}));

import { getLatestWeeklyResult, getPreviousWeeklyResult } from "./weekly-results";

const monday = new Date("2026-09-07T00:40:00Z"); // 07:40 Bangkok, before the observed 07:52 finalization.
const standing = { userId: "winner", employeeLabelSnapshot: "หนึ่ง", totalScore: "88.50", finalRank: 1, isEligible: true, fairPlayStatus: "CLEAR" };

describe("previous weekly League results", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        periodMock.mockResolvedValue(null);
        leagueMock.mockResolvedValue({ standings: [{ label: "หนึ่ง", totalScore: 88.5, rank: 1, isEligible: true, fairPlayStatus: "CLEAR" }] });
    });

    it.each(["2026-09-06T17:00:00Z", "2026-09-07T00:40:00Z"])("retains the closed week's scores at %s without announcing a winner", async (time) => {
        const result = await getPreviousWeeklyResult("station-own", new Date(time));
        expect(result).toMatchObject({
            periodKey: "2026-08-31", status: "AWAITING_FINALIZATION", finalizedAt: null,
            announcementAt: "2026-09-07T00:30:00.000Z",
            standings: [{ totalScore: 88.5, finalRank: null }],
        });
        expect(leagueMock).toHaveBeenCalledWith({
            stationId: "station-own",
            from: new Date("2026-08-30T17:00:00Z"),
            to: new Date("2026-09-06T17:00:00Z"),
            referenceTime: new Date("2026-09-06T17:00:00Z"),
        });
    });

    it("does not present a partially written OPEN snapshot as a result", async () => {
        periodMock.mockResolvedValue({ status: "OPEN", finalizedAt: null, standings: [] });
        const result = await getPreviousWeeklyResult("station-own", monday);
        expect(result.standings).toHaveLength(1);
        expect(result.status).toBe("AWAITING_FINALIZATION");
    });

    it("uses frozen pending standings without leaking review details or final ranks", async () => {
        periodMock.mockResolvedValue({ status: "PENDING_REVIEW", finalizedAt: null, standings: [{ ...standing, fairPlayStatus: "REVIEW", fairPlayReasons: ["private"] }] });
        const result = await getPreviousWeeklyResult("station-own", monday);
        expect(result.status).toBe("PENDING_REVIEW");
        expect(result.standings[0]).toMatchObject({ totalScore: 88.5, finalRank: null, fairPlayStatus: "REVIEW" });
        expect(result.standings[0]).not.toHaveProperty("userId");
        expect(result.standings[0]).not.toHaveProperty("fairPlayReasons");
        expect(leagueMock).not.toHaveBeenCalled();
    });

    it("keeps finalized scores immutable even if live inputs change", async () => {
        periodMock.mockResolvedValue({ status: "FINALIZED", awards: [], finalizedAt: new Date("2026-09-07T00:52:26Z"), standings: [standing] });
        leagueMock.mockRejectedValue(new Error("Finalized results must not be recalculated"));
        const result = await getPreviousWeeklyResult("station-own", monday);
        expect(result).toMatchObject({ status: "FINALIZED", finalizedAt: "2026-09-07T00:52:26.000Z", standings: [{ totalScore: 88.5, finalRank: 1 }] });
        expect(leagueMock).not.toHaveBeenCalled();
    });

    it("retains scores when nobody qualifies for a final rank", async () => {
        periodMock.mockResolvedValue({ status: "FINALIZED", awards: [], finalizedAt: monday, standings: [{ ...standing, finalRank: null, isEligible: false, fairPlayStatus: "INELIGIBLE" }] });
        const result = await getPreviousWeeklyResult("station-own", monday);
        expect(result.standings[0]).toMatchObject({ totalScore: 88.5, finalRank: null, isEligible: false });
        expect(leagueMock).not.toHaveBeenCalled();
    });

    it("returns only the rank-1 employee's reward with the retained champion", async () => {
        latestMock.mockResolvedValue({
            periodKey: "2026-08-31", finalizedAt: monday, standings: [standing],
            awards: [
                { userId: "other", status: "FULFILLED", rewardLabel: "Wrong reward", rewardValueBaht: 700 },
                { userId: "winner", status: "SELECTED", rewardLabel: "Champion Meal", rewardValueBaht: 300 },
            ],
        });
        const result = await getLatestWeeklyResult("station-own");
        expect(result?.championReward).toEqual({ status: "SELECTED", rewardLabel: "Champion Meal", rewardValueBaht: 300 });
        expect(result?.standings[0]).not.toHaveProperty("userId");
    });

    it("returns fulfilled reward information for the closed week's champion", async () => {
        periodMock.mockResolvedValue({
            status: "FINALIZED", finalizedAt: monday, standings: [standing],
            awards: [{ userId: "winner", status: "FULFILLED", rewardLabel: "Mystery Reward", rewardValueBaht: 300 }],
        });
        const result = await getPreviousWeeklyResult("station-own", monday);
        expect(result.championReward).toEqual({ status: "FULFILLED", rewardLabel: "Mystery Reward", rewardValueBaht: 300 });
    });
});
