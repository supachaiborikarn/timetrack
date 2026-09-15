import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { EMPLOYEE_SCORE_QUESTION_KEYS } from "@/lib/customer-feedback/questions";

const {
    authMock,
    userFindUniqueMock,
    attendanceFindManyMock,
    attendanceFindFirstMock,
    shiftAssignmentFindManyMock,
    leaveFindManyMock,
    leaveBalanceFindUniqueMock,
    leaveBalanceCreateMock,
    advanceFindManyMock,
    announcementFindManyMock,
    customerFeedbackCountMock,
    customerFeedbackFindManyMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    attendanceFindManyMock: vi.fn(),
    attendanceFindFirstMock: vi.fn(),
    shiftAssignmentFindManyMock: vi.fn(),
    leaveFindManyMock: vi.fn(),
    leaveBalanceFindUniqueMock: vi.fn(),
    leaveBalanceCreateMock: vi.fn(),
    advanceFindManyMock: vi.fn(),
    announcementFindManyMock: vi.fn(),
    customerFeedbackCountMock: vi.fn(),
    customerFeedbackFindManyMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        attendance: {
            findMany: attendanceFindManyMock,
            findFirst: attendanceFindFirstMock,
        },
        shiftAssignment: { findMany: shiftAssignmentFindManyMock },
        leave: { findMany: leaveFindManyMock },
        leaveBalance: {
            findUnique: leaveBalanceFindUniqueMock,
            create: leaveBalanceCreateMock,
        },
        advance: { findMany: advanceFindManyMock },
        announcement: { findMany: announcementFindManyMock },
        customerFeedbackResponse: {
            count: customerFeedbackCountMock,
            findMany: customerFeedbackFindManyMock,
        },
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
        shiftAssignmentFindManyMock.mockResolvedValue([]);
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
        customerFeedbackFindManyMock.mockResolvedValue([]);
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

    it("keeps Mission incomplete when five evaluations are clustered in one shift segment", async () => {
        const workDate = new Date("2026-08-31T17:00:00.000Z");
        shiftAssignmentFindManyMock.mockResolvedValue([{
            date: workDate,
            isDayOff: false,
            shift: { startTime: "06:00", endTime: "18:00", breakMinutes: 60, isNightShift: false },
        }]);
        customerFeedbackCountMock.mockResolvedValue(5);
        customerFeedbackFindManyMock
            .mockResolvedValueOnce([
                { submittedAt: new Date("2026-09-01T06:30:00+07:00") },
                { submittedAt: new Date("2026-09-01T07:00:00+07:00") },
                { submittedAt: new Date("2026-09-01T07:30:00+07:00") },
                { submittedAt: new Date("2026-09-01T08:00:00+07:00") },
                { submittedAt: new Date("2026-09-01T09:00:00+07:00") },
            ])
            .mockResolvedValueOnce([]);

        const { body } = await getDashboard();

        expect(body.customerEvaluationStatus).toBe("NEAR");
        expect(body.customerEvaluationMission).toEqual({
            meetsVolumeTarget: true,
            spreadApplicable: true,
            segmentCoverage: { START: true, MIDDLE: false, END: false },
        });
        expect(body).not.toHaveProperty("customerEvaluationCount");
    });

    it("keeps an overnight Mission on the shift date and includes feedback after midnight", async () => {
        vi.setSystemTime(new Date("2026-09-01T22:00:00.000Z")); // 2026-09-02 05:00 Bangkok
        const shiftDate = new Date("2026-08-31T17:00:00.000Z"); // 2026-09-01 Bangkok
        shiftAssignmentFindManyMock.mockResolvedValue([{
            date: shiftDate,
            isDayOff: false,
            shift: { startTime: "18:00", endTime: "06:00", breakMinutes: 60, isNightShift: true },
        }]);
        customerFeedbackCountMock.mockResolvedValue(2);
        customerFeedbackFindManyMock
            .mockResolvedValueOnce([
                { submittedAt: new Date("2026-09-01T19:00:00+07:00") },
                { submittedAt: new Date("2026-09-01T21:00:00+07:00") },
                { submittedAt: new Date("2026-09-01T23:00:00+07:00") },
                { submittedAt: new Date("2026-09-02T03:00:00+07:00") },
                { submittedAt: new Date("2026-09-02T05:00:00+07:00") },
            ])
            .mockResolvedValueOnce([]);

        const { body } = await getDashboard();

        expect(body.customerEvaluationStatus).toBe("DONE");
        expect(body.customerEvaluationMission).toEqual({
            meetsVolumeTarget: true,
            spreadApplicable: true,
            segmentCoverage: { START: true, MIDDLE: true, END: true },
        });
    });

    it("does not show the feedback goal for non-front-yard employees", async () => {
        userFindUniqueMock.mockResolvedValue({
            departmentId: "office-1",
            department: { isFrontYard: false },
        });

        const { body } = await getDashboard();

        expect(customerFeedbackCountMock).not.toHaveBeenCalled();
        expect(customerFeedbackFindManyMock).not.toHaveBeenCalled();
        expect(body.customerEvaluationStatus).toBeNull();
        expect(body).not.toHaveProperty("customerEvaluationCount");
    });

    it("combines sixty attendance points with forty customer points", async () => {
        vi.setSystemTime(new Date("2026-09-02T05:00:00.000Z"));
        const workDate = new Date("2026-09-01T00:00:00+07:00");
        shiftAssignmentFindManyMock.mockResolvedValue([{
            date: workDate,
            isDayOff: false,
            shift: { startTime: "08:00", endTime: "17:00", breakMinutes: 60, isNightShift: false },
        }]);
        attendanceFindManyMock
            .mockResolvedValueOnce([{
                date: workDate,
                checkInTime: new Date("2026-09-01T08:00:00+07:00"),
                checkOutTime: new Date("2026-09-01T17:00:00+07:00"),
                lateMinutes: 0,
                breakStartTime: null,
                breakEndTime: null,
                breakDurationMin: 60,
            }])
            .mockResolvedValueOnce([]);
        customerFeedbackFindManyMock.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({
            id: `response-${index}`,
            answers: EMPLOYEE_SCORE_QUESTION_KEYS.map((questionKey) => ({ questionKey, choiceValues: ["NO"] })),
        })));

        const response = await GET(new NextRequest(
            "http://localhost/api/employee/dashboard?calYear=2026&calMonth=8",
        ));
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.performanceScore).toBe(60);
        expect(body.performance).toMatchObject({
            workPoints: 60,
            customerPoints: 0,
            customerIncluded: true,
            isProvisional: false,
        });
    });
});
