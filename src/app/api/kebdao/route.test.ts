import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => {
    const db = {
        user: { findUnique: vi.fn(), findMany: vi.fn() },
        kebdaoRegistration: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
        kebdaoOutlet: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
        kebdaoCodeOwner: { findUnique: vi.fn(), create: vi.fn() },
        storedAsset: { findMany: vi.fn(), updateMany: vi.fn() },
        auditLog: { create: vi.fn() }, station: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn() },
    };
    return { db, auth: vi.fn(), permission: vi.fn(), transaction: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks.db, $transaction: mocks.transaction } }));
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/permissions", () => ({ hasPermission: mocks.permission }));
import { GET, POST, PATCH } from "./route";
const actor = { id: "employee", role: "EMPLOYEE", stationId: "station-a", isActive: true, employeeStatus: "ACTIVE" };
const pending = { id: "request", userId: "other", stationId: "station-a", status: "PENDING", csrId: "039401" };
const body = { csrId: "039401", outletCode: "0394", reason: "ลงทะเบียน", assetIds: ["photo"], confirmed: true };
function req(method: string, value: object) { return new NextRequest("http://localhost/api/kebdao", { method, body: JSON.stringify(value) }); }
beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor.id } });
    mocks.db.user.findUnique.mockResolvedValue(actor);
    mocks.permission.mockResolvedValue(true);
    mocks.transaction.mockImplementation(async fn => fn(mocks.db));
    mocks.db.station.findUnique.mockResolvedValue({ code: "WKO", name: "วัชรเกียรติออยล์" });
    mocks.db.station.findMany.mockResolvedValue([{ id: "station-a", name: "วัชรเกียรติออยล์", code: "WKO" }]);
    mocks.db.kebdaoRegistration.create.mockResolvedValue({ id: "new" });
    mocks.db.storedAsset.findMany.mockResolvedValue([{ id: "photo" }]);
    mocks.db.kebdaoRegistration.findUnique.mockResolvedValue(pending);
});
describe("Kebdao registration API", () => {
    it("requires a session before reading data", async () => {
        mocks.auth.mockResolvedValue(null);
        expect((await GET(new NextRequest("http://localhost/api/kebdao"))).status).toBe(401);
        expect(mocks.db.kebdaoRegistration.findMany).not.toHaveBeenCalled();
    });
    it("requires registration permission before writing", async () => {
        mocks.permission.mockResolvedValue(false);
        expect((await POST(req("POST", body))).status).toBe(403);
        expect(mocks.transaction).not.toHaveBeenCalled();
    });
    it("preserves leading zeros and binds ownership to the session", async () => {
        expect((await POST(req("POST", { ...body, userId: "forged" }))).status).toBe(200);
        expect(mocks.db.kebdaoRegistration.create).toHaveBeenCalledWith({ data: expect.objectContaining({ csrId: "039401", outletCode: "0394", userId: "employee", pendingUserId: "employee", pendingCsrId: "039401" }) });
        expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "Serializable" });
    });
    it("rejects another employee's evidence", async () => {
        mocks.db.storedAsset.findMany.mockResolvedValue([]);
        expect((await POST(req("POST", body))).status).toBe(400);
        expect(mocks.db.kebdaoRegistration.create).not.toHaveBeenCalled();
        expect(mocks.db.storedAsset.findMany).toHaveBeenCalledWith({ where: expect.objectContaining({ ownerUserId: actor.id, uploadedById: actor.id, kebdaoRegistrationId: null }) });
    });
    it("does not disclose the owner of a conflicting code", async () => {
        mocks.db.kebdaoCodeOwner.findUnique.mockResolvedValue({ userId: "secret-owner" });
        const res = await POST(req("POST", body));
        expect(res.status).toBe(409); expect(JSON.stringify(await res.json())).not.toContain("secret-owner");
        expect(mocks.db.kebdaoRegistration.create).not.toHaveBeenCalled();
    });
    it("rejects a stale station ID from the client", async () => {
        expect((await POST(req("POST", { ...body, outletCode: "9999" }))).status).toBe(400);
        expect(mocks.db.kebdaoRegistration.create).not.toHaveBeenCalled();
    });
    it("keeps cashier review queries within the current database branch", async () => {
        mocks.db.user.findUnique.mockResolvedValue({ ...actor, role: "CASHIER" });
        mocks.db.kebdaoRegistration.findMany.mockResolvedValue([]);
        mocks.db.user.findMany.mockResolvedValue([]);
        expect((await GET(new NextRequest("http://localhost/api/kebdao?review=1"))).status).toBe(200);
        expect(mocks.db.kebdaoRegistration.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { stationId: "station-a" } }));
    });
    it("blocks cross-branch approvals", async () => {
        mocks.db.user.findUnique.mockResolvedValue({ ...actor, role: "CASHIER", stationId: "station-b" });
        expect((await PATCH(req("PATCH", { action: "approve", id: "request" }))).status).toBe(403);
        expect(mocks.db.kebdaoRegistration.update).not.toHaveBeenCalled();
    });
    it("blocks self-approval even for administrators", async () => {
        mocks.db.user.findUnique.mockResolvedValue({ ...actor, role: "ADMIN", id: "other" });
        expect((await PATCH(req("PATCH", { action: "approve", id: "request" }))).status).toBe(403);
    });
    it("releases pending reservations when rejected without touching active ownership", async () => {
        mocks.db.user.findUnique.mockResolvedValue({ ...actor, role: "CASHIER" });
        expect((await PATCH(req("PATCH", { action: "reject", id: "request", note: "รูปไม่ชัด" }))).status).toBe(200);
        expect(mocks.db.kebdaoRegistration.update).toHaveBeenCalledWith({ where: { id: "request" }, data: expect.objectContaining({ status: "REJECTED", pendingUserId: null, pendingCsrId: null }) });
        expect(mocks.db.kebdaoRegistration.updateMany).not.toHaveBeenCalled();
        expect(mocks.db.kebdaoCodeOwner.create).not.toHaveBeenCalled();
    });
    it("replaces active registration only on approval and preserves historical ownership", async () => {
        mocks.db.user.findUnique.mockResolvedValue({ ...actor, role: "CASHIER" });
        expect((await PATCH(req("PATCH", { action: "approve", id: "request" }))).status).toBe(200);
        expect(mocks.db.kebdaoCodeOwner.create).toHaveBeenCalledWith({ data: { csrId: "039401", userId: "other" } });
        expect(mocks.db.kebdaoRegistration.updateMany).toHaveBeenCalledWith({ where: { activeUserId: "other" }, data: { activeUserId: null, status: "REPLACED" } });
        expect(mocks.db.kebdaoRegistration.update).toHaveBeenCalledWith({ where: { id: "request" }, data: expect.objectContaining({ activeUserId: "other", reviewedById: actor.id, status: "ACTIVE" }) });
    });
    it.each(["P2002", "P2034"])("returns a retryable conflict for database race %s", async code => {
        mocks.transaction.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("conflict", { code, clientVersion: "5.22.0" }));
        expect((await POST(req("POST", body))).status).toBe(409);
    });
    it("only allows the owner to withdraw a pending request", async () => {
        expect((await PATCH(req("PATCH", { action: "withdraw", id: "request" }))).status).toBe(403);
    });
});
