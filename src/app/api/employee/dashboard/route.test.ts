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
    customerFeedbackCountMock,
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
    customerFeedbackCountMock: vi.fn(),
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
        customerFeedbackResponse: { count: customerFeedbackCountMock },
    },
}));

import { GET } from "./route";

describe("GET /api/employee/dashboard customer evaluation status", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-08-31T17:00:00.000Z")); // 2026-09-01 00:00 Bangkok

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
        customerFeedbackCountMock.mockResolvedValue(0);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function getDashboard() {
        const response = await GET(new NextRequest(
            "http://localhost/api/employee/dashboard?calYear=2025&calMonth=0",
        ));
        return { response, body: await response.json() };
    }

    it.each([
        [0, "NOT_YET"],
        [2, "NOT_YET"],
        [3, "NEAR"],
        [4, "NEAR"],
        [5, "DONE"],
        [8, "DONE"],
    ])("maps %i valid evaluations to %s without exposing the exact count", async (count, expectedStatus) => {
        customerFeedbackCountMock.mockResolvedValue(count);

        const { response, body } = await getDashboard();

        expect(response.status).toBe(200);
        expect(body.customerEvaluationStatus).toBe(expectedStatus);
        expect(body).not.toHaveProperty("customerEvaluationCount");
        expect(body).not.toHaveProperty("customerEvaluationTarget");
    });

    it("counts only today's valid standard employee-v3/v4 evaluations", async () => {
        await getDashboard();

        expect(customerFeedbackCountMock).toHaveBeenCalledWith({
            where: {
                kind: "STANDARD",
                targetType: "EMPLOYEE",
                employeeId: "employee-1",
                surveyVersion: { in: ["employee-v3", "employee-v4"] },
                validity: "VALID",
                submittedAt: {
                    gte: new Date("2026-08-31T17:00:00.000Z"),
                    lt: new Date("2026-09-01T17:00:00.000Z"),
                },
            },
        });
    });

    it("does not show the feedback goal for non-front-yard employees", async () => {
        userFindUniqueMock.mockResolvedValue({
            departmentId: "office-1",
            department: { isFrontYard: false },
        });

        const { body } = await getDashboard();

        expect(customerFeedbackCountMock).not.toHaveBeenCalled();
        expect(body.customerEvaluationStatus).toBeNull();
        expect(body).not.toHaveProperty("customerEvaluationCount");
    });
});
