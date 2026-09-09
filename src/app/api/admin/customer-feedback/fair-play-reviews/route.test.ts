import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    responseFindUniqueMock,
    reviewFindFirstMock,
    reviewCreateMock,
    auditCreateMock,
    transactionMock,
    accessContextMock,
} = vi.hoisted(() => ({
    responseFindUniqueMock: vi.fn(),
    reviewFindFirstMock: vi.fn(),
    reviewCreateMock: vi.fn(),
    auditCreateMock: vi.fn(),
    transactionMock: vi.fn(),
    accessContextMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({ isCustomerFeedbackEnabled: () => true }));
vi.mock("@/lib/customer-feedback/access", () => ({
    getFeedbackAccessContext: accessContextMock,
    requireFeedbackPermission: vi.fn(async () => ({ ok: true })),
    getStationScope: vi.fn(async (ctx: { role: string; stationId: string | null }) => ({
        ok: true,
        stationId: ctx.role === "MANAGER" ? ctx.stationId : null,
    })),
    parseOptionalFeedbackFilter: vi.fn(),
    parseFeedbackPagination: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackResponse: { findUnique: responseFindUniqueMock },
        customerFeedbackFairPlayReview: {
            findFirst: reviewFindFirstMock,
            count: vi.fn(),
            findMany: vi.fn(),
        },
        $transaction: transactionMock,
    },
}));

import { POST } from "./route";

function request() {
    return new NextRequest("http://localhost/api/admin/customer-feedback/fair-play-reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            responseId: "response-1",
            reasonCode: "EMPLOYEE_ANSWERED_FOR_CUSTOMER",
            reasonNote: "หัวหน้างานเห็นพนักงานกดคำตอบแทนลูกค้า",
        }),
    });
}

describe("admin customer feedback Fair Play reports", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        accessContextMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "hr-1", role: "HR", stationId: null },
        });
        responseFindUniqueMock.mockResolvedValue({
            id: "response-1",
            kind: "STANDARD",
            targetType: "EMPLOYEE",
            employeeId: "employee-1",
            employeeLabelSnapshot: "เอ",
            stationId: "station-1",
            validity: "VALID",
            refCode: "FB-ABCDEFGH",
            submittedAt: new Date("2026-09-09T01:00:00.000Z"),
        });
        reviewFindFirstMock.mockResolvedValue(null);
        reviewCreateMock.mockResolvedValue({ id: "fp-1" });
        auditCreateMock.mockResolvedValue({});
        transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => callback({
            customerFeedbackFairPlayReview: { create: reviewCreateMock },
            auditLog: { create: auditCreateMock },
        }));
    });

    it("creates one manual review tied to the exact feedback response and audits it", async () => {
        const response = await POST(request());

        expect(response.status).toBe(201);
        expect(reviewCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({
                responseId: "response-1",
                employeeId: "employee-1",
                stationId: "station-1",
                source: "MANUAL",
                reasonCode: "EMPLOYEE_ANSWERED_FOR_CUSTOMER",
                reportedById: "hr-1",
            }),
        });
        expect(auditCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({ action: "CUSTOMER_FEEDBACK_FAIR_PLAY_REPORTED", entityId: "fp-1" }),
        });
    });

    it("allows a station manager with response-view access to report, but reporting still does not adjudicate", async () => {
        accessContextMock.mockResolvedValue({
            ok: true,
            ctx: { userId: "manager-1", role: "MANAGER", stationId: "station-1" },
        });

        const response = await POST(request());

        expect(response.status).toBe(201);
        expect(reviewCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({ reportedById: "manager-1", stationId: "station-1", source: "MANUAL" }),
        });
    });

    it("does not allow a confirmed response to become a second violation again", async () => {
        reviewFindFirstMock.mockResolvedValue({ id: "fp-old", status: "CONFIRMED" });

        const response = await POST(request());

        expect(response.status).toBe(409);
        expect(transactionMock).not.toHaveBeenCalled();
    });

    it("returns 409 when concurrent reporters hit the database uniqueness guard", async () => {
        transactionMock.mockRejectedValue({ code: "P2002" });

        const response = await POST(request());

        expect(response.status).toBe(409);
    });
});
