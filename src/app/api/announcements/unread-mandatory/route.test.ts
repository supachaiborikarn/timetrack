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
        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userMock.findUnique.mockResolvedValue({ departmentId: "dept-1" });
        announcementMock.findMany.mockResolvedValue([]);
    });

    it("keeps pinned announcements mandatory until they are acknowledged", async () => {
        const response = await GET();

        expect(response.status).toBe(200);
        expect(announcementMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: {
                isActive: true,
                isPinned: true,
            },
        }));
    });

    it("returns an unread pinned announcement targeted to the employee department", async () => {
        announcementMock.findMany.mockResolvedValue([
            {
                id: "league-rules",
                title: "League rules",
                content: "Read me",
                createdAt: new Date("2026-09-01T00:00:00.000Z"),
                isPinned: true,
                targetDepartmentIds: JSON.stringify(["dept-1"]),
                reads: [],
                author: { name: "Admin", nickName: null, photoUrl: null },
            },
        ]);

        const response = await GET();
        const body = await response.json();

        expect(body.announcement.id).toBe("league-rules");
    });
});
