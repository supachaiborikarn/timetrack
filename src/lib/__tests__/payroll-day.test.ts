import { describe, expect, it } from "vitest";
import {
    calculatePayrollDay,
    countWorkDayTypes,
    formatWorkDays,
} from "../payroll-day";

describe("payroll-day", () => {
    it("counts a full day at 10 hours and pays full daily wage", () => {
        expect(calculatePayrollDay({
            hasCheckIn: true,
            actualHours: 10,
            dailyRate: 330,
        })).toEqual({ dayFactor: 1, dailyWage: 330 });
    });

    it("counts a half day at 5.5 hours and pays half daily wage", () => {
        expect(calculatePayrollDay({
            hasCheckIn: true,
            actualHours: 5.5,
            dailyRate: 330,
        })).toEqual({ dayFactor: 0.5, dailyWage: 165 });
    });

    it("combines two half days into one work day", () => {
        const records = [
            calculatePayrollDay({ hasCheckIn: true, actualHours: 5.5, dailyRate: 330 }),
            calculatePayrollDay({ hasCheckIn: true, actualHours: 6, dailyRate: 330 }),
        ];

        const workDays = records.reduce((sum, record) => sum + record.dayFactor, 0);

        expect(workDays).toBe(1);
        expect(records.reduce((sum, record) => sum + record.dailyWage, 0)).toBe(330);
    });

    it("uses HR wage override to infer the work-day count", () => {
        expect(calculatePayrollDay({
            hasCheckIn: true,
            actualHours: 12,
            dailyRate: 330,
            overrideDailyWage: 165,
        })).toEqual({ dayFactor: 0.5, dailyWage: 165 });
    });

    it("formats fractional work days for display", () => {
        expect(formatWorkDays(28)).toBe("28");
        expect(formatWorkDays(28.5)).toBe("28.5");
        expect(formatWorkDays(28.25)).toBe("28.25");
    });

    it("counts full and half day entries", () => {
        expect(countWorkDayTypes([
            { dayFactor: 1 },
            { dayFactor: 0.5 },
            { dayFactor: 0.5 },
            { dayFactor: 0 },
        ])).toEqual({ fullDayCount: 1, halfDayCount: 2 });
    });
});
