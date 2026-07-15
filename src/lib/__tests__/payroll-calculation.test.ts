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
});
