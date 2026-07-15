import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { roundMoney, toBangkokDateKey } from "@/lib/payroll-calculation";
import { loadPayrollCalculations } from "@/lib/payroll-service";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return ApiErrors.unauthorized();
        const { searchParams } = new URL(request.url);
        const month = Number(searchParams.get("month") || new Date().getMonth() + 1);
        const year = Number(searchParams.get("year") || new Date().getFullYear());
        if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year)) {
            return ApiErrors.validation("Invalid month or year");
        }

        const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
        const payroll = await loadPayrollCalculations({ userId: session.user.id, startDate, endDate });
        const result = payroll.employees[0];
        if (!result) return ApiErrors.notFound("User");
        const { employee, calculation, specialIncomes, advances } = result;

        const dailyBreakdown = calculation.dailyRecords.map((record) => ({
            date: record.date,
            status: record.attendance?.status || "NO_ATTENDANCE",
            checkIn: record.attendance?.checkInTime?.toISOString() || null,
            checkOut: record.attendance?.checkOutTime?.toISOString() || null,
            actualHours: record.attendance?.actualHours == null ? null : Number(record.attendance.actualHours),
            dayFactor: record.dayFactor,
            overtimeHours: record.attendance?.overtimeHours == null ? 0 : Number(record.attendance.overtimeHours),
            dailyWage: record.dailyWage,
            overtimePay: record.otAmount,
            latePenalty: record.latePenalty,
            breakPenalty: 0,
            totalPenalty: roundMoney(record.latePenalty + record.otherDeduction),
            adjustment: record.adjustment,
            specialIncomes: record.specialIncomes.map((income) => ({
                id: income.id || `${record.date}-${income.type || "income"}`,
                type: income.type || "OTHER",
                description: income.description || null,
                salesAmount: income.salesAmount == null ? null : Number(income.salesAmount),
                percentage: income.percentage == null ? null : Number(income.percentage),
                amount: Number(income.amount),
                status: income.status,
            })),
            netDaily: record.total,
            hasOverride: !!record.override,
        }));
        const totalSpecialIncome = roundMoney(specialIncomes.reduce((total, income) => total + Math.max(0, Number(income.amount) || 0), 0));
        const pendingCount = specialIncomes.filter((income) => income.status === "PENDING").length;

        return successResponse({
            employee: {
                name: employee.name,
                employeeId: employee.employeeId,
                station: employee.station?.name || null,
                department: employee.department?.name || null,
                dailyRate: Math.max(0, Number(employee.dailyRate) || 0),
            },
            period: { month, year, startDate, endDate },
            dailyBreakdown,
            monthSummary: {
                totalDailyWage: calculation.regularPay,
                totalOT: calculation.overtimePay,
                totalSpecialIncome,
                totalApprovedSpecialIncome: calculation.specialIncome,
                totalAdjustment: calculation.adjustment,
                totalPenalty: roundMoney(calculation.latePenalty + calculation.otherExpenses + calculation.socialSecurity),
                totalAdvanceDeduct: calculation.advanceDeduction,
                otherExpenses: calculation.otherExpenses,
                socialSecurity: calculation.socialSecurity,
                totalDeductions: calculation.totalDeductions,
                projectedNetPay: calculation.totalPay,
                workDays: calculation.workDays,
                fullDayCount: calculation.fullDayCount,
                halfDayCount: calculation.halfDayCount,
                pendingItems: pendingCount,
            },
            advances: advances.map((advance) => ({
                id: advance.id,
                amount: Number(advance.amount),
                date: toBangkokDateKey(advance.date),
                status: advance.status,
                reason: advance.reason,
            })),
        });
    } catch (error) {
        console.error("Wallet API error:", error);
        return ApiErrors.internal();
    }
}
