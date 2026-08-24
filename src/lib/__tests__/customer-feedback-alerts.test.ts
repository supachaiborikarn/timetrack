import { beforeEach, describe, expect, it, vi } from "vitest";

const createAlertLog = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({
    prisma: {
        customerFeedbackAlertLog: {
            create: createAlertLog,
        },
    },
}));

import { tryRecordAlert } from "@/lib/customer-feedback/alerts";

describe("customer feedback alert log", () => {
    beforeEach(() => {
        createAlertLog.mockReset();
    });

    it("คืน true เมื่อบันทึก window แจ้งเตือนได้", async () => {
        createAlertLog.mockResolvedValue({ id: "alert-1" });

        await expect(tryRecordAlert({
            ruleCode: "INVALID_RESOLVE_GLOBAL_BREAKER",
            targetType: "UNKNOWN",
            targetId: "GLOBAL",
            windowStart: new Date("2026-08-24T12:00:00Z"),
            windowEnd: new Date("2026-08-24T12:01:00Z"),
            details: { limit: 3_000 },
        })).resolves.toBe(true);

        expect(createAlertLog).toHaveBeenCalledWith({
            data: expect.objectContaining({
                ruleCode: "INVALID_RESOLVE_GLOBAL_BREAKER",
                targetType: "UNKNOWN",
                targetId: "GLOBAL",
            }),
        });
    });

    it("คืน false เมื่อ window เดิมถูกบันทึกแล้ว", async () => {
        createAlertLog.mockRejectedValue({ code: "P2002" });

        await expect(tryRecordAlert({
            ruleCode: "INVALID_RESOLVE_GLOBAL_BREAKER",
            targetType: "UNKNOWN",
            targetId: "GLOBAL",
            windowStart: new Date("2026-08-24T12:00:00Z"),
            windowEnd: new Date("2026-08-24T12:01:00Z"),
        })).resolves.toBe(false);
    });
});
