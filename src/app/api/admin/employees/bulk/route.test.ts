import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, userUpdateManyMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    userUpdateManyMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: { user: { updateMany: userUpdateManyMock } },
}));
vi.mock("@/lib/customer-feedback/employee-status", () => ({ setEmployeeInactive: vi.fn() }));

import { POST } from "./route";

describe("bulk employee reactivation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "hr-1", role: "HR" } });
        userUpdateManyMock.mockResolvedValue({ count: 1 });
    });

    it("restores employeeStatus to ACTIVE together with isActive", async () => {
        const response = await POST(new NextRequest("http://localhost/api/admin/employees/bulk", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ action: "change-status", ids: ["employee-1"], data: { isActive: true } }),
        }));

        expect(response.status).toBe(200);
        expect(userUpdateManyMock).toHaveBeenCalledWith({
            where: { id: { in: ["employee-1"] } },
            data: { isActive: true, employeeStatus: "ACTIVE" },
        });
    });
});
