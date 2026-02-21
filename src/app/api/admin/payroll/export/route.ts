import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "@/lib/date-utils";
import * as XLSX from "xlsx";

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

        // Get attendance in range
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: { in: employees.map((e) => e.id) },
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });

        // Calculate payroll per employee
        const payrollData = employees.map((emp) => {
            const empAttendance = attendanceRecords.filter((a) => a.userId === emp.id);

            const dailyRate = Number(emp.dailyRate) || 0;
            const hourlyRate = Number(emp.hourlyRate) || (dailyRate / normalHoursPerDay);

            let workDays = 0;
            let totalHours = 0;
            let regularHours = 0;
            let latePenalty = 0;

            for (const record of empAttendance) {
                if (record.checkInTime) {
                    workDays++;
                    const actualHours = record.actualHours ? Number(record.actualHours) : 0;
                    totalHours += actualHours;

                    regularHours += actualHours;

                    if (record.latePenaltyAmount) {
                        latePenalty += Number(record.latePenaltyAmount);
                    }
                }
            }

            const regularPay = regularHours * hourlyRate;
            const overtimePay = 0; // OT added manually by HR
            const totalPay = regularPay + overtimePay - latePenalty;

            return {
                employeeId: emp.employeeId,
                name: emp.name,
                station: emp.station?.name || "-",
                department: emp.department?.name || "-",
                dailyRate,
                hourlyRate,
                workDays,
                totalHours,
                regularHours,
                overtimeHours: 0,
                regularPay,
                overtimePay,
                latePenalty,
                totalPay,
            };
        }).filter((p) => p.workDays > 0);

        // Build Excel
        const headers = [
            "รหัสพนักงาน",
            "ชื่อ-นามสกุล",
            "สถานี",
            "แผนก",
            "ค่าแรง/วัน",
            "ค่าแรง/ชม.",
            "วันทำงาน",
            "ชม.รวม",
            "ชม.ปกติ",
            "ชม. OT",
            "ค่าแรงปกติ",
            "ค่า OT",
            "หักสาย",
            "รวมสุทธิ",
        ];

        const rows = payrollData.map((p) => [
            p.employeeId,
            p.name,
            p.station,
            p.department,
            p.dailyRate.toFixed(2),
            p.hourlyRate.toFixed(2),
            p.workDays,
            p.totalHours.toFixed(1),
            p.regularHours.toFixed(1),
            p.overtimeHours.toFixed(1),
            p.regularPay.toFixed(2),
            p.overtimePay.toFixed(2),
            p.latePenalty.toFixed(2),
            p.totalPay.toFixed(2),
        ]);

        // Summary
        const totalRegularPay = payrollData.reduce((sum, p) => sum + p.regularPay, 0);
        const totalOTPay = payrollData.reduce((sum, p) => sum + p.overtimePay, 0);
        const totalLatePenalty = payrollData.reduce((sum, p) => sum + p.latePenalty, 0);
        const grandTotal = payrollData.reduce((sum, p) => sum + p.totalPay, 0);

        rows.push([]);
        rows.push(["สรุปรวม"]);
        rows.push(["จำนวนพนักงาน", payrollData.length.toString()]);
        rows.push(["ชั่วโมงปกติต่อวัน (ตั้งค่า)", normalHoursPerDay.toFixed(1)]);
        rows.push(["ค่าแรงปกติรวม", "", "", "", "", "", "", "", "", "", totalRegularPay.toFixed(2)]);
        rows.push(["ค่า OT รวม", "", "", "", "", "", "", "", "", "", "", totalOTPay.toFixed(2)]);
        rows.push(["หักสายรวม", "", "", "", "", "", "", "", "", "", "", "", totalLatePenalty.toFixed(2)]);
        rows.push(["รวมสุทธิทั้งหมด", "", "", "", "", "", "", "", "", "", "", "", "", grandTotal.toFixed(2)]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        ws["!cols"] = [
            { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
            { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
            { wch: 8 }, { wch: 8 }, { wch: 12 }, { wch: 10 },
            { wch: 10 }, { wch: 12 },
        ];

        const sheetName = `เงินเดือน ${startDate} ถึง ${endDate}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const filename = `payroll_${startDate}_${endDate}.xlsx`;

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting payroll:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
