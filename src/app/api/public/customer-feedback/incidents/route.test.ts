import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    loadVisitFromHeaders: vi.fn(),
    submitIncidentResponse: vi.fn(),
    checkPublicVisitRateLimit: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackPublicEnabled: () => true,
    assertPublicSecrets: () => undefined,
}));
vi.mock("@/lib/customer-feedback/submit", () => ({
    loadVisitFromHeaders: mocks.loadVisitFromHeaders,
    submitIncidentResponse: mocks.submitIncidentResponse,
}));
vi.mock("../_visit-rate-limit", () => ({
    checkPublicVisitRateLimit: mocks.checkPublicVisitRateLimit,
}));

import { POST } from "./route";

function incidentRequest(body: unknown): NextRequest {
    return new NextRequest("https://feedback.example.test/api/public/customer-feedback/incidents", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            host: "feedback.example.test",
            origin: "https://feedback.example.test",
            "sec-fetch-site": "same-origin",
            authorization: "Bearer incident-token",
            "idempotency-key": "incident-submit-key-1",
        },
        body: JSON.stringify(body),
    });
}

describe("public incident submission rate limit", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.loadVisitFromHeaders.mockResolvedValue({
            visit: { id: "visit-incident-1", visitKind: "INCIDENT", surveyVersion: "incident-v1" },
            minimumFillVerified: true,
        });
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 60 });
    });

    it("หยุดก่อนอ่านและบันทึกคำตอบเมื่อ incident visit เรียกถี่เกินกำหนด", async () => {
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 60 });

        const response = await POST(incidentRequest({}));

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("60");
        await expect(response.json()).resolves.toMatchObject({ code: "REQUEST_RATE_LIMITED" });
        expect(mocks.submitIncidentResponse).not.toHaveBeenCalled();
    });
});
