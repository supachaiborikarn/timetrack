import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    periodFindUnique: vi.fn(), standingFindMany: vi.fn(), transaction: vi.fn(),
    standingUpdateMany: vi.fn(), standingUpdate: vi.fn(), periodUpdate: vi.fn(),
    awardUpsert: vi.fn(), notificationFindFirst: vi.fn(), notificationCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {
    competitionPeriod: { findUnique: mocks.periodFindUnique },
    competitionStanding: { findMany: mocks.standingFindMany },
    competitionAward: { upsert: mocks.awardUpsert },
    notification: { findFirst: mocks.notificationFindFirst, create: mocks.notificationCreate },
    $transaction: mocks.transaction,
} }));
vi.mock("@/lib/cashier-score-server", () => ({ calculateFuelCashierStationScoreForRange: vi.fn() }));

import { finalizeCompetitionPeriodRanking } from "./league";
import { FUEL_CASHIER_RP_READY_REASON } from "./reward-policy";

describe("weekly fuel-cashier RP finalization", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.periodFindUnique.mockResolvedValue({
            id: "period-1", type: "WEEKLY_STATION", periodKey: "2026-09-07", stationId: "station-1",
        });
        mocks.standingFindMany
            .mockResolvedValueOnce([{ id: "cashier-standing", userId: "cashier-1", totalScore: 85, fairPlayReasons: [FUEL_CASHIER_RP_READY_REASON] }])
            .mockResolvedValueOnce([{ id: "front-standing", userId: "front-1", totalScore: 92, customerPoints: 23 }]);
        mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            competitionStanding: { updateMany: mocks.standingUpdateMany, update: mocks.standingUpdate },
            competitionPeriod: { update: mocks.periodUpdate },
        }));
        mocks.awardUpsert.mockResolvedValue({ id: "award-1" });
        mocks.notificationFindFirst.mockResolvedValue(null);
        mocks.notificationCreate.mockResolvedValue({ id: "notification-1" });
    });

    it("awards cashier RP from the same score tiers without giving a League rank or championship points", async () => {
        const result = await finalizeCompetitionPeriodRanking("period-1");

        expect(result.winner?.userId).toBe("front-1");
        expect(mocks.standingFindMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
            where: { periodId: "period-1", fairPlayReasons: { has: FUEL_CASHIER_RP_READY_REASON } },
        }));
        expect(mocks.standingUpdate).toHaveBeenCalledWith({
            where: { id: "front-standing" },
            data: { finalRank: 1, championshipPoints: 10, rewardPoints: 30 },
        });
        expect(mocks.standingUpdate).toHaveBeenCalledWith({
            where: { id: "cashier-standing" },
            data: { finalRank: null, championshipPoints: 0, rewardPoints: 20 },
        });
        expect(mocks.awardUpsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { periodId_userId_awardType: { periodId: "period-1", userId: "front-1", awardType: "WEEKLY_CHAMPION" } },
        }));
    });
});
