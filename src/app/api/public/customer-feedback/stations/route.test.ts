import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
    loadVisitFromHeaders: vi.fn(),
    searchEligibleStations: vi.fn(),
    checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/feature-flags", () => ({
    isCustomerFeedbackPublicEnabled: () => true,
    assertPublicSecrets: () => undefined,
}));
vi.mock("@/lib/customer-feedback/submit", () => ({
    loadVisitFromHeaders: mocks.loadVisitFromHeaders,
}));
vi.mock("@/lib/customer-feedback/station-context", () => ({
    searchEligibleStations: mocks.searchEligibleStations,
}));
vi.mock("@/lib/customer-feedback/anti-abuse", () => ({
    checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/lib/customer-feedback/token", () => ({
    sha256Hex: () => "visit-hash",
}));

import { GET } from "./route";

function stationRequest(q: string): NextRequest {
    return new NextRequest(`https://feedback.example.test/api/public/customer-feedback/stations?q=${encodeURIComponent(q)}`, {
        headers: { authorization: "Bearer signed-token" },
    });
}

describe("customer feedback station search", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.loadVisitFromHeaders.mockResolvedValue({
            visit: { id: "visit-1", visitKind: "STANDARD", targetType: "EMPLOYEE" },
        });
        mocks.checkRateLimit.mockResolvedValue({ allowed: true });
        mocks.searchEligibleStations.mockResolvedValue([]);
    });

    it("trim คำค้นก่อนส่งเข้า DB และตอบ no-store", async () => {
        const response = await GET(stationRequest("  บางนา  "));

        expect(mocks.searchEligibleStations).toHaveBeenCalledWith("บางนา", 20);
        expect(response.status).toBe(200);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
    });

    it("ปฏิเสธคำค้นเกิน 100 ตัวก่อนส่งเข้า DB", async () => {
        const response = await GET(stationRequest("x".repeat(101)));

        expect(response.status).toBe(400);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(mocks.searchEligibleStations).not.toHaveBeenCalled();
    });
});
