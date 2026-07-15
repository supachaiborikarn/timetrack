import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roundMoney } from "@/lib/payroll-calculation";
import { loadPayrollCalculations } from "@/lib/payroll-service";

function csv(value: unknown): string {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

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
        const active = payroll.employees.filter(({ calculation }) => calculation.hasPayrollActivity);
        const sum = (selector: (calculation: typeof active[number]["calculation"]) => number) =>
            roundMoney(active.reduce((total, item) => total + selector(item.calculation), 0));
        const salary = sum((calculation) => calculation.regularPay);
        const overtime = sum((calculation) => calculation.overtimePay);
        const otherIncome = sum((calculation) => Math.max(0, calculation.adjustment) + calculation.specialIncome);
        const negativeAdjustments = sum((calculation) => Math.max(0, -calculation.adjustment));
        const sso = sum((calculation) => calculation.socialSecurity);
        const advances = sum((calculation) => calculation.advanceDeduction);
        const otherDeductions = roundMoney(sum((calculation) => calculation.latePenalty + calculation.otherExpenses) + negativeAdjustments);
        const netPay = sum((calculation) => calculation.totalPay);
        const reference = `PAYROLL-${endDate.slice(5, 7)}${endDate.slice(2, 4)}`;

        const entries = [
            [endDate, reference, "Salary Expense", "51000", salary, 0],
            [endDate, reference, "Overtime Expense", "51001", overtime, 0],
            [endDate, reference, "Other Payroll Income", "51002", otherIncome, 0],
            [endDate, reference, "Social Security Payable", "21000", 0, sso],
            [endDate, reference, "Employee Advances", "12000", 0, advances],
            [endDate, reference, "Other Payroll Deductions", "21002", 0, otherDeductions],
            [endDate, reference, "Net Pay Payable", "11000", 0, netPay],
        ].filter((entry) => Number(entry[4]) !== 0 || Number(entry[5]) !== 0);
        const header = ["Date", "Reference", "Description", "Account Code", "Debit", "Credit"].map(csv).join(",");
        const rows = entries.map((entry) => entry.map((value, index) => csv(index >= 4 ? Number(value).toFixed(2) : value)).join(","));

        return new NextResponse(`\uFEFF${[header, ...rows].join("\n")}`, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="accounting_entry_${endDate}.csv"`,
            },
        });
    } catch (error) {
        console.error("Accounting export error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
