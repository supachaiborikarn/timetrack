import { describe, expect, it } from "vitest";
import { calculatePayrollPeriod } from "../payroll-calculation";

const bkkDate = (date: string) => new Date(`${date}T00:00:00+07:00`);

function attendance(date: string, actualHours: number) {
    return {
        id: date,
        date: bkkDate(date),
        status: "APPROVED",
        checkInTime: new Date(`${date}T06:00:00+07:00`),
        checkOutTime: new Date(`${date}T18:00:00+07:00`),
        actualHours,
        overtimeHours: Math.max(0, actualHours - 8),
    };
}

describe("payroll station OT integration", () => {
    it("calculates WKO OT and early-leave deduction from the same daily source", () => {
        const result = calculatePayrollPeriod({
            startDate: "2026-08-26",
            endDate: "2026-08-27",
            stationCode: "WKO",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            attendance: [
                attendance("2026-08-26", 11.5),
                attendance("2026-08-27", 10),
            ],
            overrides: [],
        });

        expect(result.dailyRecords[0].overtimeHours).toBe(1);
        expect(result.dailyRecords[0].otAmount).toBe(35);
        expect(result.dailyRecords[1].earlyLeavePenalty).toBe(50);
        expect(result.overtimePay).toBe(35);
        expect(result.earlyLeavePenalty).toBe(50);
        expect(result.totalDeductions).toBe(50);
        expect(result.totalPay).toBe(685);
    });

    it("keeps an HR OT override higher priority than the automatic amount", () => {
        const result = calculatePayrollPeriod({
            startDate: "2026-08-26",
            endDate: "2026-08-26",
            stationCode: "SPC",
            dailyRate: 350,
            isSocialSecurityRegistered: false,
            attendance: [attendance("2026-08-26", 12)],
            overrides: [{ date: bkkDate("2026-08-26"), overrideOT: 100 }],
        });

        expect(result.dailyRecords[0].overtimeHours).toBe(1);
        expect(result.dailyRecords[0].otAmount).toBe(100);
        expect(result.overtimePay).toBe(100);
    });
});
