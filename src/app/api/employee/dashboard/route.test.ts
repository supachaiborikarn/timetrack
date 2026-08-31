import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
    authMock,
    userFindUniqueMock,
    attendanceFindManyMock,
    attendanceFindFirstMock,
    shiftAssignmentCountMock,
    leaveFindManyMock,
    leaveBalanceFindUniqueMock,
    leaveBalanceCreateMock,
    advanceFindManyMock,
    announcementFindManyMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    attendanceFindManyMock: vi.fn(),
    attendanceFindFirstMock: vi.fn(),
    shiftAssignmentCountMock: vi.fn(),
    leaveFindManyMock: vi.fn(),
    leaveBalanceFindUniqueMock: vi.fn(),
    leaveBalanceCreateMock: vi.fn(),
    advanceFindManyMock: vi.fn(),
    announcementFindManyMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        attendance: {
            findMany: attendanceFindManyMock,
            findFirst: attendanceFindFirstMock,
        },
        shiftAssignment: { count: shiftAssignmentCountMock },
        leave: { findMany: leaveFindManyMock },
        leaveBalance: {
            findUnique: leaveBalanceFindUniqueMock,
            create: leaveBalanceCreateMock,
        },
        advance: { findMany: advanceFindManyMock },
        announcement: { findMany: announcementFindManyMock },
    },
}));

import { GET } from "./route";

describe("GET /api/employee/dashboard customer evaluation visibility", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-31T17:00:00.000Z"));

        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userFindUniqueMock.mockResolvedValue({
            departmentId: "frontyard-1",
            department: { isFrontYard: true },
        });
        attendanceFindManyMock.mockResolvedValue([]);
        attendanceFindFirstMock.mockResolvedValue(null);
        shiftAssignmentCountMock.mockResolvedValue(0);
        leaveFindManyMock.mockResolvedValue([]);
        leaveBalanceFindUniqueMock.mockResolvedValue({
            sickLeave: 30,
            usedSick: 0,
            annualLeave: 6,
            usedAnnual: 0,
            personalLeave: 3,
            usedPersonal: 0,
        });
        advanceFindManyMock.mockResolvedValue([]);
        announcementFindManyMock.mockResolvedValue([]);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("does not query or expose evaluation counts for a front-yard employee", async () => {
        const response = await GET(new NextRequest(
            "http://localhost/api/employee/dashboard?calYear=2025&calMonth=0",
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).not.toHaveProperty("customerEvaluationCount");
        expect(body).not.toHaveProperty("customerEvaluationTarget");
    });
});
