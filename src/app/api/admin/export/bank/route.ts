import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { loadPayrollCalculations } from "@/lib/payroll-service";

const BANK_CODES: Record<string, string> = {
    "กรุงเทพ": "002",
    "ธนาคารกรุงเทพ": "002",
    "กสิกรไทย": "004",
    "ธนาคารกสิกรไทย": "004",
    "กรุงไทย": "006",
    "ธนาคารกรุงไทย": "006",
    "ทหารไทยธนชาต": "011",
    "ธนาคารทหารไทยธนชาต": "011",
    "ttb": "011",
    "ไทยพาณิชย์": "014",
    "ธนาคารไทยพาณิชย์": "014",
    "cimb": "022",
    "ยูโอบี": "024",
    "uob": "024",
    "กรุงศรีอยุธยา": "025",
    "ธนาคารกรุงศรีอยุธยา": "025",
    "ออมสิน": "030",
    "ธนาคารออมสิน": "030",
    "ธ.ก.ส.": "034",
    "เกียรตินาคินภัทร": "069",
};

function csv(value: unknown): string {
    let text = String(value ?? "");
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function bankCode(bankName: string | null): string {
    if (!bankName) return "";
    const normalized = bankName.trim().toLowerCase();
    return BANK_CODES[normalized] || "";
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
        const effectiveDate = searchParams.get("effectiveDate") || endDate;
        if (!startDate || !endDate) return NextResponse.json({ error: "Dates required" }, { status: 400 });

        const payroll = await loadPayrollCalculations({
            startDate,
            endDate,
            stationId: searchParams.get("stationId"),
            departmentId: searchParams.get("departmentId"),
        });
        const reference = `SALARY ${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`;
        const rows = payroll.employees
            .filter(({ calculation }) => calculation.hasPayrollActivity && calculation.totalPay > 0)
            .map(({ employee, calculation }) => [
                employee.bankAccountNumber || "",
                calculation.totalPay.toFixed(2),
                employee.name,
                reference,
                bankCode(employee.bankName),
                employee.bankName || "",
            ].map(csv).join(","));
        const header = ["Account Number", "Amount", "Receiver Name", "Reference", "Bank Code", "Bank Name"].map(csv).join(",");

        return new NextResponse(`\uFEFF${[header, ...rows].join("\n")}`, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="payroll_transfer_${effectiveDate}.csv"`,
            },
        });
    } catch (error) {
        console.error("Bank export error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
