import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    userFindUniqueMock,
    directUserUpdateMock,
    transactionUserUpdateMock,
    updateEmployeeAndCloseQrMock,
    feedbackQrCountMock,
    feedbackVisitCountMock,
    feedbackResponseCountMock,
    feedbackReviewCountMock,
    storedAssetFindManyMock,
    tryDeleteEmployeeAccountMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    directUserUpdateMock: vi.fn(),
    transactionUserUpdateMock: vi.fn(),
    updateEmployeeAndCloseQrMock: vi.fn(),
    feedbackQrCountMock: vi.fn(),
    feedbackVisitCountMock: vi.fn(),
    feedbackResponseCountMock: vi.fn(),
    feedbackReviewCountMock: vi.fn(),
    storedAssetFindManyMock: vi.fn(),
    tryDeleteEmployeeAccountMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock, update: directUserUpdateMock },
        customerFeedbackQr: { count: feedbackQrCountMock },
        customerFeedbackVisit: { count: feedbackVisitCountMock },
        customerFeedbackResponse: { count: feedbackResponseCountMock },
        customerFeedbackReviewRequest: { count: feedbackReviewCountMock },
        storedAsset: { findMany: storedAssetFindManyMock },
    },
}));
vi.mock("@/lib/customer-feedback/employee-status", () => ({
    updateEmployeeAndCloseQr: updateEmployeeAndCloseQrMock,
}));
vi.mock("@/lib/employee-removal", () => ({
    tryDeleteEmployeeAccount: tryDeleteEmployeeAccountMock,
}));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn() } }));

import { DELETE, PUT } from "./route";

describe("individual employee deactivation", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } });
        userFindUniqueMock.mockResolvedValue({ id: "employee-1", isActive: true });
        directUserUpdateMock.mockResolvedValue({ id: "employee-1", name: "พนักงานหนึ่ง", isActive: true, employeeStatus: "ACTIVE" });
        transactionUserUpdateMock.mockResolvedValue({ id: "employee-1", name: "พนักงานหนึ่ง", isActive: false });
        updateEmployeeAndCloseQrMock.mockImplementation(async (_id: string, update: (tx: unknown) => Promise<unknown>) => ({
            employee: await update({ user: { update: transactionUserUpdateMock } }),
            closedQrCount: 1,
        }));
        feedbackQrCountMock.mockResolvedValue(0);
        feedbackVisitCountMock.mockResolvedValue(0);
        feedbackResponseCountMock.mockResolvedValue(0);
        feedbackReviewCountMock.mockResolvedValue(0);
        storedAssetFindManyMock.mockResolvedValue([]);
        tryDeleteEmployeeAccountMock.mockResolvedValue({ deleted: true, feedbackActivity: [] });
    });

    it("uses the ordered transaction helper when isActive becomes false", async () => {
        const request = new NextRequest("http://localhost/api/admin/employees/employee-1", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                name: "พนักงานหนึ่ง",
                role: "EMPLOYEE",
                isActive: false,
                hourlyRate: 0,
                dailyRate: 0,
                baseSalary: 0,
                otRateMultiplier: 1.5,
            }),
        });

        const response = await PUT(request, { params: Promise.resolve({ id: "employee-1" }) });

        expect(response.status).toBe(200);
        expect(updateEmployeeAndCloseQrMock).toHaveBeenCalledWith("employee-1", expect.any(Function));
        expect(transactionUserUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: "employee-1" },
            data: expect.objectContaining({ isActive: false }),
        }));
        expect(directUserUpdateMock).not.toHaveBeenCalled();
    });

    it("restores employeeStatus when an inactive employee is reactivated", async () => {
        const request = new NextRequest("http://localhost/api/admin/employees/employee-1", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                name: "พนักงานหนึ่ง",
                role: "EMPLOYEE",
                isActive: true,
                hourlyRate: 0,
                dailyRate: 0,
                baseSalary: 0,
                otRateMultiplier: 1.5,
            }),
        });

        const response = await PUT(request, { params: Promise.resolve({ id: "employee-1" }) });

        expect(response.status).toBe(200);
        expect(updateEmployeeAndCloseQrMock).not.toHaveBeenCalled();
        expect(directUserUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isActive: true, employeeStatus: "ACTIVE" }),
        }));
    });

    it("does not hard-delete an employee who still has a QR or visit without a response", async () => {
        feedbackQrCountMock.mockResolvedValue(1);
        feedbackVisitCountMock.mockResolvedValue(1);

        const response = await DELETE(new NextRequest("http://localhost/api/admin/employees/employee-1", {
            method: "DELETE",
        }), { params: Promise.resolve({ id: "employee-1" }) });

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual(expect.objectContaining({ error: expect.stringContaining("QR") }));
    });

    it("returns 409 when feedback activity appears after the first hard-delete guard", async () => {
        tryDeleteEmployeeAccountMock.mockResolvedValue({
            deleted: false,
            feedbackActivity: [{ label: "QR ประเมินพนักงาน", count: 1 }],
        });

        const response = await DELETE(new NextRequest("http://localhost/api/admin/employees/employee-1", {
            method: "DELETE",
        }), { params: Promise.resolve({ id: "employee-1" }) });

        expect(response.status).toBe(409);
        expect(tryDeleteEmployeeAccountMock).toHaveBeenCalledWith("employee-1");
    });
});
