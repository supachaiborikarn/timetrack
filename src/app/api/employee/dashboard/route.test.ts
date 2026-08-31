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
    feedbackResponseCountMock,
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
    feedbackResponseCountMock: vi.fn(),
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
        customerFeedbackResponse: { count: feedbackResponseCountMock },
    },
}));

import { GET } from "./route";

describe("GET /api/employee/dashboard customer evaluation target", () => {
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
        feedbackResponseCountMock.mockResolvedValue(4);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("counts only today's valid employee-v3 responses in Bangkok regardless of the viewed calendar month", async () => {
        const response = await GET(new NextRequest(
            "http://localhost/api/employee/dashboard?calYear=2025&calMonth=0",
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(feedbackResponseCountMock).toHaveBeenCalledWith({
            where: {
                kind: "STANDARD",
                targetType: "EMPLOYEE",
                employeeId: "employee-1",
                surveyVersion: "employee-v3",
                validity: "VALID",
                submittedAt: {
                    gte: new Date("2026-08-31T17:00:00.000Z"),
                    lt: new Date("2026-09-01T17:00:00.000Z"),
                },
            },
        });
        expect(body.customerEvaluationCount).toBe(4);
        expect(body.customerEvaluationTarget).toBe(5);
    });

    it("does not query or show the customer evaluation target outside front-yard departments", async () => {
        userFindUniqueMock.mockResolvedValue({
            departmentId: "office-1",
            department: { isFrontYard: false },
        });

        const response = await GET(new NextRequest("http://localhost/api/employee/dashboard"));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(feedbackResponseCountMock).not.toHaveBeenCalled();
        expect(body.customerEvaluationCount).toBe(0);
        expect(body.customerEvaluationTarget).toBeNull();
    });
});
