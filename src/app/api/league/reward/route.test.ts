import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(), findAward: vi.fn(), claimAward: vi.fn(), selectedAward: vi.fn(),
    notify: vi.fn(), redeemPoints: vi.fn(), updateStanding: vi.fn(), configFindUnique: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: {
    competitionAward: { findFirst: mocks.findAward, updateMany: mocks.claimAward, findUniqueOrThrow: mocks.selectedAward },
    notification: { create: mocks.notify },
    rewardRedemption: { create: mocks.redeemPoints },
    competitionStanding: { update: mocks.updateStanding },
    systemConfig: { findUnique: mocks.configFindUnique },
} }));

import { POST } from "./route";

const award = { id: "weekly-award", userId: "champion", awardType: "WEEKLY_CHAMPION", status: "AVAILABLE", period: { periodKey: "2026-09" } };
function chooseReward(rewardCode: string) {
    return POST(new NextRequest("http://localhost/api/league/reward", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awardId: award.id, rewardCode }),
    }));
}

function chooseCash() {
    return chooseReward("CASH_300");
}

describe("weekly champion cash reward", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.auth.mockResolvedValue({ user: { id: "champion" } });
        mocks.findAward.mockResolvedValue(award);
        mocks.claimAward.mockResolvedValue({ count: 1 });
        mocks.selectedAward.mockResolvedValue({ ...award, status: "SELECTED", rewardCode: "CASH_300", rewardLabel: "เงินสด 300 บาท", rewardValueBaht: 300 });
        mocks.notify.mockResolvedValue({});
        mocks.configFindUnique.mockResolvedValue(null);
    });

    it("lets an existing weekly champion choose cash without spending RP or changing league points", async () => {
        const response = await chooseCash();
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ ok: true, award: { status: "SELECTED", rewardCode: "CASH_300", rewardLabel: "เงินสด 300 บาท", rewardValueBaht: 300 } });
        expect(mocks.findAward).toHaveBeenCalledWith({ where: { id: award.id, userId: "champion" }, include: { period: { select: { periodKey: true } } } });
        expect(mocks.claimAward).toHaveBeenCalledWith({
            where: { id: award.id, userId: "champion", status: "AVAILABLE" },
            data: { rewardCode: "CASH_300", rewardLabel: "เงินสด 300 บาท", rewardValueBaht: 300, status: "SELECTED", selectedAt: expect.any(Date) },
        });
        expect(mocks.redeemPoints).not.toHaveBeenCalled();
        expect(mocks.updateStanding).not.toHaveBeenCalled();
    });

    it("rejects the weekly cash option for a monthly champion award", async () => {
        mocks.findAward.mockResolvedValue({ ...award, awardType: "MONTHLY_STATION_CHAMPION" });
        expect((await chooseCash()).status).toBe(400);
        expect(mocks.claimAward).not.toHaveBeenCalled();
    });

    it("uses the admin-configured monthly Championship reward for that award period", async () => {
        mocks.findAward.mockResolvedValue({ ...award, awardType: "MONTHLY_STATION_CHAMPION", period: { periodKey: "2026-09" } });
        mocks.configFindUnique.mockResolvedValue({ value: JSON.stringify([{ label: "เงินสด 900 บาท", description: "รางวัลเดือนกันยายน", valueBaht: 900 }]) });
        mocks.selectedAward.mockResolvedValue({ ...award, status: "SELECTED", rewardCode: "ADMIN_OPTION_1", rewardLabel: "เงินสด 900 บาท", rewardValueBaht: 900 });

        const response = await chooseReward("ADMIN_OPTION_1");
        expect(response.status).toBe(200);
        expect(mocks.claimAward).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ rewardCode: "ADMIN_OPTION_1", rewardLabel: "เงินสด 900 บาท", rewardValueBaht: 900 }),
        }));
    });

    it("does not replace an already selected reward with cash", async () => {
        mocks.findAward.mockResolvedValue({ ...award, status: "SELECTED", rewardCode: "CHAMPION_MEAL" });
        expect((await chooseCash()).status).toBe(409);
        expect(mocks.claimAward).not.toHaveBeenCalled();
    });

    it("does not let an employee choose another champion's award", async () => {
        mocks.findAward.mockResolvedValue(null);
        expect((await chooseCash()).status).toBe(404);
        expect(mocks.claimAward).not.toHaveBeenCalled();
    });
});
