import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, notificationMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    notificationMock: {
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
    },
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: { notification: notificationMock },
}));

import { GET } from "./route";

describe("GET /api/notifications", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-07T17:30:00.000Z"));
        authMock.mockResolvedValue({ user: { id: "admin-1" } });
        notificationMock.deleteMany.mockResolvedValue({ count: 3 });
        notificationMock.findMany.mockResolvedValue([]);
        notificationMock.count.mockResolvedValue(0);
    });

    it("clears yesterday's attendance alerts before returning the latest notifications", async () => {
        const response = await GET(new NextRequest("http://localhost/api/notifications?limit=5"));

        expect(response.status).toBe(200);
        expect(notificationMock.deleteMany).toHaveBeenCalledWith({
            where: {
                userId: "admin-1",
                type: { in: ["ATTENDANCE_ALERT", "STAFF_SHORTAGE", "ANNOUNCEMENT"] },
                createdAt: { lt: new Date("2026-08-07T17:00:00.000Z") },
            },
        });
        expect(notificationMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: "admin-1" },
        }));
    });
});
