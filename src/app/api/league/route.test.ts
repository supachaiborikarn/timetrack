import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(), user: vi.fn(), period: vi.fn(), latest: vi.fn(), calculate: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: {
    user: { findUnique: mocks.user },
    competitionPeriod: { findUnique: mocks.period, findFirst: mocks.latest },
    competitionAward: { findMany: vi.fn().mockResolvedValue([]) },
} }));
vi.mock("@/lib/competition/league", async (importOriginal) => ({
    ...await importOriginal<typeof import("@/lib/competition/league")>(),
    calculateStationWeeklyLeague: mocks.calculate,
    getMonthlyStationLeaderboard: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/competition/reward-wallet", () => ({
    getRewardWalletForUser: vi.fn().mockResolvedValue({ balance: 0 }),
    getRewardCatalog: vi.fn().mockResolvedValue({ featured: null, items: [] }),
}));

import { GET } from "./route";

describe("employee weekly result API", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-07T00:40:00Z"));
        mocks.auth.mockResolvedValue({ user: { id: "employee-1" } });
        mocks.user.mockResolvedValue({ id: "employee-1", stationId: "station-own", station: { id: "station-own" }, department: { isFrontYard: true } });
        mocks.period.mockResolvedValue(null);
        mocks.latest.mockResolvedValue(null);
        mocks.calculate.mockImplementation(async ({ from }) => ({
            station: { id: "station-own" },
            standings: [{
                userId: "employee-1", label: "หนึ่ง", totalScore: from.toISOString() === "2026-08-30T17:00:00.000Z" ? 88.5 : 0,
                rank: 1, isEligible: true, fairPlayStatus: "CLEAR", fairPlayReasons: ["private"],
            }],
        }));
    });

    afterEach(() => vi.useRealTimers());

    it("returns both Monday's current score and the closed week's score without announcing a premature champion", async () => {
        const response = await GET();
        const body = await response.json();
        expect(body.weekly.me.totalScore).toBe(0);
        expect(body.previousWeekly).toMatchObject({ periodKey: "2026-08-31", status: "AWAITING_FINALIZATION", standings: [{ totalScore: 88.5, finalRank: null }] });
        expect(body.previousWeekly.standings[0]).not.toHaveProperty("userId");
        expect(body.previousWeekly.standings[0]).not.toHaveProperty("fairPlayReasons");
        expect(body.latestWeekly).toBeNull();
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });

    it("limits both historical scores and the retained champion to the employee's station", async () => {
        await GET();
        expect(mocks.period).toHaveBeenCalledWith(expect.objectContaining({
            where: { type_periodKey_stationId: { type: "WEEKLY_STATION", stationId: "station-own", periodKey: "2026-08-31" } },
        }));
        expect(mocks.latest).toHaveBeenCalledWith(expect.objectContaining({
            where: { type: "WEEKLY_STATION", stationId: "station-own", status: "FINALIZED", standings: { some: { finalRank: 1 } } },
        }));
    });

    it("rejects unauthenticated requests before reading scores", async () => {
        mocks.auth.mockResolvedValue(null);
        expect((await GET()).status).toBe(401);
        expect(mocks.period).not.toHaveBeenCalled();
    });

    it("does not disclose League results to an employee outside the front yard", async () => {
        mocks.user.mockResolvedValue({ stationId: "station-own", station: {}, department: { isFrontYard: false } });
        expect(await (await GET()).json()).toEqual({ eligible: false, reason: "NOT_FRONT_YARD" });
        expect(mocks.period).not.toHaveBeenCalled();
    });
});
