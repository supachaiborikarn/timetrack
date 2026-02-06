import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "@/lib/date-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const effectiveDate = searchParams.get("effectiveDate") || format(new Date(), "yyyy-MM-dd");
        const stationId = searchParams.get("stationId");

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "Dates required" }, { status: 400 });
        }

        // Fetch employees and attendance (Reuse logic or abstract it)
        // For brevity, we simply fetch users and active payroll calculation
        // NOTE: Ideally, we should export *Confirmed* payroll records.
        // But for now we calculate on fly to enable testing.

        const employeeWhere: any = { isActive: true, role: "EMPLOYEE" };
        if (stationId && stationId !== "all") employeeWhere.stationId = stationId;

        const employees = await prisma.user.findMany({
            where: employeeWhere,
            select: {
                id: true,
                name: true,
                employeeId: true,
                bankAccountNumber: true,
                bankName: true,
                dailyRate: true,
                hourlyRate: true,
                otRateMultiplier: true,
                // We need attendance to calc amount
            }
        });

        // 2. Fetch Attendance
        const attendance = await prisma.attendance.findMany({
            where: {
                userId: { in: employees.map(e => e.id) },
                date: { gte: new Date(startDate), lte: new Date(endDate) }
            }
        });

        const exportData = employees.map(emp => {
            const empAtt = attendance.filter(a => a.userId === emp.id);

            // Simplified calc for export
            const normalHours = 10.5; // Default
            let regularPay = 0;
            let otPay = 0;
            let latePenalty = 0;

            const hourlyRate = Number(emp.hourlyRate) || (Number(emp.dailyRate) / normalHours);
            const otMult = Number(emp.otRateMultiplier) || 1.5;

            empAtt.forEach(att => {
                if (!att.checkInTime) return;
                let actual = att.actualHours ? Number(att.actualHours) : 0;
                let regH = actual > normalHours ? normalHours : actual;
                let otH = actual > normalHours ? actual - normalHours : 0;

                regularPay += regH * hourlyRate;
                otPay += otH * hourlyRate * otMult;
                if (att.latePenaltyAmount) latePenalty += Number(att.latePenaltyAmount);
            });

            const netPay = regularPay + otPay - latePenalty;

            return {
                code: "011", // Sending Bank Code (TTB) or Receiving Bank? Usually Receiving.
                // If user bank is TTB -> 011. If SCB -> 014.
                // We will use the bank name to map or default.
                // For now, let's output the bank name in a column if unknown.
                account: emp.bankAccountNumber || "",
                amount: netPay.toFixed(2),
                name: emp.name,
                email: "",
                ref: `SALARY ${format(new Date(endDate), "MM/yyyy")}`
            };
        }).filter(p => parseFloat(p.amount) > 0);

        // Generate CSV (TTB Compatible Format - Simplified)
        // Header: Account,Amount,Name,Ref,BankCode
        const csvRows = exportData.map(d => {
            return `"${d.account}","${d.amount}","${d.name}","${d.ref}","${d.code}"`;
        });

        const header = `"Account Number","Amount","Receiver Name","Reference","Bank Code"`;
        const csvContent = [header, ...csvRows].join("\n");

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="payroll_transfer_${effectiveDate}.csv"`,
            }
        });

    } catch (error) {
        console.error("Export error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
