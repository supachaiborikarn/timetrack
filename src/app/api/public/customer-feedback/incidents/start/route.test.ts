import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    loadVisitFromHeaders: vi.fn(),
    checkPublicVisitRateLimit: vi.fn(),
    findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackVisit: {
            findUnique: mocks.findUnique,
        },
    },
}));
vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackPublicEnabled: () => true,
    assertPublicSecrets: () => undefined,
}));
vi.mock("@/lib/customer-feedback/form-token", () => ({
    canStartIncidentFromParentDisposition: () => true,
    createVisitToken: vi.fn(),
    isStandardIncidentParent: () => true,
}));
vi.mock("@/lib/customer-feedback/submit", () => ({
    loadVisitFromHeaders: mocks.loadVisitFromHeaders,
}));
vi.mock("@/lib/customer-feedback/anti-abuse", () => ({
    networkHashDaily: vi.fn(),
    clientHashWeekly: vi.fn(),
    deviceClassOf: () => "mobile",
    currentHashKeyVersion: () => "v1",
    checkRateLimit: vi.fn(),
    checkGlobalLimit: vi.fn(),
    resolveNonceHash: vi.fn(),
    networkRateKey: () => "network-key",
    GLOBAL_LIMITS: { visitCreatePerMinute: 10_000 },
    PER_NETWORK_STANDALONE_INCIDENT_PER_HOUR: 30,
}));
vi.mock("../../_visit-rate-limit", () => ({
    checkPublicVisitRateLimit: mocks.checkPublicVisitRateLimit,
}));

import { POST } from "./route";

function startRequest(): NextRequest {
    return new NextRequest("https://feedback.example.test/api/public/customer-feedback/incidents/start", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            host: "feedback.example.test",
            origin: "https://feedback.example.test",
            "sec-fetch-site": "same-origin",
            authorization: "Bearer parent-token",
        },
        body: "{}",
    });
}

describe("public incident start per-visit rate limit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.loadVisitFromHeaders.mockResolvedValue({
            visit: {
                id: "parent-visit-1",
                disposition: "OPEN",
                formExpiresAt: new Date("2099-01-01T00:00:00.000Z"),
            },
            tokenPayload: {},
        });
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 60 });
    });

    it("หยุดการเริ่ม incident ซ้ำก่อนค้นหาหรือสร้าง child visit", async () => {
        const response = await POST(startRequest());

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("60");
        await expect(response.json()).resolves.toMatchObject({ code: "REQUEST_RATE_LIMITED" });
        expect(mocks.checkPublicVisitRateLimit).toHaveBeenCalledWith("incident-start", "parent-visit-1");
        expect(mocks.findUnique).not.toHaveBeenCalled();
    });
});
