import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    enabledMock,
    authMock,
    userFindUniqueMock,
    periodFindUniqueMock,
    requestFindFirstMock,
    requestCreateMock,
    requestFindManyMock,
    permissionMock,
} = vi.hoisted(() => ({
    enabledMock: vi.fn(),
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    periodFindUniqueMock: vi.fn(),
    requestFindFirstMock: vi.fn(),
    requestCreateMock: vi.fn(),
    requestFindManyMock: vi.fn(),
    permissionMock: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackEnabled: enabledMock,
}));
vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/permissions", () => ({ hasPermission: permissionMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        reviewPeriod: { findUnique: periodFindUniqueMock },
        customerFeedbackReviewRequest: {
            findFirst: requestFindFirstMock,
            create: requestCreateMock,
            findMany: requestFindManyMock,
        },
    },
}));

import { GET, POST } from "./route";

describe("employee customer feedback review requests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        enabledMock.mockReturnValue(true);
        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userFindUniqueMock.mockResolvedValue({ role: "EMPLOYEE", isActive: true, name: "พนักงานหนึ่ง" });
        permissionMock.mockResolvedValue(true);
        periodFindUniqueMock.mockResolvedValue({ id: "period-1" });
        requestFindFirstMock.mockResolvedValue(null);
        requestCreateMock.mockResolvedValue({ id: "request-1" });
        requestFindManyMock.mockResolvedValue([]);
    });

    it("fails closed on GET when customer feedback is disabled", async () => {
        enabledMock.mockReturnValue(false);

        const response = await GET();

        expect(response.status).toBe(404);
        expect(authMock).not.toHaveBeenCalled();
    });

    it("rejects a review period that does not exist", async () => {
        periodFindUniqueMock.mockResolvedValue(null);

        const response = await POST(new NextRequest("http://localhost/api/customer-feedback/me/review-requests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason: "ต้องการให้ตรวจสอบคะแนนรายการนี้", reviewPeriodId: "missing" }),
        }));

        expect(response.status).toBe(404);
        expect(requestCreateMock).not.toHaveBeenCalled();
    });

    it("returns 409 when concurrent open requests hit the unique constraint", async () => {
        requestCreateMock.mockRejectedValue({ code: "P2002" });

        const response = await POST(new NextRequest("http://localhost/api/customer-feedback/me/review-requests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ reason: "ต้องการให้ตรวจสอบคะแนนรายการนี้", reviewPeriodId: "period-1" }),
        }));

        expect(response.status).toBe(409);
        expect(requestCreateMock).toHaveBeenCalledWith({
            data: expect.objectContaining({ reviewPeriodId: "period-1", scopeKey: "period-1" }),
        });
    });
});
