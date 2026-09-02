import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    accessMock,
    caseFindUniqueMock,
    userFindUniqueMock,
    stationFindUniqueMock,
    caseUpdateManyMock,
    caseCountMock,
    contactUpdateMock,
    auditCreateMock,
    transactionMock,
} = vi.hoisted(() => ({
    accessMock: vi.fn(),
    caseFindUniqueMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    stationFindUniqueMock: vi.fn(),
    caseUpdateManyMock: vi.fn(),
    caseCountMock: vi.fn(),
    contactUpdateMock: vi.fn(),
    auditCreateMock: vi.fn(),
    transactionMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: accessMock,
    requireFeedbackPermission: vi.fn(async () => ({ ok: true })),
    getStationScope: vi.fn(async (ctx: { role: string; stationId: string | null }) => ({
        ok: true,
        stationId: ctx.role === "MANAGER" ? ctx.stationId : null,
    })),
    canViewFeedbackIncident: vi.fn(async () => true),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackCase: { findUnique: caseFindUniqueMock },
        user: { findUnique: userFindUniqueMock },
        station: { findUnique: stationFindUniqueMock },
        $transaction: transactionMock,
    },
}));

import { PATCH } from "./route";

const existingCase = {
    id: "case-1",
    responseId: "response-1",
    stationId: "station-own",
    status: "OPEN",
    acknowledgedAt: null,
    response: { id: "response-1", kind: "STANDARD", contact: null },
};

function patchRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/admin/customer-feedback/cases/case-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("customer feedback case updates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-own" },
        });
        caseFindUniqueMock.mockResolvedValue(existingCase);
        userFindUniqueMock.mockResolvedValue({ id: "assignee-1", isActive: true, role: "MANAGER", stationId: "station-own" });
        stationFindUniqueMock.mockResolvedValue({ id: "station-own", isActive: true });
        caseUpdateManyMock.mockResolvedValue({ count: 1 });
        caseCountMock.mockResolvedValue(0);
        contactUpdateMock.mockResolvedValue({});
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            customerFeedbackCase: { updateMany: caseUpdateManyMock, count: caseCountMock },
            customerFeedbackContact: { update: contactUpdateMock },
            auditLog: { create: auditCreateMock },
        }));
    });

    it("rejects an assignee from another station", async () => {
        userFindUniqueMock.mockResolvedValue({ id: "assignee-other", isActive: true, role: "MANAGER", stationId: "station-other" });

        const response = await PATCH(patchRequest({ action: "assign", assignedToId: "assignee-other" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(response.status).toBe(403);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("allows ADMIN or HR to own a station case", async () => {
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "admin-1", role: "ADMIN", stationId: null },
        });
        userFindUniqueMock.mockResolvedValue({ id: "hr-1", isActive: true, role: "HR", stationId: null });

        const response = await PATCH(patchRequest({ action: "assign", assignedToId: "hr-1" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(response.status).toBe(200);
        expect(caseUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "case-1", stationId: "station-own", status: { in: ["OPEN", "IN_PROGRESS"] } },
            data: { assignedToId: "hr-1" },
        }));
    });

    it("uses a conditional status update and returns 409 when another user closes first", async () => {
        caseUpdateManyMock.mockResolvedValue({ count: 0 });

        const response = await PATCH(patchRequest({ action: "resolve", resolutionNote: "จัดการเรียบร้อยแล้ว" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(caseUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "case-1", stationId: "station-own", status: { in: ["OPEN", "IN_PROGRESS"] } },
        }));
        expect(response.status).toBe(409);
        expect(auditCreateMock).not.toHaveBeenCalled();
    });

    it("serializes audit details so case actions commit successfully", async () => {
        const response = await PATCH(patchRequest({ action: "start" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(response.status).toBe(200);
        expect(auditCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "CUSTOMER_FEEDBACK_CASE_UPDATED",
                entity: "CustomerFeedbackCase",
                entityId: "case-1",
                details: JSON.stringify({ action: "start" }),
                userId: "manager-1",
            }),
        });
    });

    it("rejects an inactive station when assigning a previously unscoped case", async () => {
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "hr-1", role: "HR", stationId: null },
        });
        caseFindUniqueMock.mockResolvedValue({ ...existingCase, stationId: null });
        stationFindUniqueMock.mockResolvedValue({ id: "station-closed", isActive: false });

        const response = await PATCH(patchRequest({ action: "set-station", stationId: "station-closed" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(response.status).toBe(400);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("clears the old assignee and conditionally moves an unscoped case", async () => {
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "hr-1", role: "HR", stationId: null },
        });
        caseFindUniqueMock.mockResolvedValue({ ...existingCase, stationId: null, assignedToId: "manager-old" });
        stationFindUniqueMock.mockResolvedValue({ id: "station-new", isActive: true });

        const response = await PATCH(patchRequest({ action: "set-station", stationId: "station-new" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(response.status).toBe(200);
        expect(caseUpdateManyMock).toHaveBeenCalledWith({
            where: { id: "case-1", stationId: null, status: { in: ["OPEN", "IN_PROGRESS"] } },
            data: { stationId: "station-new", assignedToId: null },
        });
    });

    it("does not move a closed unscoped case", async () => {
        accessMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "hr-1", role: "HR", stationId: null },
        });
        caseFindUniqueMock.mockResolvedValue({ ...existingCase, stationId: null, status: "RESOLVED" });

        const response = await PATCH(patchRequest({ action: "set-station", stationId: "station-new" }), {
            params: Promise.resolve({ id: "case-1" }),
        });

        expect(response.status).toBe(409);
        expect(transactionMock).not.toHaveBeenCalled();
    });
});
