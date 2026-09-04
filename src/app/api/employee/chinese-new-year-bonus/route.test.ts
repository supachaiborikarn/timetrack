import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    authMock,
    userFindUniqueMock,
    userFindManyMock,
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
    userFindManyMock: vi.fn(),
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
        user: { findUnique: userFindUniqueMock, findMany: userFindManyMock },
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

const closedPeriod = {
    id: "period-1",
    title: "รอบตรุษจีน",
    startDate: new Date("2026-08-31T17:00:00.000Z"),
    endDate: new Date("2026-08-31T17:00:00.000Z"),
    isActive: false,
    closedAt: new Date("2026-09-02T00:00:00.000Z"),
};

const perfectAttendance = {
    date: new Date("2026-08-31T17:00:00.000Z"),
    checkInTime: new Date("2026-09-01T00:00:00.000Z"),
    checkOutTime: new Date("2026-09-01T10:00:00.000Z"),
    lateMinutes: 0,
    breakStartTime: null,
    breakEndTime: null,
    breakDurationMin: 60,
};

const perfectAssignment = {
    date: new Date("2026-08-31T17:00:00.000Z"),
    isDayOff: false,
    shift: { startTime: "07:00", endTime: "17:00", breakMinutes: 60, isNightShift: false },
};

function perfectFeedback(employeeId?: string) {
    return Array.from({ length: 10 }, (_, index) => ({
        id: `response-${employeeId ?? "self"}-${index + 1}`,
        employeeId: employeeId ?? "employee-1",
        submittedAt: new Date(`2026-09-01T0${index % 9}:00:00.000Z`),
        answers: scoreQuestionKeys.map((questionKey) => ({ questionKey, choiceValues: ["YES"] })),
    }));
}

describe("employee Chinese New Year bonus forecast", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        authMock.mockResolvedValue({ user: { id: "employee-1" } });
        userFindUniqueMock.mockResolvedValue({
            isActive: true,
            employeeStatus: "ACTIVE",
            role: "EMPLOYEE",
            employeeId: "EMP001",
            stationId: "station-1",
            station: { code: "WKO" },
            department: { isFrontYard: true },
        });
        userFindManyMock.mockResolvedValue([]);
        configFindUniqueMock.mockResolvedValue(null);
        attendanceFindManyMock.mockResolvedValue([]);
        assignmentFindManyMock.mockResolvedValue([]);
        leaveFindManyMock.mockResolvedValue([]);
        responseFindManyMock.mockResolvedValue([]);
        submissionFindUniqueMock.mockResolvedValue(null);
        caseCountMock.mockResolvedValue(0);
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
            role: "EMPLOYEE",
            employeeId: "EMP002",
            stationId: "station-1",
            station: { code: "WKO" },
            department: { isFrontYard: false },
        });
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });

        const response = await GET();
        const body = await response.json();

        expect(body).toEqual({ enabled: false, reason: "NOT_ELIGIBLE" });
        expect(periodFindUniqueMock).not.toHaveBeenCalled();
    });

    it("keeps department-scoped gas cashiers out of the fuel-cashier bonus profile", async () => {
        userFindUniqueMock.mockResolvedValue({
            isActive: true,
            employeeStatus: "ACTIVE",
            role: "CASHIER",
            employeeId: "EMPE2D20",
            stationId: "station-1",
            station: { code: "PAP" },
            department: { isFrontYard: false },
        });
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });

        const response = await GET();
        const body = await response.json();

        expect(body).toEqual({ enabled: false, reason: "NOT_ELIGIBLE" });
        expect(periodFindUniqueMock).not.toHaveBeenCalled();
        expect(userFindManyMock).not.toHaveBeenCalled();
    });

    it("returns a complete privacy-safe 100% forecast without customer response counts", async () => {
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        periodFindUniqueMock.mockResolvedValue(closedPeriod);
        attendanceFindManyMock.mockResolvedValue([perfectAttendance]);
        assignmentFindManyMock.mockResolvedValue([perfectAssignment]);
        responseFindManyMock.mockResolvedValue(perfectFeedback());
        submissionFindUniqueMock.mockResolvedValue({ rating: 5, status: "COMPLETED", completedAt: new Date("2026-09-02T00:00:00.000Z") });

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.enabled).toBe(true);
        expect(body.profile).toBe("FRONT_YARD");
        expect(body.preview).toMatchObject({
            profile: "FRONT_YARD",
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

    it("gives an oil-station cashier a team-linked forecast with 35% team influence and 65% personal influence", async () => {
        userFindUniqueMock.mockResolvedValue({
            isActive: true,
            employeeStatus: "ACTIVE",
            role: "CASHIER",
            employeeId: "CASH001",
            stationId: "station-1",
            station: { code: "WKO" },
            department: { isFrontYard: false },
        });
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        periodFindUniqueMock.mockResolvedValue(closedPeriod);
        userFindManyMock.mockResolvedValue([{ id: "team-1" }]);
        attendanceFindManyMock
            .mockResolvedValueOnce([perfectAttendance])
            .mockResolvedValueOnce([{
                userId: "team-1",
                date: perfectAttendance.date,
                checkInTime: perfectAttendance.checkInTime,
            }]);
        assignmentFindManyMock
            .mockResolvedValueOnce([perfectAssignment])
            .mockResolvedValueOnce([{
                userId: "team-1",
                date: perfectAssignment.date,
                isDayOff: false,
            }]);
        responseFindManyMock.mockResolvedValue(perfectFeedback("team-1"));
        submissionFindUniqueMock.mockResolvedValue({ rating: 5, status: "COMPLETED", completedAt: new Date("2026-09-02T00:00:00.000Z") });

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.enabled).toBe(true);
        expect(body.profile).toBe("FUEL_CASHIER");
        expect(body.preview).toMatchObject({
            profile: "FUEL_CASHIER",
            forecastScore: 100,
            bonusPercent: 100,
            knownWeight: 100,
        });
        expect(body.preview.components).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: "attendance", points: 25, maxPoints: 25 }),
            expect.objectContaining({ key: "customerQuality", label: "คุณภาพบริการของทีม", points: 20, maxPoints: 20 }),
            expect.objectContaining({ key: "cooperation", label: "ความร่วมมือแบบประเมินของทีม", points: 15, maxPoints: 15 }),
            expect.objectContaining({ key: "supervisorSop", label: "งานเสมียน / SOP", points: 30, maxPoints: 30 }),
            expect.objectContaining({ key: "disciplineSafety", points: 10, maxPoints: 10 }),
        ]));
        expect(caseCountMock).not.toHaveBeenCalled();
        expect(JSON.stringify(body)).not.toContain("responseCount");
        expect(JSON.stringify(body)).not.toContain("dailyTarget");
        expect(JSON.stringify(body)).not.toContain("minimumSample");
    });

    it("keeps team quality waiting when even one active team member lacks the minimum customer sample", async () => {
        userFindUniqueMock.mockResolvedValue({
            isActive: true,
            employeeStatus: "ACTIVE",
            role: "CASHIER",
            employeeId: "CASH001",
            stationId: "station-1",
            station: { code: "WKO" },
            department: { isFrontYard: false },
        });
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        periodFindUniqueMock.mockResolvedValue(closedPeriod);
        userFindManyMock.mockResolvedValue([{ id: "team-1" }, { id: "team-2" }]);
        attendanceFindManyMock.mockResolvedValueOnce([perfectAttendance]).mockResolvedValueOnce([]);
        assignmentFindManyMock.mockResolvedValueOnce([perfectAssignment]).mockResolvedValueOnce([]);
        responseFindManyMock.mockResolvedValue(perfectFeedback("team-1"));
        submissionFindUniqueMock.mockResolvedValue({ rating: 5, status: "COMPLETED", completedAt: new Date("2026-09-02T00:00:00.000Z") });

        const response = await GET();
        const body = await response.json();
        const quality = body.preview.components.find((component: { key: string }) => component.key === "customerQuality");

        expect(quality.points).toBeNull();
        expect(body.preview.missingComponents).toContain("customerQuality");
        expect(body.preview.isProvisional).toBe(true);
    });

    it("keeps an invalid legacy supervisor rating waiting instead of clamping it into points", async () => {
        configFindUniqueMock.mockResolvedValue({ value: "period-1" });
        periodFindUniqueMock.mockResolvedValue(closedPeriod);
        submissionFindUniqueMock.mockResolvedValue({ rating: 0, status: "COMPLETED", completedAt: new Date("2026-09-02T00:00:00.000Z") });

        const response = await GET();
        const body = await response.json();
        const supervisor = body.preview.components.find((component: { key: string }) => component.key === "supervisorSop");

        expect(supervisor.points).toBeNull();
        expect(body.preview.missingComponents).toContain("supervisorSop");
        expect(body.preview.isProvisional).toBe(true);
    });
});
