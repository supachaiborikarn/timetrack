import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, format, addDays, getDate } from "@/lib/date-utils";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");
        const month = parseInt(searchParams.get("month") || "0");
        const year = parseInt(searchParams.get("year") || "0");
        const fileFormat = searchParams.get("format") || "xlsx";

        if (!stationId || !month || !year) {
            return NextResponse.json(
                { error: "stationId, month, and year are required" },
                { status: 400 }
            );
        }

        const startDate = startOfMonth(new Date(year, month - 1));
        const endDate = endOfMonth(startDate);
        const daysInMonth = getDate(endDate);

        // Get station info
        const station = await prisma.station.findUnique({
            where: { id: stationId },
        });

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        // Get all employees of the station
        const employees = await prisma.user.findMany({
            where: { stationId, isActive: true, role: "EMPLOYEE" },
            include: { department: true },
            orderBy: [{ departmentId: "asc" }, { name: "asc" }],
        });

        // Get assignments for the month
        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: { in: employees.map((e) => e.id) },
                date: { gte: startDate, lte: endDate },
            },
            include: { shift: true },
        });

        // Build Excel data
        const headers = [
            "รหัส",
            "ชื่อ-นามสกุล",
            "แผนก",
            ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()),
            "รวมวัน",
        ];

        const rows = employees.map((emp) => {
            const empAssignments = assignments.filter((a) => a.userId === emp.id);
            const dailyShifts: string[] = [];
            let workDays = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = format(new Date(year, month - 1, day), "yyyy-MM-dd");
                const assignment = empAssignments.find(
                    (a) => format(a.date, "yyyy-MM-dd") === dateStr
                );

                if (assignment) {
                    if (assignment.isDayOff) {
                        dailyShifts.push("X");
                    } else {
                        dailyShifts.push(assignment.shift.code);
                        workDays++;
                    }
                } else {
                    dailyShifts.push("-");
                }
            }

            return [
                emp.employeeId,
                emp.name,
                emp.department?.name || "-",
                ...dailyShifts,
                workDays.toString(),
            ];
        });

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Set column widths
        ws["!cols"] = [
            { wch: 8 },  // รหัส
            { wch: 20 }, // ชื่อ
            { wch: 12 }, // แผนก
            ...Array(daysInMonth).fill({ wch: 4 }), // days
            { wch: 8 },  // รวม
        ];

        const sheetName = `ตารางกะ ${month}/${year}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Generate buffer
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Return as downloadable file
        const filename = `schedule_${station.code}_${year}_${month.toString().padStart(2, "0")}.xlsx`;

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting schedule:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
