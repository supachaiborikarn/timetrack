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
    bonusPeriodReportMock,
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
    bonusPeriodReportMock: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: authMock }));
vi.mock("@/lib/cashier-weekly-report", () => ({ getCashierBonusPeriodReport: bonusPeriodReportMock }));
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

const restroomQuestionKeys = [
    "restroom_floor_clean",
    "restroom_fixtures_clean",
    "restroom_no_bad_odor",
    "restroom_supplies_ready",
    "restroom_bin_orderly",
] as const;

function perfectStationFeedback() {
    return Array.from({ length: 20 }, () => ({ overallRating: 5 }));
}

function perfectRestroomFeedback() {
    return Array.from({ length: 10 }, (_, index) => ({
        id: `restroom-${index + 1}`,
        overallRating: 5,
        answers: restroomQuestionKeys.map((questionKey) => ({ questionKey, choiceValues: ["YES"] })),
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
        bonusPeriodReportMock.mockResolvedValue({ finalizedWeekCount: 0, readyWeekCount: 0, periodKeys: [], result: null });
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

    it("uses finalized weekly cashier scores as the visible CNY forecast", async () => {
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
        periodFindUniqueMock.mockResolvedValue({ ...closedPeriod, isActive: true, closedAt: null, endDate: new Date("2027-02-28T17:00:00.000Z") });
        bonusPeriodReportMock.mockResolvedValue({
            finalizedWeekCount: 1,
            readyWeekCount: 1,
            periodKeys: ["2026-08-31"],
            result: {
                score: 82.2,
                points: { teamPerformance: 42.2, stationQuality: 20, restroomQuality: 20 },
            },
        });

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.profile).toBe("FUEL_CASHIER");
        expect(body.basis).toEqual({
            type: "FINALIZED_WEEKLY_AVERAGE",
            readyWeeks: 1,
            finalizedWeeks: 1,
            periodKeys: ["2026-08-31"],
        });
        expect(body.score).toMatchObject({ score: 82.2, forecastScore: 82.2, knownWeight: 100 });
        expect(body.preview).toMatchObject({ forecastScore: 82.2, bonusPercent: 80, knownWeight: 100, isProvisional: true });
        expect(body.preview.components).toEqual([
            expect.objectContaining({ key: "teamPerformance", points: 42.2, maxPoints: 60 }),
            expect.objectContaining({ key: "stationQuality", points: 20, maxPoints: 20 }),
            expect.objectContaining({ key: "restroomQuality", points: 20, maxPoints: 20 }),
        ]);
        expect(userFindManyMock).not.toHaveBeenCalled();
        expect(responseFindManyMock).not.toHaveBeenCalled();
    });

    it("gives an oil-station cashier the automatic 60/20/20 score", async () => {
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
        assignmentFindManyMock.mockResolvedValue([{ ...perfectAssignment, userId: "team-1" }]);
        attendanceFindManyMock.mockResolvedValue([{ ...perfectAttendance, userId: "team-1" }]);
        leaveFindManyMock.mockResolvedValue([]);
        responseFindManyMock
            .mockResolvedValueOnce(perfectFeedback("team-1"))
            .mockResolvedValueOnce(perfectStationFeedback())
            .mockResolvedValueOnce(perfectRestroomFeedback());

        const response = await GET();
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.enabled).toBe(true);
        expect(body.profile).toBe("FUEL_CASHIER");
        expect(body.score).toMatchObject({
            score: 100,
            forecastScore: 100,
            knownWeight: 100,
            sourceScores: { teamPerformanceScore: 100, stationScore: 100, restroomScore: 100 },
        });
        expect(body.preview).toMatchObject({ profile: "FUEL_CASHIER", forecastScore: 100, bonusPercent: 100, knownWeight: 100 });
        expect(body.preview.components).toEqual([
            expect.objectContaining({ key: "teamPerformance", label: "ผลงานพนักงานในปั๊ม", points: 60, maxPoints: 60 }),
            expect.objectContaining({ key: "stationQuality", label: "คะแนนภาพรวมปั๊ม", points: 20, maxPoints: 20 }),
            expect.objectContaining({ key: "restroomQuality", label: "คะแนนห้องน้ำ", points: 20, maxPoints: 20 }),
        ]);
        expect(submissionFindUniqueMock).not.toHaveBeenCalled();
        expect(caseCountMock).not.toHaveBeenCalled();
        expect(JSON.stringify(body)).not.toContain("responseCount");
        expect(JSON.stringify(body)).not.toContain("minimumSample");
    });

    it("keeps team performance waiting when a relevant teammate lacks the customer minimum", async () => {
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
        assignmentFindManyMock.mockResolvedValue([
            { ...perfectAssignment, userId: "team-1" },
            { ...perfectAssignment, userId: "team-2" },
        ]);
        attendanceFindManyMock.mockResolvedValue([
            { ...perfectAttendance, userId: "team-1" },
            { ...perfectAttendance, userId: "team-2" },
        ]);
        leaveFindManyMock.mockResolvedValue([]);
        responseFindManyMock
            .mockResolvedValueOnce(perfectFeedback("team-1"))
            .mockResolvedValueOnce(perfectStationFeedback())
            .mockResolvedValueOnce(perfectRestroomFeedback());

        const response = await GET();
        const body = await response.json();
        const team = body.preview.components.find((component: { key: string }) => component.key === "teamPerformance");

        expect(response.status).toBe(200);
        expect(team.points).toBeNull();
        expect(body.preview.missingComponents).toContain("teamPerformance");
        expect(body.preview.knownWeight).toBe(40);
        expect(body.preview.isProvisional).toBe(true);
        expect(body.preview.components).toEqual(expect.arrayContaining([
            expect.objectContaining({ key: "stationQuality", points: 20 }),
            expect.objectContaining({ key: "restroomQuality", points: 20 }),
        ]));
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
