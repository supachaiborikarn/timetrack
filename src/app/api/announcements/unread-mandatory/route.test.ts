import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, userMock, announcementMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    userMock: { findUnique: vi.fn() },
    announcementMock: { findMany: vi.fn() },
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: userMock,
        announcement: announcementMock,
    },
}));

import { GET } from "./route";

describe("GET /api/announcements/unread-mandatory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-08T04:30:00.000Z"));
        authMock.mockResolvedValue({ user: { id: "admin-1" } });
        userMock.findUnique.mockResolvedValue({ departmentId: "dept-1" });
        announcementMock.findMany.mockResolvedValue([]);
    });

    it("checks only announcements created today in Bangkok", async () => {
        const response = await GET();

        expect(response.status).toBe(200);
        expect(announcementMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                isActive: true,
                createdAt: { gte: new Date("2026-08-07T17:00:00.000Z") },
            },
        }));
    });
});
