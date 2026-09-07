import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(), userFindUnique: vi.fn(), calculateLeague: vi.fn(), transaction: vi.fn(),
    itemFindUnique: vi.fn(), earningsFindMany: vi.fn(), spentAggregate: vi.fn(), redemptionCreate: vi.fn(), auditCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/competition/league", () => ({
    getBangkokWeekBounds: vi.fn(() => ({ from: new Date("2026-09-06T17:00:00.000Z"), to: new Date("2026-09-13T17:00:00.000Z") })),
    calculateStationWeeklyLeague: mocks.calculateLeague,
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
    user: { findUnique: mocks.userFindUnique },
    $transaction: mocks.transaction,
} }));

import { POST } from "./route";

const request = () => new NextRequest("http://localhost/api/league/points/redeem", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rewardItemId: "reward-1" }),
});

describe("fuel cashier RP redemption", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { id: "cashier-1" } });
        mocks.userFindUnique.mockResolvedValue({
            id: "cashier-1", role: "CASHIER", employeeId: "CASH001", stationId: "station-1",
            isActive: true, employeeStatus: "ACTIVE", department: { isFrontYard: false },
        });
        mocks.itemFindUnique.mockResolvedValue({ id: "reward-1", title: "แก้วน้ำ", pointsCost: 50, stock: null, isActive: true });
        mocks.earningsFindMany.mockResolvedValue([{ rewardPoints: 100 }]);
        mocks.spentAggregate.mockResolvedValue({ _sum: { pointsCost: 20 } });
        mocks.redemptionCreate.mockResolvedValue({ id: "redeem-1", pointsCost: 50, rewardTitleSnapshot: "แก้วน้ำ", status: "PENDING", createdAt: new Date() });
        mocks.auditCreate.mockResolvedValue({ id: "audit-1" });
        mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            rewardCatalogItem: { findUnique: mocks.itemFindUnique, updateMany: vi.fn() },
            competitionStanding: { findMany: mocks.earningsFindMany },
            rewardRedemption: { aggregate: mocks.spentAggregate, create: mocks.redemptionCreate },
            auditLog: { create: mocks.auditCreate },
        }));
    });

    it("lets a normal fuel cashier spend confirmed RP without requiring a personal weekly League standing", async () => {
        const response = await POST(request());
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(mocks.calculateLeague).not.toHaveBeenCalled();
        expect(mocks.redemptionCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
            userId: "cashier-1", stationId: "station-1", rewardItemId: "reward-1", pointsCost: 50,
        }) }));
    });

    it("keeps a department-scoped gas cashier out of RP redemption", async () => {
        mocks.userFindUnique.mockResolvedValue({
            id: "gas-cashier", role: "CASHIER", employeeId: "EMPE2D20", stationId: "station-1",
            isActive: true, employeeStatus: "ACTIVE", department: { isFrontYard: false },
        });
        const response = await POST(request());
        expect(response.status).toBe(403);
        expect(mocks.transaction).not.toHaveBeenCalled();
        expect(mocks.calculateLeague).not.toHaveBeenCalled();
    });

    it("preserves the weekly reward-eligibility gate for front-yard employees", async () => {
        mocks.userFindUnique.mockResolvedValue({
            id: "front-1", role: "EMPLOYEE", employeeId: "EMP001", stationId: "station-1",
            isActive: true, employeeStatus: "ACTIVE", department: { isFrontYard: true },
        });
        mocks.calculateLeague.mockResolvedValue({ standings: [{ userId: "front-1", isRewardEligible: false, rewardEligibilityReason: "INSUFFICIENT_CUSTOMER_SAMPLE" }] });
        const response = await POST(request());
        const body = await response.json();
        expect(response.status).toBe(403);
        expect(body.reason).toBe("INSUFFICIENT_CUSTOMER_SAMPLE");
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
});
