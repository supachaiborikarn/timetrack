import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ period: vi.fn(), config: vi.fn(), users: vi.fn(), scores: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { station: { findUniqueOrThrow: vi.fn(async () => ({ code: "PAP" })) }, competitionPeriod: { findFirst: mocks.period }, systemConfig: { findUnique: mocks.config }, user: { findMany: mocks.users } } }));
vi.mock("@/lib/competition/league", () => ({ getBangkokWeekBounds: (date: Date) => ({ from: date, to: new Date(date.getTime() + 7 * 86400000) }) }));
vi.mock("@/lib/cashier-score-server", () => ({ calculateFuelCashierStationScoreForRange: mocks.scores }));
import { getCashierWeeklyReport } from "./cashier-weekly-report";
beforeEach(() => {
    vi.clearAllMocks();
    mocks.period.mockResolvedValue({ standings: [{ totalScore: 70 }, { totalScore: 90 }] });
    mocks.config.mockResolvedValue(null);
    mocks.users.mockResolvedValue([{ role: "CASHIER", employeeId: "FUEL001", name: "Fuel", nickName: null }, { role: "CASHIER", employeeId: "EMPE2D20", name: "Gas", nickName: null }]);
    mocks.scores.mockResolvedValue({ teamPerformanceScore: 95, relevantTeamMemberCount: 2, stationSummary: { score: null, responseCount: 0 }, restroomSummary: { score: null, responseCount: 0 } });
});
describe("historical cashier report", () => {
    it("uses closed employee scores for the requested week, grants 40 quality points and excludes gas cashiers", async () => {
        const report = await getCashierWeeklyReport("s1", "2026-08-31");
        expect(report.teamScore).toBe(80);
        expect(report.result.score).toBe(88);
        expect(report.cashiers).toEqual([{ employeeId: "FUEL001", label: "Fuel" }]);
        expect(mocks.period).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ status: "FINALIZED", periodKey: "2026-08-31", stationId: "s1" }) }));
    });
    it("does not invent a team score when no finalized employee result exists", async () => {
        mocks.period.mockResolvedValue(null);
        expect((await getCashierWeeklyReport("s1", "2026-08-31")).result.score).toBeNull();
    });
    it("does not carry the full-score grant into another week", async () => {
        const report = await getCashierWeeklyReport("s1", "2026-09-07");
        expect(report.teamScore).toBe(95);
        expect(report.result.score).toBeNull();
    });
});
