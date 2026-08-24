import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, userMock, dormitoryMock, logActivityMock } = vi.hoisted(() => ({
    authMock: vi.fn(),
    userMock: {
        findUnique: vi.fn(),
        update: vi.fn(),
    },
    dormitoryMock: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
    },
    logActivityMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/logger", () => ({ logActivity: logActivityMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: userMock,
        dormitory: dormitoryMock,
    },
}));

import { GET, PATCH } from "./route";

const activeEmployee = {
    id: "employee-1",
    role: "EMPLOYEE",
    isActive: true,
    employeeStatus: "ACTIVE",
    housingStatus: "COMPANY_DORM",
    dormitoryId: "dorm-1",
    housingUpdatedAt: new Date("2026-08-24T03:44:59.000Z"),
    housingUpdatedById: "employee-1",
};

describe("/api/profile/housing", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv("HOUSING_CONFIRMATION_STARTED_AT", "2026-08-24T10:45:00+07:00");
        authMock.mockResolvedValue({ user: { id: "employee-1", role: "EMPLOYEE" } });
        userMock.findUnique.mockResolvedValue(activeEmployee);
        userMock.update.mockResolvedValue({});
        dormitoryMock.findMany.mockResolvedValue([
            {
                id: "dorm-1",
                name: "บ้านพักหลังปั๊ม",
                station: { id: "station-1", name: "ปั๊มวัดโคก", code: "WKO" },
            },
        ]);
        dormitoryMock.findFirst.mockResolvedValue({
            id: "dorm-1",
            name: "บ้านพักหลังปั๊ม",
            station: { name: "ปั๊มวัดโคก" },
        });
        logActivityMock.mockResolvedValue(undefined);
    });

    it("returns 401 when there is no signed-in employee", async () => {
        authMock.mockResolvedValue(null);

        const response = await GET();

        expect(response.status).toBe(401);
        expect(userMock.findUnique).not.toHaveBeenCalled();
    });

    it("asks an employee to confirm again when their answer predates the round", async () => {
        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.confirmationRequired).toBe(true);
        expect(body.currentHousing).toEqual({
            housingStatus: "COMPANY_DORM",
            dormitoryId: "dorm-1",
        });
        expect(body.dormitories).toHaveLength(1);
        expect(dormitoryMock.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { isActive: true },
        }));
    });

    it("does not ask again after the employee confirms during the round", async () => {
        userMock.findUnique.mockResolvedValue({
            ...activeEmployee,
            housingUpdatedAt: new Date("2026-08-24T03:45:00.000Z"),
        });

        const response = await GET();
        const body = await response.json();

        expect(body.confirmationRequired).toBe(false);
        expect(body.dormitories).toEqual([]);
        expect(dormitoryMock.findMany).not.toHaveBeenCalled();
    });

    it("still asks when HR entered the latest housing value", async () => {
        userMock.findUnique.mockResolvedValue({
            ...activeEmployee,
            housingUpdatedAt: new Date("2026-08-24T04:00:00.000Z"),
            housingUpdatedById: "hr-1",
        });

        const response = await GET();
        const body = await response.json();

        expect(body.confirmationRequired).toBe(true);
    });

    it("does not show the employee popup to ADMIN", async () => {
        userMock.findUnique.mockResolvedValue({ ...activeEmployee, role: "ADMIN" });

        const response = await GET();
        const body = await response.json();

        expect(body.confirmationRequired).toBe(false);
        expect(dormitoryMock.findMany).not.toHaveBeenCalled();
    });

    it("saves the selected company dormitory as the employee's own answer", async () => {
        const response = await PATCH(new Request("http://localhost/api/profile/housing", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ housingStatus: "COMPANY_DORM", dormitoryId: "dorm-1" }),
        }));

        expect(response.status).toBe(200);
        expect(userMock.update).toHaveBeenCalledWith({
            where: { id: "employee-1" },
            data: {
                housingStatus: "COMPANY_DORM",
                dormitoryId: "dorm-1",
                housingUpdatedAt: expect.any(Date),
                housingUpdatedById: "employee-1",
            },
        });
        expect(logActivityMock).toHaveBeenCalledWith(
            "employee-1",
            "UPDATE",
            "User",
            expect.stringContaining("ปั๊มวัดโคก"),
            "employee-1",
        );
    });

    it("clears the dormitory when the employee selects their own housing", async () => {
        const response = await PATCH(new Request("http://localhost/api/profile/housing", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ housingStatus: "OWN_HOUSING", dormitoryId: "dorm-1" }),
        }));

        expect(response.status).toBe(200);
        expect(dormitoryMock.findFirst).not.toHaveBeenCalled();
        expect(userMock.update).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                housingStatus: "OWN_HOUSING",
                dormitoryId: null,
                housingUpdatedById: "employee-1",
            }),
        }));
    });

    it("rejects a company dorm answer without a dormitory", async () => {
        const response = await PATCH(new Request("http://localhost/api/profile/housing", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ housingStatus: "COMPANY_DORM", dormitoryId: "" }),
        }));

        expect(response.status).toBe(400);
        expect(userMock.update).not.toHaveBeenCalled();
    });
});
