import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { auth } from "@/lib/auth";
import { loadPayrollCalculations } from "@/lib/payroll-service";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        if (!startDate || !endDate) return NextResponse.json({ error: "Dates required" }, { status: 400 });

        const payroll = await loadPayrollCalculations({
            startDate,
            endDate,
            stationId: searchParams.get("stationId"),
            departmentId: searchParams.get("departmentId"),
        });
        const rows = payroll.employees
            .filter(({ calculation }) => calculation.hasPayrollActivity)
            .map(({ employee, calculation }) => ({
                ID: employee.employeeId,
                Name: employee.name,
                "Total Income": calculation.totalEarnings,
                "SSO (5%)": calculation.socialSecurity,
                "Tax Withheld": 0,
                "Payroll Net": calculation.totalPay,
            }));
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Income and SSO");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="income_sso_report_${startDate}_${endDate}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Income and SSO export error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
