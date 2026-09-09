import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    responseFindUniqueMock,
    responseUpdateManyMock,
    auditCreateMock,
    transactionMock,
} = vi.hoisted(() => ({
    responseFindUniqueMock: vi.fn(),
    responseUpdateManyMock: vi.fn(),
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
    getStationScope: vi.fn(async () => ({ ok: true, stationId: null })),
    canViewFeedbackIncident: vi.fn(async () => false),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackResponse: { findUnique: responseFindUniqueMock },
        $transaction: transactionMock,
    },
}));

import { PATCH } from "./route";

function patch(validity: "VALID" | "SUSPECTED" | "HIDDEN", reason?: string) {
    return new NextRequest("http://localhost/api/admin/customer-feedback/responses/response-1", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ validity, reason }),
    });
}

describe("customer feedback moderation after Fair Play adjudication", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        responseUpdateManyMock.mockResolvedValue({ count: 1 });
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            customerFeedbackResponse: { updateMany: responseUpdateManyMock },
            auditLog: { create: auditCreateMock },
        }));
    });

    it("blocks restoring a response that has a confirmed Fair Play violation", async () => {
        responseFindUniqueMock.mockResolvedValue({
            id: "response-1",
            stationId: "station-1",
            validity: "HIDDEN",
            kind: "STANDARD",
            fairPlayReviews: [{ id: "fp-1" }],
        });

        const response = await PATCH(patch("VALID"), { params: Promise.resolve({ id: "response-1" }) });

        expect(response.status).toBe(409);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("uses a database relation guard when restoring a non-Fair-Play hidden response", async () => {
        responseFindUniqueMock.mockResolvedValue({
            id: "response-1",
            stationId: "station-1",
            validity: "HIDDEN",
            kind: "STANDARD",
            fairPlayReviews: [],
        });

        const response = await PATCH(patch("VALID"), { params: Promise.resolve({ id: "response-1" }) });

        expect(response.status).toBe(200);
        expect(responseUpdateManyMock).toHaveBeenCalledWith({
            where: {
                id: "response-1",
                validity: "HIDDEN",
                fairPlayReviews: { none: { status: "CONFIRMED" } },
            },
            data: { validity: "VALID" },
        });
    });
});
