import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { formatWorkDays } from "@/lib/payroll-day";
import { roundMoney } from "@/lib/payroll-calculation";
import { loadPayrollCalculations } from "@/lib/payroll-service";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
        const exportFormat = searchParams.get("format") || "xlsx";

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
            }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Build Excel
        const headers = [
            "รหัสพนักงาน",
            "ชื่อ-นามสกุล",
            "สถานี",
            "แผนก",
            "วันทำงาน",
            "ชม.รวม",
            "OT (ชม.)",
            "วันมาสาย",
            "หักสาย (บาท)",
        ];

        const rows = employees.map((e) => [
            e.employeeId,
            e.name,
            e.station,
            e.department,
            formatWorkDays(e.workDays),
            e.totalHours.toFixed(1),
            e.overtimeHours.toFixed(1),
            e.lateDays,
            e.latePenalty.toFixed(0),
        ]);

        // Summary
        const totalWorkDays = roundMoney(employees.reduce((sum, e) => sum + e.workDays, 0));
        const totalHours = roundMoney(employees.reduce((sum, e) => sum + e.totalHours, 0));
        const totalOT = roundMoney(employees.reduce((sum, e) => sum + e.overtimeHours, 0));
        const totalLateDays = employees.reduce((sum, e) => sum + e.lateDays, 0);
        const totalLatePenalty = roundMoney(employees.reduce((sum, e) => sum + e.latePenalty, 0));

        rows.push([]);
        rows.push(["สรุปรวม"]);
        rows.push(["จำนวนพนักงาน", employees.length.toString()]);
        rows.push(["วันทำงานรวม", formatWorkDays(totalWorkDays)]);
        rows.push(["ชั่วโมงรวม", totalHours.toFixed(1)]);
        rows.push(["OT รวม", totalOT.toFixed(1)]);
        rows.push(["วันมาสายรวม", totalLateDays.toString()]);
        rows.push(["หักสายรวม (บาท)", totalLatePenalty.toFixed(0)]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        ws["!cols"] = [
            { wch: 12 },
            { wch: 20 },
            { wch: 15 },
            { wch: 12 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 12 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, "รายงานสรุป");

        // Handle different export formats
        if (exportFormat === "pdf") {
            // Generate PDF
            const doc = new jsPDF();

            // Title
            doc.setFontSize(16);
            doc.text("Attendance Report", 14, 20);
            doc.setFontSize(10);
            doc.text(`Period: ${startDate} - ${endDate}`, 14, 28);

            // Table
            autoTable(doc, {
                startY: 35,
                head: [["ID", "Name", "Station", "Dept", "Days", "Hours", "OT", "Late", "Penalty"]],
                body: employees.map((e) => [
                    e.employeeId,
                    e.name,
                    e.station,
                    e.department,
                    formatWorkDays(e.workDays),
                    e.totalHours.toFixed(1),
                    e.overtimeHours.toFixed(1),
                    e.lateDays,
                    e.latePenalty.toFixed(0),
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] },
            });

            // Summary
            const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
            doc.setFontSize(10);
            doc.text(`Summary: ${employees.length} employees | ${formatWorkDays(totalWorkDays)} work days | ${totalHours.toFixed(1)} hours | ${totalOT.toFixed(1)} OT | ${totalLatePenalty.toFixed(0)} THB penalty`, 14, finalY);

            const pdfBuffer = doc.output("arraybuffer");
            const filename = `report_${startDate}_${endDate}.pdf`;

            return new NextResponse(pdfBuffer, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="${filename}"`,
                },
            });
        }

        // Default: Excel format
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const filename = `report_${startDate}_${endDate}.xlsx`;

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting report:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
