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
        if (!startDate || !endDate) {
            return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
        }

        const payroll = await loadPayrollCalculations({
            startDate,
            endDate,
            stationId: searchParams.get("stationId"),
            departmentId: searchParams.get("departmentId"),
        });
        const rows = payroll.employees
            .filter(({ calculation }) => calculation.hasPayrollActivity)
            .map(({ employee, calculation }) => ({
                "รหัสพนักงาน": employee.employeeId,
                "ชื่อ-นามสกุล": employee.name,
                "สถานี": employee.station?.name || "-",
                "แผนก": employee.department?.name || "-",
                "ค่าแรง/วัน": Math.max(0, Number(employee.dailyRate) || 0),
                "วันทำงาน": calculation.workDays,
                "ชั่วโมงรวม": calculation.totalHours,
                "ค่าแรง": calculation.regularPay,
                "OT": calculation.overtimePay,
                "โบนัส/ปรับเงิน": calculation.adjustment,
                "รายได้พิเศษอนุมัติ": calculation.specialIncome,
                "หักมาสาย": calculation.latePenalty,
                "หักกลับก่อนเกณฑ์": calculation.earlyLeavePenalty,
                "หักเบิกล่วงหน้า": calculation.advanceDeduction,
                "หักอื่นงวดนี้": calculation.otherExpenses,
                "ประกันสังคม": calculation.socialSecurity,
                "รวมหัก": calculation.totalDeductions,
                "สุทธิ": calculation.totalPay,
            }));
        const worksheet = XLSX.utils.json_to_sheet(rows);
        worksheet["!cols"] = [
            { wch: 14 }, { wch: 28 }, { wch: 24 }, { wch: 20 },
            ...Array.from({ length: 14 }, () => ({ wch: 18 })),
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="payroll_${startDate}_${endDate}.xlsx"`,
            },
        });
    } catch (error) {
        console.error("Payroll export error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
