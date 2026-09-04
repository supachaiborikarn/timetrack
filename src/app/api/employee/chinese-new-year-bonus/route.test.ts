import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    userFindUniqueMock,
    configFindUniqueMock,
    periodFindUniqueMock,
    attendanceFindManyMock,
    assignmentFindManyMock,
    leaveFindManyMock,
    responseFindManyMock,
    submissionFindUniqueMock,
    caseCountMock,
} = vi.hoisted(() => ({
    authMock: vi.fn(),
    userFindUniqueMock: vi.fn(),
    configFindUniqueMock: vi.fn(),
    periodFindUniqueMock: vi.fn(),
    attendanceFindManyMock: vi.fn(),
    assignmentFindManyMock: vi.fn(),
    leaveFindManyMock: vi.fn(),
    responseFindManyMock: vi.fn(),
    submissionFindUniqueMock: vi.fn(),
    caseCountMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { findUnique: userFindUniqueMock },
        systemConfig: { findUnique: configFindUniqueMock },
        reviewPeriod: { findUnique: periodFindUniqueMock },
        attendance: { findMany: attendanceFindManyMock },
        shiftAssignment: { findMany: assignmentFindManyMock },
        leave: { findMany: leaveFindManyMock },
        customerFeedbackResponse: { findMany: responseFindManyMock },
        reviewSubmission: { findUnique: submissionFindUniqueMock },
        customerFeedbackCase: { count: caseCountMock },
    },
}));

import { GET } from "./route";

const scoreQuestionKeys = [
    "uniform_and_name_badge",
    "guide_vehicle_immediately",
    "receive_driver_side",
    "caltex_greeting",
    "front_service_sign",
    "repeat_fuel_amount_before",
    "offer_rewards_promotion",
    "repeat_fuel_amount_after",
    "thank_and_guide_exit",
] as const;

describe("employee Chinese New Year bonus forecast", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userFindUniqueMock.mockResolvedValue({
            isActive: true,
            employeeStatus: "ACTIVE",
            station: { code: "WKO" },
            department: { isFrontYard: true },
        });
        configFindUniqueMock.mockResolvedValue(null);
    });

    it("stays hidden until ADMIN/HR configures a ReviewPeriod", async () => {
        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({ enabled: false, reason: "NO_PERIOD" });
        expect(periodFindUniqueMock).not.toHaveBeenCalled();
        expect(responseFindManyMock).not.toHaveBeenCalled();
    });

    it("does not expose the forecast to a non-front-yard employee", async () => {
        userFindUniqueMock.mockResolvedValue({
            isActive: true,
            employeeStatus: "ACTIVE",
            station: { code: "WKO" },
            department: { isFrontYard: false },
        });
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });

        const response = await GET();
        const body = await response.json();

        expect(body).toEqual({ enabled: false, reason: "NOT_ELIGIBLE" });
        expect(periodFindUniqueMock).not.toHaveBeenCalled();
    });

    it("returns a complete privacy-safe 100% forecast without customer response counts", async () => {
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        periodFindUniqueMock.mockResolvedValue({
            id: "period-1",
            title: "รอบตรุษจีน",
            startDate: new Date("2026-08-31T17:00:00.000Z"),
            endDate: new Date("2026-08-31T17:00:00.000Z"),
            isActive: false,
            closedAt: new Date("2026-09-02T00:00:00.000Z"),
        });
        attendanceFindManyMock.mockResolvedValue([{
            date: new Date("2026-08-31T17:00:00.000Z"),
            checkInTime: new Date("2026-09-01T00:00:00.000Z"),
            checkOutTime: new Date("2026-09-01T10:00:00.000Z"),
            lateMinutes: 0,
            breakStartTime: null,
            breakEndTime: null,
            breakDurationMin: 60,
        }]);
        assignmentFindManyMock.mockResolvedValue([{
            date: new Date("2026-08-31T17:00:00.000Z"),
            isDayOff: false,
            shift: { startTime: "07:00", endTime: "17:00", breakMinutes: 60, isNightShift: false },
        }]);
        leaveFindManyMock.mockResolvedValue([]);
        responseFindManyMock.mockResolvedValue(Array.from({ length: 10 }, (_, index) => ({
            id: `response-${index + 1}`,
            submittedAt: new Date(`2026-09-01T0${index % 9}:00:00.000Z`),
            answers: scoreQuestionKeys.map((questionKey) => ({ questionKey, choiceValues: ["YES"] })),
        })));
        submissionFindUniqueMock.mockResolvedValue({ rating: 5, status: "COMPLETED", completedAt: new Date("2026-09-02T00:00:00.000Z") });
        caseCountMock.mockResolvedValue(0);

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.enabled).toBe(true);
        expect(body.preview).toMatchObject({
            forecastScore: 100,
            bonusPercent: 100,
            knownWeight: 100,
            isProvisional: false,
            safetyReviewRequired: false,
        });
        expect(body.preview.components).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: "attendance", points: 25, maxPoints: 25 }),
            expect.objectContaining({ key: "customerQuality", points: 30, maxPoints: 30 }),
            expect.objectContaining({ key: "cooperation", points: 15, maxPoints: 15 }),
            expect.objectContaining({ key: "supervisorSop", points: 20, maxPoints: 20 }),
            expect.objectContaining({ key: "disciplineSafety", points: 10, maxPoints: 10 }),
        ]));
        expect(JSON.stringify(body)).not.toContain("responseCount");
        expect(JSON.stringify(body)).not.toContain("dailyTarget");
        expect(JSON.stringify(body)).not.toContain("minimumSample");
    });

    it("keeps an invalid legacy supervisor rating waiting instead of clamping it into points", async () => {
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        periodFindUniqueMock.mockResolvedValue({
            id: "period-1",
            title: "รอบตรุษจีน",
            startDate: new Date("2026-08-31T17:00:00.000Z"),
            endDate: new Date("2026-08-31T17:00:00.000Z"),
            isActive: false,
            closedAt: new Date("2026-09-02T00:00:00.000Z"),
        });
        attendanceFindManyMock.mockResolvedValue([]);
        assignmentFindManyMock.mockResolvedValue([]);
        leaveFindManyMock.mockResolvedValue([]);
        responseFindManyMock.mockResolvedValue([]);
        submissionFindUniqueMock.mockResolvedValue({ rating: 0, status: "COMPLETED", completedAt: new Date("2026-09-02T00:00:00.000Z") });
        caseCountMock.mockResolvedValue(0);

        const response = await GET();
        const body = await response.json();
        const supervisor = body.preview.components.find((component: { key: string }) => component.key === "supervisorSop");

        expect(supervisor.points).toBeNull();
        expect(body.preview.missingComponents).toContain("supervisorSop");
        expect(body.preview.isProvisional).toBe(true);
    });
});
