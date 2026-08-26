import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadPayrollCalculations, summarizePayroll } from "@/lib/payroll-service";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        if (!startDate || !endDate) {
            return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
        }

        const result = await loadPayrollCalculations({
            startDate,
            endDate,
            stationId: searchParams.get("stationId"),
            departmentId: searchParams.get("departmentId"),
        });
        const active = result.employees.filter(({ calculation }) => calculation.hasPayrollActivity);
        const employees = active.map(({ employee, calculation }) => ({
            id: employee.id,
            name: employee.name,
            nickName: employee.nickName,
            employeeId: employee.employeeId,
            station: employee.station?.name || "-",
            department: employee.department?.name || "-",
            dailyRate: Math.max(0, Number(employee.dailyRate) || 0),
            workDays: calculation.workDays,
            fullDayCount: calculation.fullDayCount,
            halfDayCount: calculation.halfDayCount,
            totalHours: calculation.totalHours,
            regularPay: calculation.regularPay,
            overtimePay: calculation.overtimePay,
            latePenalty: calculation.latePenalty,
            earlyLeavePenalty: calculation.earlyLeavePenalty,
            advanceDeduction: calculation.advanceDeduction,
            otherExpenses: calculation.otherExpenses,
            socialSecurity: calculation.socialSecurity,
            totalDeductions: calculation.totalDeductions,
            adjustment: calculation.adjustment,
            specialIncome: calculation.specialIncome,
            totalEarnings: calculation.totalEarnings,
            totalPay: calculation.totalPay,
            bankName: employee.bankName,
            bankAccountNumber: employee.bankAccountNumber,
        }));

        return NextResponse.json({
            employees,
            summary: {
                ...summarizePayroll(result.employees),
                ssoRate: result.ssoRate,
                ssoMax: result.ssoMax,
            },
        });
    } catch (error) {
        console.error("Error calculating payroll:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
