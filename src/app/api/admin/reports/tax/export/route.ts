import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

        if (!startDate || !endDate) return NextResponse.json({ error: "Dates required" }, { status: 400 });

        // Reuse simplified fetch logic
        const employees = await prisma.user.findMany({
            where: {
                isActive: true,
                role: "EMPLOYEE",
                ...(stationId && stationId !== "all" ? { stationId } : {})
            },
            select: { id: true, name: true, employeeId: true, hourlyRate: true, dailyRate: true, otRateMultiplier: true }
        });

        const attendance = await prisma.attendance.findMany({
            where: {
                userId: { in: employees.map(e => e.id) },
                date: { gte: new Date(startDate), lte: new Date(endDate) }
            }
        });

        const rows = employees.map(emp => {
            const empAtt = attendance.filter(a => a.userId === emp.id);
            const normalHours = 10.5;
            const hourlyRate = Number(emp.hourlyRate) || (Number(emp.dailyRate) / normalHours);
            const otMult = Number(emp.otRateMultiplier) || 1.5;

            let regularPay = 0;
            let overtimePay = 0;
            let latePenalty = 0;

            empAtt.forEach(att => {
                if (!att.checkInTime) return;
                let actual = att.actualHours ? Number(att.actualHours) : 0;
                let regH = actual > normalHours ? normalHours : actual;
                let otH = actual > normalHours ? actual - normalHours : 0;
                regularPay += regH * hourlyRate;
                overtimePay += otH * hourlyRate * otMult;
                if (att.latePenaltyAmount) latePenalty += Number(att.latePenaltyAmount);
            });

            const grossIncome = regularPay + overtimePay;
            let sso = grossIncome * 0.05;
            if (sso > 750) sso = 750;
            if (sso < 0) sso = 0;

            let tax = 0;
            if (grossIncome > 26000) {
                tax = (grossIncome - sso) * 0.03;
            }

            return [
                emp.employeeId,
                emp.name,
                grossIncome.toFixed(2),
                Math.round(sso).toFixed(2),
                Math.round(tax).toFixed(2),
                (grossIncome - sso - tax - latePenalty).toFixed(2)
            ];
        });

        const header = ["ID", "Name", "Total Income", "SSO (5%)", "Tax (3%)", "Net Estimated"];
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
        XLSX.utils.book_append_sheet(wb, ws, "Tax Report");

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="tax_report.xlsx"`,
            },
        });

    } catch (e) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
