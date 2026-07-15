import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadPayrollCalculations } from "@/lib/payroll-service";
import { roundMoney } from "@/lib/payroll-calculation";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const stationId = searchParams.get("stationId");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        const payroll = await loadPayrollCalculations({ startDate, endDate, stationId });
        const employees = payroll.employees
            .filter(({ calculation }) => calculation.dailyRecords.some((record) => record.attendance))
            .map(({ employee, calculation }) => ({
                id: employee.id,
                name: employee.name,
                employeeId: employee.employeeId,
                station: employee.station?.name || "-",
                department: employee.department?.name || "-",
                workDays: calculation.workDays,
                totalHours: calculation.totalHours,
                overtimeHours: roundMoney(calculation.dailyRecords.reduce(
                    (sum, record) => sum + record.overtimeHours,
                    0,
                )),
                lateDays: calculation.dailyRecords.filter(
                    (record) => (record.attendance?.lateMinutes || 0) > 0,
                ).length,
                latePenalty: calculation.latePenalty,
            }));

        // Summary
        const summary = {
            totalEmployees: employees.length,
            totalWorkDays: roundMoney(employees.reduce((sum, e) => sum + e.workDays, 0)),
            totalHours: roundMoney(employees.reduce((sum, e) => sum + e.totalHours, 0)),
            totalOT: roundMoney(employees.reduce((sum, e) => sum + e.overtimeHours, 0)),
            totalLateDays: employees.reduce((sum, e) => sum + e.lateDays, 0),
            totalLatePenalty: roundMoney(employees.reduce((sum, e) => sum + e.latePenalty, 0)),
        };

        return NextResponse.json({
            employees: employees.sort((a, b) => a.name.localeCompare(b.name)),
            summary,
        });
    } catch (error) {
        console.error("Error generating report:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
