import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "@/lib/date-utils";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
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

        // Build where clause
        const where: Record<string, unknown> = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (stationId) {
            where.user = { stationId };
        }

        if (session.user.role === "MANAGER" && session.user.stationId) {
            where.user = { stationId: session.user.stationId };
        }

        const records = await prisma.attendance.findMany({
            where,
            include: {
                user: {
                    include: {
                        station: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: [{ date: "asc" }, { user: { name: "asc" } }],
        });

        // Build Excel data
        const headers = [
            "วันที่",
            "รหัสพนักงาน",
            "ชื่อ-นามสกุล",
            "สถานี",
            "แผนก",
            "เข้างาน",
            "ออกงาน",
            "ชม.ทำงาน",
            "OT (ชม.)",
            "สาย (นาที)",
            "หักสาย (บาท)",
            "สถานะ",
        ];

        const rows = records.map((r) => [
            format(r.date, "dd/MM/yyyy"),
            r.user.employeeId,
            r.user.name,
            r.user.station?.name || "-",
            r.user.department?.name || "-",
            r.checkInTime ? format(r.checkInTime, "HH:mm") : "-",
            r.checkOutTime ? format(r.checkOutTime, "HH:mm") : "-",
            r.actualHours ? Number(r.actualHours).toFixed(1) : "-",
            r.overtimeHours ? Number(r.overtimeHours).toFixed(1) : "-",
            r.lateMinutes || "-",
            r.latePenaltyAmount ? Number(r.latePenaltyAmount).toFixed(0) : "-",
            r.status === "APPROVED" ? "อนุมัติ" : r.status === "REJECTED" ? "ไม่อนุมัติ" : "รอตรวจสอบ",
        ]);

        // Summary statistics
        const totalHours = records.reduce((sum, r) => sum + (r.actualHours ? Number(r.actualHours) : 0), 0);
        const totalOT = records.reduce((sum, r) => sum + (r.overtimeHours ? Number(r.overtimeHours) : 0), 0);
        const totalLate = records.filter((r) => r.lateMinutes && r.lateMinutes > 0).length;
        const totalPenalty = records.reduce((sum, r) => sum + (r.latePenaltyAmount ? Number(r.latePenaltyAmount) : 0), 0);

        // Add summary rows
        rows.push([]);
        rows.push(["สรุป"]);
        rows.push(["รายการทั้งหมด", records.length.toString()]);
        rows.push(["ชั่วโมงรวม", totalHours.toFixed(1)]);
        rows.push(["OT รวม", totalOT.toFixed(1)]);
        rows.push(["จำนวนวันมาสาย", totalLate.toString()]);
        rows.push(["หักสายรวม (บาท)", totalPenalty.toFixed(0)]);

        // Create workbook
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        // Set column widths
        ws["!cols"] = [
            { wch: 12 }, // วันที่
            { wch: 10 }, // รหัส
            { wch: 20 }, // ชื่อ
            { wch: 15 }, // สถานี
            { wch: 12 }, // แผนก
            { wch: 8 },  // เข้า
            { wch: 8 },  // ออก
            { wch: 8 },  // ชม.
            { wch: 8 },  // OT
            { wch: 8 },  // สาย
            { wch: 10 }, // หักสาย
            { wch: 12 }, // สถานะ
        ];

        XLSX.utils.book_append_sheet(wb, ws, "รายงานเวลาทำงาน");

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `attendance_${startDate}_${endDate}.xlsx`;

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
