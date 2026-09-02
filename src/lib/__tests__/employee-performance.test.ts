import { describe, expect, it } from "vitest";
import {
    calculateEmployeePerformance,
    type PerformanceAttendance,
    type PerformanceShiftAssignment,
} from "@/lib/employee-performance";

const bkkDate = (date: string, time = "00:00") => new Date(`${date}T${time}:00+07:00`);

const assignment = (date: string, overrides: Partial<PerformanceShiftAssignment["shift"]> = {}): PerformanceShiftAssignment => ({
    date: bkkDate(date),
    isDayOff: false,
    shift: {
        startTime: "08:00",
        endTime: "17:00",
        breakMinutes: 60,
        isNightShift: false,
        ...overrides,
    },
});

const attendance = (date: string, overrides: Partial<PerformanceAttendance> = {}): PerformanceAttendance => ({
    date: bkkDate(date),
    checkInTime: bkkDate(date, "08:00"),
    checkOutTime: bkkDate(date, "17:00"),
    lateMinutes: 0,
    breakDurationMin: 60,
    ...overrides,
});

const noCustomer = {
    applicable: false,
    score64: null,
    responseCount: 0,
    minimumSample: 10,
    meetsMinimumSample: false,
};

describe("employee performance", () => {
    it("deduplicates overlapping leave and still counts another scheduled absence", () => {
        const sameLeave = { startDate: bkkDate("2026-09-01"), endDate: bkkDate("2026-09-01"), status: "APPROVED" as const };
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01"), assignment("2026-09-02")],
            attendances: [],
            leaves: [sameLeave, sameLeave],
            customer: noCustomer,
            referenceTime: bkkDate("2026-09-03", "12:00"),
        });

        expect(result.counts.approvedLeaveDays).toBe(1);
        expect(result.counts.duplicateLeaveDays).toBe(1);
        expect(result.counts.absentDays).toBe(1);
        expect(result.score).toBe(0);
    });

    it("does not let unscheduled attendance cancel a scheduled absence", () => {
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01")],
            attendances: [attendance("2026-09-07")],
            leaves: [],
            customer: noCustomer,
            referenceTime: bkkDate("2026-09-08", "12:00"),
        });

        expect(result.counts.absentDays).toBe(1);
        expect(result.counts.unscheduledAttendanceDays).toBe(1);
        expect(result.score).toBe(0);
    });

    it("deducts more for severe lateness", () => {
        const base = {
            assignments: [assignment("2026-09-01")],
            leaves: [],
            customer: noCustomer,
            referenceTime: bkkDate("2026-09-02", "12:00"),
        };
        const tenMinutes = calculateEmployeePerformance({
            ...base,
            attendances: [attendance("2026-09-01", { lateMinutes: 10 })],
        });
        const twoHours = calculateEmployeePerformance({
            ...base,
            attendances: [attendance("2026-09-01", { lateMinutes: 120 })],
        });

        expect(tenMinutes.score).toBeGreaterThan(twoHours.score!);
        expect(tenMinutes.components.punctuality).toBe(12.5);
        expect(twoHours.components.punctuality).toBe(0);
    });

    it("uses checkout and shift end to score early leave", () => {
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01")],
            attendances: [attendance("2026-09-01", { checkOutTime: bkkDate("2026-09-01", "16:30") })],
            leaves: [],
            customer: noCustomer,
            referenceTime: bkkDate("2026-09-02", "12:00"),
        });

        expect(result.counts.earlyLeaveDays).toBe(1);
        expect(result.components.completion).toBe(5);
    });

    it("scores only break time beyond the configured allowance and grace", () => {
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01")],
            attendances: [attendance("2026-09-01", { breakDurationMin: 95 })],
            leaves: [],
            customer: noCustomer,
            referenceTime: bkkDate("2026-09-02", "12:00"),
        });

        expect(result.counts.overBreakDays).toBe(1);
        expect(result.components.breakDiscipline).toBe(0);
        expect(result.score).toBe(83);
    });

    it("adds customer rubric as forty points after the minimum sample", () => {
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01")],
            attendances: [attendance("2026-09-01")],
            leaves: [],
            customer: { applicable: true, score64: 32, responseCount: 10, minimumSample: 10, meetsMinimumSample: true },
            referenceTime: bkkDate("2026-09-02", "12:00"),
        });

        expect(result.workPoints).toBe(60);
        expect(result.customerPoints).toBe(20);
        expect(result.score).toBe(80);
        expect(result.isProvisional).toBe(false);
    });

    it("shows attendance-only provisional score before ten customer responses", () => {
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01")],
            attendances: [attendance("2026-09-01")],
            leaves: [],
            customer: { applicable: true, score64: null, responseCount: 9, minimumSample: 10, meetsMinimumSample: false },
            referenceTime: bkkDate("2026-09-02", "12:00"),
        });

        expect(result.score).toBe(100);
        expect(result.customerIncluded).toBe(false);
        expect(result.isProvisional).toBe(true);
    });

    it("does not assign a score before any scheduled day is due", () => {
        const result = calculateEmployeePerformance({
            assignments: [assignment("2026-09-01")],
            attendances: [],
            leaves: [],
            customer: noCustomer,
            referenceTime: bkkDate("2026-09-01", "07:00"),
        });

        expect(result.counts.upcomingDays).toBe(1);
        expect(result.score).toBeNull();
    });
});
