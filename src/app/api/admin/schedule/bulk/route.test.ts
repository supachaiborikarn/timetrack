import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, accessEmployeeMock, upsertMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    accessEmployeeMock: vi.fn(),
    upsertMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        shiftAssignment: {
            upsert: upsertMock,
        },
        user: {
            findMany: vi.fn(),
        },
    },
}));
vi.mock("@/lib/cashier-employee-scope", () => ({
    canGasCashierAccessEmployee: accessEmployeeMock,
    canGasCashierAccessStation: vi.fn(() => true),
    gasCashierEmployeeWhere: vi.fn(() => null),
}));

import { POST } from "./route";

function postRequest(body: Record<string, unknown>) {
    return new NextRequest("http://localhost/api/admin/schedule/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

describe("bulk schedule assignment", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
        accessEmployeeMock.mockResolvedValue(true);
        upsertMock.mockResolvedValue({ id: "assignment-1" });
    });

    it("stores YYYY-MM-DD assignments at Bangkok midnight instead of UTC midnight", async () => {
        const response = await POST(postRequest({
            action: "assign",
            assignments: [{
                userId: "employee-1",
                date: "2026-09-07",
                shiftId: "shift-0800",
                isDayOff: false,
            }],
        }));

        expect(response.status).toBe(200);
        expect(upsertMock).toHaveBeenCalledTimes(1);
        expect(upsertMock).toHaveBeenCalledWith({
            where: {
                userId_date: {
                    userId: "employee-1",
                    date: new Date("2026-09-06T17:00:00.000Z"),
                },
            },
            create: {
                userId: "employee-1",
                shiftId: "shift-0800",
                date: new Date("2026-09-06T17:00:00.000Z"),
                isDayOff: false,
            },
            update: {
                shiftId: "shift-0800",
                isDayOff: false,
            },
        });
    });
});
