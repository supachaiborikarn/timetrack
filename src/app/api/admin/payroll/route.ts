import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
        const departmentId = searchParams.get("departmentId");
        const normalHoursPerDay = parseFloat(searchParams.get("normalHoursPerDay") || "10.5");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        // Get all employees
        const employeeWhere: Record<string, unknown> = {
            isActive: true,
            role: "EMPLOYEE",
        };

        if (stationId) {
            employeeWhere.stationId = stationId;
        }

        if (departmentId) {
            employeeWhere.departmentId = departmentId;
        }

        const employees = await prisma.user.findMany({
            where: employeeWhere,
            include: {
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        // Get attendance in range for all employees
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: { in: employees.map((e) => e.id) },
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });

        // Calculate payroll for each employee
        const payrollData = employees.map((emp) => {
            const empAttendance = attendanceRecords.filter((a) => a.userId === emp.id);

            // Daily rate from employee
            const dailyRate = Number(emp.dailyRate) || 0;

            let workDays = 0;
            let totalHours = 0;
            let latePenalty = 0;

            for (const record of empAttendance) {
                if (record.checkInTime) {
                    workDays++;
                    const actualHours = record.actualHours ? Number(record.actualHours) : 0;
                    totalHours += actualHours;

                    // Late penalty
                    if (record.latePenaltyAmount) {
                        latePenalty += Number(record.latePenaltyAmount);
                    }
                }
            }

            // Calculate pay: daily rate × work days
            const regularPay = workDays * dailyRate;
            const overtimePay = 0; // OT/รายได้พิเศษ เพิ่มโดย HR
            const totalPay = regularPay + overtimePay - latePenalty;

            return {
                id: emp.id,
                name: emp.name,
                nickName: emp.nickName,
                employeeId: emp.employeeId,
                station: emp.station?.name || "-",
                department: emp.department?.name || "-",
                dailyRate,
                workDays,
                totalHours,
                regularPay,
                overtimePay,
                latePenalty,
                totalPay,
                bankName: emp.bankName,
                bankAccountNumber: emp.bankAccountNumber,
            };
        });

        // Filter out employees with no work days
        const activePayroll = payrollData.filter((p) => p.workDays > 0);

        // Summary
        const summary = {
            totalEmployees: activePayroll.length,
            totalWorkDays: activePayroll.reduce((sum, p) => sum + p.workDays, 0),
            totalHours: activePayroll.reduce((sum, p) => sum + p.totalHours, 0),
            totalRegularPay: activePayroll.reduce((sum, p) => sum + p.regularPay, 0),
            totalOvertimePay: activePayroll.reduce((sum, p) => sum + p.overtimePay, 0),
            totalLatePenalty: activePayroll.reduce((sum, p) => sum + p.latePenalty, 0),
            grandTotal: activePayroll.reduce((sum, p) => sum + p.totalPay, 0),
        };

        return NextResponse.json({
            employees: activePayroll.sort((a, b) => a.name.localeCompare(b.name)),
            summary,
        });
    } catch (error) {
        console.error("Error calculating payroll:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
