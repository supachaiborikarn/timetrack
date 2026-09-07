import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ access: vi.fn(), station: vi.fn(), report: vi.fn(), transaction: vi.fn(), config: vi.fn(), upsert: vi.fn(), audit: vi.fn() }));
vi.mock("@/lib/customer-feedback/access", () => ({ getFeedbackAccessContext: mocks.access }));
vi.mock("@/lib/cashier-weekly-report", () => ({ getCashierWeeklyReport: mocks.report, cashierOverrideKey: (station: string, week: string) => `${station}:${week}` }));
vi.mock("@/lib/competition/league", () => ({ getBangkokWeekBounds: () => ({ key: "2026-09-07" }), getPreviousBangkokWeekBounds: () => ({ key: "2026-08-31" }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { station: { findUnique: mocks.station }, $transaction: mocks.transaction } }));
import { GET, PUT } from "./route";
const request = (changes = {}) => new NextRequest("http://localhost/api/admin/cashier-scores", { method: "PUT", body: JSON.stringify({ stationId: "s1", periodKey: "2026-09-07", station: 80, restroom: 90, ...changes }) });
beforeEach(() => {
    vi.clearAllMocks();
    mocks.access.mockResolvedValue({ ok: true, ctx: { userId: "admin1", role: "ADMIN", stationId: null } });
    mocks.station.mockResolvedValue({ id: "s1" });
    mocks.report.mockResolvedValue({ station: { responseCount: 0 }, restroom: { responseCount: 0 } });
    mocks.transaction.mockImplementation(async (fn) => fn({ systemConfig: { findUnique: mocks.config, upsert: mocks.upsert }, auditLog: { create: mocks.audit } }));
});
describe("cashier manual scores", () => {
    it("denies cashier writes and forces own station for reads", async () => {
        mocks.access.mockResolvedValue({ ok: true, ctx: { userId: "c1", role: "CASHIER", stationId: "own" } });
        expect((await PUT(request())).status).toBe(403);
        await GET(new NextRequest("http://localhost/api/admin/cashier-scores?stationId=other"));
        expect(mocks.report).toHaveBeenCalledWith("own", "2026-08-31");
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
    it("rejects invalid numbers and unsupported weeks", async () => {
        for (const values of [{ station: 101 }, { restroom: -1 }, { station: "80" }, { periodKey: "2026-08-24" }]) expect((await PUT(request(values))).status).toBe(400);
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
    it("does not replace a customer's assessment even below sample minimum", async () => {
        mocks.report.mockResolvedValue({ station: { responseCount: 1 }, restroom: { responseCount: 0 } });
        expect((await PUT(request())).status).toBe(409);
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
    it("saves with an audit record atomically including zero and clear values", async () => {
        expect((await PUT(request({ station: 0, restroom: null }))).status).toBe(200);
        expect(mocks.upsert).toHaveBeenCalledOnce();
        expect(mocks.audit).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: "admin1", action: "CASHIER_QUALITY_SCORE_UPDATED" }) }));
    });
});
