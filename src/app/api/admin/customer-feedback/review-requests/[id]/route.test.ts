import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    requestFindUniqueMock,
    requestUpdateManyMock,
    auditCreateMock,
    transactionMock,
} = vi.hoisted(() => ({
    requestFindUniqueMock: vi.fn(),
    requestUpdateManyMock: vi.fn(),
    auditCreateMock: vi.fn(),
    transactionMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: vi.fn(async () => ({
        ok: true,
        ctx: { userId: "hr-1", role: "HR", stationId: null },
    })),
    requireFeedbackPermission: vi.fn(async () => ({ ok: true })),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackReviewRequest: { findUnique: requestFindUniqueMock },
        $transaction: transactionMock,
    },
}));

import { PATCH } from "./route";

describe("admin customer feedback review request updates", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        requestFindUniqueMock.mockResolvedValue({ id: "request-1", status: "OPEN" });
        requestUpdateManyMock.mockResolvedValue({ count: 1 });
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            customerFeedbackReviewRequest: { updateMany: requestUpdateManyMock },
            auditLog: { create: auditCreateMock },
        }));
    });

    it("updates conditionally and writes an audit in the same transaction", async () => {
        const response = await PATCH(new NextRequest("http://localhost/api/admin/customer-feedback/review-requests/request-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "resolve", resolutionNote: "ตรวจสอบข้อมูลแล้ว" }),
        }), { params: Promise.resolve({ id: "request-1" }) });

        expect(response.status).toBe(200);
        expect(requestUpdateManyMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "request-1", status: { in: ["OPEN", "IN_REVIEW"] } },
        }));
        expect(auditCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                action: "CUSTOMER_FEEDBACK_REVIEW_REQUEST_UPDATED",
                entityId: "request-1",
                userId: "hr-1",
            }),
        });
    });

    it("returns 409 and writes no audit when another reviewer closes first", async () => {
        requestUpdateManyMock.mockResolvedValue({ count: 0 });

        const response = await PATCH(new NextRequest("http://localhost/api/admin/customer-feedback/review-requests/request-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "dismiss", dismissedReason: "ข้อมูลไม่เข้าเกณฑ์" }),
        }), { params: Promise.resolve({ id: "request-1" }) });

        expect(response.status).toBe(409);
        expect(auditCreateMock).not.toHaveBeenCalled();
    });

    it("claims an open request once and returns 409 when a second reviewer loses the race", async () => {
        const firstResponse = await PATCH(new NextRequest("http://localhost/api/admin/customer-feedback/review-requests/request-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "start" }),
        }), { params: Promise.resolve({ id: "request-1" }) });

        expect(firstResponse.status).toBe(200);
        expect(requestUpdateManyMock).toHaveBeenLastCalledWith(expect.objectContaining({
            where: { id: "request-1", status: "OPEN" },
        }));

        requestUpdateManyMock.mockResolvedValueOnce({ count: 0 });
        const secondResponse = await PATCH(new NextRequest("http://localhost/api/admin/customer-feedback/review-requests/request-1", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "start" }),
        }), { params: Promise.resolve({ id: "request-1" }) });

        expect(secondResponse.status).toBe(409);
        expect(auditCreateMock).toHaveBeenCalledTimes(1);
    });
});
