import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), user: vi.fn(), wallet: vi.fn(), catalog: vi.fn(), cashierScore: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: mocks.user } } }));
vi.mock("@/lib/competition/league", () => ({ getBangkokWeekBounds: vi.fn(() => ({
    key: "2026-09-07", from: new Date("2026-09-06T17:00:00.000Z"), to: new Date("2026-09-13T17:00:00.000Z"),
})) }));
vi.mock("@/lib/cashier-score-server", () => ({ calculateFuelCashierStationScoreForRange: mocks.cashierScore }));
vi.mock("@/lib/competition/reward-wallet", () => ({ getRewardWalletForUser: mocks.wallet, getRewardCatalog: mocks.catalog }));

import { GET } from "./route";

describe("cashier reward-points summary", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { id: "cashier-1" } });
        mocks.user.mockResolvedValue({
            id: "cashier-1", role: "CASHIER", employeeId: "CASH001", stationId: "station-1", isActive: true, employeeStatus: "ACTIVE",
            station: { code: "WKO" },
        });
        mocks.wallet.mockResolvedValue({ earnedPoints: 100, spentPoints: 20, balance: 80, recentEarnings: [], recentRedemptions: [] });
        mocks.catalog.mockResolvedValue({ featured: { id: "reward-1", title: "แก้วน้ำ", pointsCost: 50, stock: 2 }, items: [{ id: "reward-1" }] });
        mocks.cashierScore.mockResolvedValue({ score: { score: 84, forecastScore: 84, knownWeight: 100 } });
    });

    it("shows a normal fuel cashier the existing wallet and reward catalog", async () => {
        const response = await GET();
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            enabled: true, wallet: { balance: 80 }, catalogCount: 1, canRedeem: true,
            weekly: { score: 84, forecastScore: 84, knownWeight: 100, rewardPointsPreview: 20, ready: true },
        });
        expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    });

    it("does not expose the wallet to a department-scoped gas cashier", async () => {
        mocks.user.mockResolvedValue({
            id: "gas-1", role: "CASHIER", employeeId: "EMPE2D20", stationId: "station-1", isActive: true, employeeStatus: "ACTIVE", station: { code: "PAP" },
        });
        const body = await (await GET()).json();
        expect(body).toEqual({ enabled: false, reason: "NOT_FUEL_CASHIER" });
        expect(mocks.wallet).not.toHaveBeenCalled();
        expect(mocks.catalog).not.toHaveBeenCalled();
        expect(mocks.cashierScore).not.toHaveBeenCalled();
    });
});
