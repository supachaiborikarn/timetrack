import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    loadVisitFromHeaders: vi.fn(),
    submitStandardResponse: vi.fn(),
    checkPublicVisitRateLimit: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackPublicEnabled: () => true,
    assertPublicSecrets: () => undefined,
}));
vi.mock("@/lib/customer-feedback/submit", () => ({
    loadVisitFromHeaders: mocks.loadVisitFromHeaders,
    submitStandardResponse: mocks.submitStandardResponse,
}));
vi.mock("../_visit-rate-limit", () => ({
    checkPublicVisitRateLimit: mocks.checkPublicVisitRateLimit,
}));

import { POST } from "./route";

function stationRequest(body: unknown): NextRequest {
    return new NextRequest("https://feedback.example.test/api/public/customer-feedback/submissions", {
        method: "POST",
        headers: {
            "content-type": "application/json",
            host: "feedback.example.test",
            origin: "https://feedback.example.test",
            "sec-fetch-site": "same-origin",
            authorization: "Bearer signed-token",
            "idempotency-key": "station-submit-key-1",
        },
        body: JSON.stringify(body),
    });
}

describe("station-v1 public submission route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.loadVisitFromHeaders.mockResolvedValue({
            visit: { id: "visit-standard-1", visitKind: "STANDARD", surveyVersion: "station-v1" },
            minimumFillVerified: true,
        });
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 60 });
        mocks.submitStandardResponse.mockResolvedValue({
            refCode: "FB-STATION",
            caseId: null,
            severity: null,
        });
    });

    it("รับ reason ของสถานี 3 ข้อและส่ง payload ที่ validate แล้วเข้า service", async () => {
        const response = await POST(stationRequest({
            targetConfirmation: "YES",
            overallRating: 2,
            reasonKeys: ["station_cleanliness", "station_wait", "station_safety"],
            serviceAreas: ["restroom"],
            wantsFollowUp: false,
            language: "th",
        }));

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({ refCode: "FB-STATION" });
        expect(mocks.submitStandardResponse).toHaveBeenCalledWith(expect.objectContaining({
            payload: expect.objectContaining({
                reasonKeys: ["station_cleanliness", "station_wait", "station_safety"],
                serviceAreas: ["restroom"],
            }),
        }));
    });

    it("stream เกินเพดานถูก 413 แม้ไม่อาศัย Content-Length", async () => {
        const response = await POST(stationRequest({ text: "x".repeat(17 * 1024) }));
        expect(response.status).toBe(413);
        expect(mocks.submitStandardResponse).not.toHaveBeenCalled();
    });

    it("หยุดคำขอของ visit เดิมชั่วคราวเมื่อส่งถี่เกินกำหนด", async () => {
        mocks.checkPublicVisitRateLimit.mockResolvedValue({ allowed: false, retryAfterSec: 60 });

        const response = await POST(stationRequest({
            targetConfirmation: "YES",
            overallRating: 4,
            reasonKeys: [],
            serviceAreas: ["restroom"],
            wantsFollowUp: false,
            language: "th",
        }));

        expect(response.status).toBe(429);
        expect(response.headers.get("Retry-After")).toBe("60");
        await expect(response.json()).resolves.toMatchObject({ code: "REQUEST_RATE_LIMITED" });
        expect(mocks.submitStandardResponse).not.toHaveBeenCalled();
    });
});
