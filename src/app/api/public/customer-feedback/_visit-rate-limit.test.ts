import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/customer-feedback/anti-abuse", () => ({
    checkRateLimit: mocks.checkRateLimit,
}));

import { checkPublicVisitRateLimit } from "./_visit-rate-limit";

describe("public visit rate limit keys", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.checkRateLimit.mockResolvedValue({ allowed: true, retryAfterSec: 60 });
    });

    it("hash visit id ก่อนเก็บและใช้เพดานแยกตามงาน", async () => {
        await checkPublicVisitRateLimit("submission", "visit-secret-id");

        expect(mocks.checkRateLimit).toHaveBeenCalledWith(
            "public-feedback-submission",
            createHash("sha256").update("visit-secret-id").digest("hex"),
            10,
            60_000
        );
    });
});
