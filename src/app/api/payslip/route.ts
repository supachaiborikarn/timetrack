import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    createPayrollDocumentNumbers,
    normalizeBankAccountNumber,
    type PayrollDocumentSettings,
} from "@/lib/payroll-document-settings";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";

function withSnapshot(
    record: Awaited<ReturnType<typeof getPayslipRecord>>,
    documentSettings: PayrollDocumentSettings,
) {
    if (!record) return null;
    const employeeCode = record.employeeCode || record.user.employeeId;
    const fallbackNumbers = createPayrollDocumentNumbers({
        periodEndDate: record.period.endDate,
        employeeCode,
        payslipPrefix: documentSettings.payslipPrefix,
        receiptPrefix: documentSettings.receiptPrefix,
    });
    return {
        ...record,
        documentNumber: record.documentNumber || fallbackNumbers.documentNumber,
        receiptNumber: record.receiptNumber || fallbackNumbers.receiptNumber,
        user: {
            name: record.employeeName || record.user.name,
            employeeId: employeeCode,
            station: { name: record.stationName || record.user.station?.name || "-" },
            department: { name: record.departmentName || record.user.department?.name || "-" },
            bankName: record.bankName ?? record.user.bankName,
            bankAccountNumber: normalizeBankAccountNumber(
                record.bankAccountNumber ?? record.user.bankAccountNumber,
            ),
        },
    };
}

function getPayslipRecord(userId: string, periodId: string) {
    return prisma.payrollRecord.findFirst({
        where: { userId, periodId },
        include: {
            period: true,
            user: {
                select: {
                    name: true,
                    employeeId: true,
                    station: { select: { name: true } },
                    department: { select: { name: true } },
                    bankAccountNumber: true,
                    bankName: true,
                },
            },
        },
    });
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || session.user.id;
        const periodId = searchParams.get("periodId");
        if (userId !== session.user.id && !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const documentSettings = await getPayrollDocumentSettings();

        if (periodId) {
            const payslip = withSnapshot(
                await getPayslipRecord(userId, periodId),
                documentSettings,
            );
            return payslip
                ? NextResponse.json({ payslip, companyInfo: documentSettings })
                : NextResponse.json({ error: "Payslip not found" }, { status: 404 });
        }

        const records = await prisma.payrollRecord.findMany({
            where: { userId },
            include: {
                period: true,
                user: {
                    select: {
                        name: true,
                        employeeId: true,
                        station: { select: { name: true } },
                        department: { select: { name: true } },
                        bankName: true,
                        bankAccountNumber: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 12,
        });
        return NextResponse.json({
            payslips: records.map((record) => withSnapshot(record, documentSettings)),
            companyInfo: documentSettings,
        });
    } catch (error) {
        console.error("Get payslip error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
