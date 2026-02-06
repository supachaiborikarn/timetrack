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
        const stationId = searchParams.get("stationId");

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "Dates required" }, { status: 400 });
        }

        // Fetch payroll calculation (Reuse logic)
        const employeeWhere: any = { isActive: true, role: "EMPLOYEE" };
        if (stationId && stationId !== "all") employeeWhere.stationId = stationId;

        // Fetch users
        const employees = await prisma.user.findMany({
            where: employeeWhere,
            select: {
                id: true,
                dailyRate: true,
                hourlyRate: true,
                otRateMultiplier: true,
                department: { select: { name: true } }
            }
        });

        // Fetch Attendance
        const attendance = await prisma.attendance.findMany({
            where: {
                userId: { in: employees.map(e => e.id) },
                date: { gte: new Date(startDate), lte: new Date(endDate) }
            }
        });

        // Configurable Account Codes (Defaults)
        const ACCOUNTS = {
            SALARY_EXPENSE: "51000",
            OT_EXPENSE: "51001",
            SSO_LIABILITY: "21000", // Social Security Payable
            TAX_LIABILITY: "21001", // Withholding Tax Payable
            BANK_ASSET: "11000"     // Cash/Bank
        };

        let totalSalary = 0;
        let totalOT = 0;
        // let totalSSO = 0; // Not calc yet
        // let totalTax = 0; // Not calc yet

        employees.forEach(emp => {
            const empAtt = attendance.filter(a => a.userId === emp.id);
            const normalHours = 10.5;
            const hourlyRate = Number(emp.hourlyRate) || (Number(emp.dailyRate) / normalHours);
            const otMult = Number(emp.otRateMultiplier) || 1.5;

            empAtt.forEach(att => {
                if (!att.checkInTime) return;
                let actual = att.actualHours ? Number(att.actualHours) : 0;
                let regH = actual > normalHours ? normalHours : actual;
                let otH = actual > normalHours ? actual - normalHours : 0;

                totalSalary += regH * hourlyRate;
                totalOT += otH * hourlyRate * otMult;
            });
        });

        const totalPayable = totalSalary + totalOT; // - deductions if any

        // Generate Journal Entries
        // Debit Salary Expense
        // Debit OT Expense
        // Credit Bank (Total)

        const dateStr = format(new Date(endDate), "yyyy-MM-dd");
        const ref = `PAYROLL-${format(new Date(endDate), "MMyy")}`;

        const rows = [
            `"${dateStr}","${ref}","Salary Expense","${ACCOUNTS.SALARY_EXPENSE}","${totalSalary.toFixed(2)}","0"`,
            `"${dateStr}","${ref}","Overtime Expense","${ACCOUNTS.OT_EXPENSE}","${totalOT.toFixed(2)}","0"`,
            `"${dateStr}","${ref}","Net Pay Payable","${ACCOUNTS.BANK_ASSET}","0","${totalPayable.toFixed(2)}"`
        ];

        const header = `"Date","Reference","Description","Account Code","Debit","Credit"`;
        const csvContent = [header, ...rows].join("\n");

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="accounting_entry_${dateStr}.csv"`,
            }
        });

    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
