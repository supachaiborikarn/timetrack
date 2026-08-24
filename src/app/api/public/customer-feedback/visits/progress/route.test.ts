import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    loadVisitFromHeaders: vi.fn(),
    updateMany: vi.fn(),
    findUnique: vi.fn(),
    checkPublicVisitRateLimit: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackVisit: {
            updateMany: mocks.updateMany,
            findUnique: mocks.findUnique,
        },
    },
}));
vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackPublicEnabled: () => true,
    assertPublicSecrets: () => undefined,
}));
vi.mock("@/lib/customer-feedback/submit", () => ({
    loadVisitFromHeaders: mocks.loadVisitFromHeaders,
}));
vi.mock("../../_visit-rate-limit", () => ({
    checkPublicVisitRateLimit: mocks.checkPublicVisitRateLimit,
}));

import { POST } from "./route";

function progressRequest(body: unknown): NextRequest {
    return new NextRequest("https://feedback.example.test/api/public/customer-feedback/visits/progress", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            host: "feedback.example.test",
            origin: "https://feedback.example.test",
            "sec-fetch-site": "same-origin",
            authorization: "Bearer signed-token",
        },
        body: JSON.stringify(body),
    });
}

describe("customer feedback visit progress", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.loadVisitFromHeaders.mockResolvedValue({
            visit: {
                id: "visit-1",
                disposition: "OPEN",
                startedAt: null,
            },
        });
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 60 });
    });

    it("ไม่เขียน TARGET_REJECTED ทับ SUBMITTED เมื่อ submit ชนะ race", async () => {
        mocks.updateMany.mockResolvedValue({ count: 0 });
        mocks.findUnique.mockResolvedValue({ disposition: "SUBMITTED" });

        const response = await POST(progressRequest({ targetConfirmation: "NO" }));

        expect(mocks.updateMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "visit-1", disposition: "OPEN" },
            data: expect.objectContaining({ disposition: "TARGET_REJECTED" }),
        }));
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        await expect(response.json()).resolves.toEqual({ disposition: "SUBMITTED" });
    });

    it("ไม่เขียน progress เพิ่มเมื่อ visit เดิมเรียกถี่เกินกำหนด", async () => {
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 60 });

        const response = await POST(progressRequest({ startedAt: true, lastStep: "rating" }));

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("60");
        await expect(response.json()).resolves.toMatchObject({ code: "REQUEST_RATE_LIMITED" });
        expect(mocks.updateMany).not.toHaveBeenCalled();
    });
});
