import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    accessMock,
    stationFindManyMock,
    periodFindManyMock,
    awardFindManyMock,
    calculateLeagueMock,
} = vi.hoisted(() => ({
    accessMock: vi.fn(),
    stationFindManyMock: vi.fn(),
    periodFindManyMock: vi.fn(),
    awardFindManyMock: vi.fn(),
    calculateLeagueMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: accessMock,
    getStationScope: vi.fn(),
}));

vi.mock("@/lib/competition/league", () => ({
    calculateStationWeeklyLeague: calculateLeagueMock,
    finalizeCompetitionPeriodRanking: vi.fn(),
    getBangkokWeekBounds: () => ({
        key: "2026-08-31",
        from: new Date("2026-08-30T17:00:00.000Z"),
        to: new Date("2026-09-06T17:00:00.000Z"),
    }),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        station: { findMany: stationFindManyMock },
        competitionPeriod: { findMany: periodFindManyMock },
        competitionAward: { findMany: awardFindManyMock },
    },
}));

import { GET } from "./route";

const ownStation = { id: "station-own", code: "WKO", name: "วัชรเกียรติ" };
const otherStation = { id: "station-other", code: "PAP", name: "พงษ์อนันต์" };

function leagueFor(station = ownStation) {
    return {
        station,
        standings: [{
            userId: "employee-1",
            employeeId: "EMP001",
            name: "Employee One",
            nickName: "หนึ่ง",
            label: "หนึ่ง",
            totalScore: 88.5,
            workPoints: 59,
            customerPoints: 22,
            missionPoints: 7.5,
            eligibleCustomerCount: 12,
            excludedRepeatCustomerCount: 0,
            suspiciousCustomerCount: 0,
            requiredDays: 5,
            presentDays: 5,
            missionCompletedDays: 4,
            customerMinimumSample: 10,
            customerScore64: 56,
            isEligible: true,
            isRewardEligible: true,
            rewardEligibilityReason: "ELIGIBLE",
            rewardPointsPreview: 10,
            isProvisional: true,
            fairPlayStatus: "CLEAR",
            fairPlayReasons: [],
            rank: 1,
        }],
    };
}

describe("admin league ranking access", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        periodFindManyMock.mockResolvedValue([]);
        awardFindManyMock.mockResolvedValue([]);
        calculateLeagueMock.mockResolvedValue(leagueFor());
    });

    it("lets ADMIN select another station leaderboard", async () => {
        accessMock.mockResolvedValue({ ok: true, ctx: { userId: "admin-1", role: "ADMIN", stationId: null } });
        stationFindManyMock.mockResolvedValue([ownStation, otherStation]);
        calculateLeagueMock.mockResolvedValue(leagueFor(otherStation));

        const response = await GET(new NextRequest("http://localhost/api/admin/league?stationId=station-other"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.canSelectStation).toBe(true);
        expect(body.selectedStationId).toBe("station-other");
        expect(body.liveLeague.station.code).toBe("PAP");
        expect(calculateLeagueMock).toHaveBeenCalledWith(expect.objectContaining({ stationId: "station-other" }));
    });

    it("locks CASHIER to their own station and keeps the page read-only", async () => {
        accessMock.mockResolvedValue({ ok: true, ctx: { userId: "cashier-1", role: "CASHIER", stationId: "station-own" } });
        stationFindManyMock.mockResolvedValue([ownStation]);
        calculateLeagueMock.mockResolvedValue(leagueFor(ownStation));

        const response = await GET(new NextRequest("http://localhost/api/admin/league?stationId=station-other"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.canSelectStation).toBe(false);
        expect(body.canManageFairPlay).toBe(false);
        expect(body.canManageRewards).toBe(false);
        expect(body.selectedStationId).toBe("station-own");
        expect(body.pendingPeriods).toEqual([]);
        expect(body.selectedAwards).toEqual([]);
        expect(stationFindManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ id: "station-own" }),
        }));
        expect(calculateLeagueMock).toHaveBeenCalledWith(expect.objectContaining({ stationId: "station-own" }));
    });
});
