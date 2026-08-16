import { describe, expect, it } from "vitest";
import {
    calculatePayrollPeriod,
    selectApprovedAttendanceByBangkokDate,
} from "../payroll-calculation";

const bkkDate = (date: string) => new Date(`${date}T00:00:00+07:00`);

describe("payroll-calculation", () => {
    it("uses approved attendance only and chooses the canonical Bangkok-midnight duplicate", () => {
        const selected = selectApprovedAttendanceByBangkokDate([
            { id: "legacy", date: new Date("2026-05-26T00:00:00Z"), status: "APPROVED", checkInTime: new Date(), actualHours: 5 },
            { id: "canonical", date: bkkDate("2026-05-26"), status: "APPROVED", checkInTime: new Date(), actualHours: 10 },
            { id: "rejected", date: bkkDate("2026-05-27"), status: "REJECTED", checkInTime: new Date(), actualHours: 10 },
        ]);

        expect(selected.get("2026-05-26")?.id).toBe("canonical");
        expect(selected.has("2026-05-27")).toBe(false);
    });

    it("counts a bonus and period deduction even when the final day has no attendance", () => {
        const result = calculatePayrollPeriod({
            startDate: "2026-05-26",
            endDate: "2026-06-25",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            attendance: [],
            overrides: [{ date: bkkDate("2026-06-25"), adjustment: 500, otherDeduction: 100 }],
        });

        expect(result.adjustment).toBe(500);
        expect(result.otherExpenses).toBe(100);
        expect(result.totalPay).toBe(400);
        expect(result.hasPayrollActivity).toBe(true);
    });

    it("includes approved special income and excludes pending special income", () => {
        const result = calculatePayrollPeriod({
            startDate: "2026-06-01",
            endDate: "2026-06-30",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            attendance: [],
            overrides: [],
            specialIncomes: [
                { date: bkkDate("2026-06-10"), amount: 300, status: "APPROVED" },
                { date: bkkDate("2026-06-11"), amount: 200, status: "PENDING" },
            ],
        });

        expect(result.specialIncome).toBe(300);
        expect(result.totalPay).toBe(300);
    });

    it("applies the March-April OT rule consistently", () => {
        const result = calculatePayrollPeriod({
            startDate: "2026-03-26",
            endDate: "2026-04-25",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            attendance: [],
            overrides: [{ date: bkkDate("2026-04-10"), overrideOT: 900 }],
        });

        expect(result.overtimePay).toBe(0);
    });

    it("uses the 2026 social security ceiling and rounds money to satang", () => {
        const attendance = Array.from({ length: 60 }, (_, index) => ({
            id: String(index),
            date: bkkDate(`2026-06-${String((index % 30) + 1).padStart(2, "0")}`),
            status: "APPROVED",
            checkInTime: new Date(),
            actualHours: 10,
            updatedAt: new Date(2026, 0, index + 1),
        }));
        const result = calculatePayrollPeriod({
            startDate: "2026-06-01",
            endDate: "2026-06-30",
            dailyRate: 700,
            isSocialSecurityRegistered: true,
            attendance,
            overrides: [],
        });

        expect(result.regularPay).toBe(21_000);
        expect(result.socialSecurity).toBe(875);
        expect(result.totalPay).toBe(20_125);
    });

    it("keeps a legacy recurring deduction until a period value is saved", () => {
        const legacy = calculatePayrollPeriod({
            startDate: "2026-06-01",
            endDate: "2026-06-30",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            legacyOtherDeduction: 360,
            attendance: [],
            overrides: [],
        });
        const cleared = calculatePayrollPeriod({
            startDate: "2026-06-01",
            endDate: "2026-06-30",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            legacyOtherDeduction: 360,
            attendance: [],
            overrides: [{ date: bkkDate("2026-06-30"), otherDeduction: 0 }],
        });

        expect(legacy.otherExpenses).toBe(360);
        expect(cleared.otherExpenses).toBe(0);
    });

    describe("probation daily rate", () => {
        // Three full working days: 1, 2 and 3 June. 10h is the full-day threshold
        // (FULL_DAY_MIN_HOURS) — 8h would only count as a half day.
        const threeFullDays = [
            { id: "d1", date: bkkDate("2026-06-01"), status: "APPROVED", checkInTime: bkkDate("2026-06-01"), actualHours: 10 },
            { id: "d2", date: bkkDate("2026-06-02"), status: "APPROVED", checkInTime: bkkDate("2026-06-02"), actualHours: 10 },
            { id: "d3", date: bkkDate("2026-06-03"), status: "APPROVED", checkInTime: bkkDate("2026-06-03"), actualHours: 10 },
        ];
        const baseInput = {
            startDate: "2026-06-01",
            endDate: "2026-06-30",
            dailyRate: 400,
            isSocialSecurityRegistered: false,
            attendance: threeFullDays,
            overrides: [],
        };

        it("pays the normal rate for every day when no probation rate is set", () => {
            const result = calculatePayrollPeriod(baseInput);
            expect(result.totalPay).toBe(1200); // 3 × 400
        });

        it("pays the probation rate for every day inside the probation window", () => {
            const result = calculatePayrollPeriod({
                ...baseInput,
                probationDailyRate: 300,
                probationEndDate: bkkDate("2026-06-30"),
            });
            expect(result.totalPay).toBe(900); // 3 × 300
        });

        it("switches rate mid-period on the day after probation ends", () => {
            const result = calculatePayrollPeriod({
                ...baseInput,
                probationDailyRate: 300,
                probationEndDate: bkkDate("2026-06-02"),
            });
            // 1 and 2 June at 300 (end date is inclusive), 3 June at the normal 400
            expect(result.totalPay).toBe(1000);
        });

        it("falls back to the normal rate when an end date is set without a probation rate", () => {
            const result = calculatePayrollPeriod({
                ...baseInput,
                probationDailyRate: null,
                probationEndDate: bkkDate("2026-06-30"),
            });
            expect(result.totalPay).toBe(1200);
        });

        it("falls back to the normal rate when a probation rate is set without an end date", () => {
            const result = calculatePayrollPeriod({
                ...baseInput,
                probationDailyRate: 300,
                probationEndDate: null,
            });
            expect(result.totalPay).toBe(1200);
        });

        it("accepts a plain date-key string for the probation end date", () => {
            const result = calculatePayrollPeriod({
                ...baseInput,
                probationDailyRate: 300,
                probationEndDate: "2026-06-02",
            });
            expect(result.totalPay).toBe(1000);
        });

        it("lets a per-day wage override win over the probation rate", () => {
            const result = calculatePayrollPeriod({
                ...baseInput,
                probationDailyRate: 300,
                probationEndDate: bkkDate("2026-06-30"),
                overrides: [{ date: bkkDate("2026-06-01"), overrideDailyWage: 500 }],
            });
            // 1 June overridden to 500, 2 and 3 June at the probation rate
            expect(result.totalPay).toBe(1100);
        });
    });
});
