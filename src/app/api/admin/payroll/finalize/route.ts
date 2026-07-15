import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";
import { roundMoney } from "@/lib/payroll-calculation";
import { loadPayrollCalculations } from "@/lib/payroll-service";
import { createPayrollDocumentNumbers } from "@/lib/payroll-document-settings";
import { getPayrollDocumentSettings } from "@/lib/server/payroll-document-settings";

class FinalizedPayrollError extends Error {}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { startDate, endDate, stationId, departmentId, userId } = body;
        if (!startDate || !endDate) return NextResponse.json({ error: "Dates required" }, { status: 400 });

        const start = parseDateStringToBangkokMidnight(startDate);
        const end = parseDateStringToBangkokMidnight(endDate);
        const selectedStationId = stationId && stationId !== "all" ? stationId : undefined;
        const selectedDepartmentId = departmentId && departmentId !== "all" ? departmentId : undefined;
        const isPartial = !!userId || !!selectedStationId || !!selectedDepartmentId;
        const periodName = `Payroll ${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`;
        const documentSettings = await getPayrollDocumentSettings();

        const result = await prisma.$transaction(async (tx) => {
            const existingPeriod = await tx.payrollPeriod.findUnique({
                where: { startDate_endDate: { startDate: start, endDate: end } },
            });
            if (existingPeriod?.status === "FINALIZED") throw new FinalizedPayrollError();

            const period = existingPeriod || await tx.payrollPeriod.create({
                data: { name: periodName, startDate: start, endDate: end, payDate: new Date(), status: "DRAFT" },
            });
            const payroll = await loadPayrollCalculations({
                startDate,
                endDate,
                stationId: selectedStationId,
                departmentId: selectedDepartmentId,
                userId,
            }, tx);
            const payable = payroll.employees.filter(({ calculation }) => calculation.hasPayrollActivity);
            const payableIds = new Set(payable.map(({ employee }) => employee.id));
            const staleIds = isPartial
                ? payroll.employees
                    .map(({ employee }) => employee.id)
                    .filter((employeeId) => !payableIds.has(employeeId))
                : (await tx.payrollRecord.findMany({
                    where: { periodId: period.id },
                    select: { userId: true },
                }))
                    .map((record) => record.userId)
                    .filter((employeeId) => !payableIds.has(employeeId));
            if (staleIds.length > 0) {
                await tx.payrollRecord.deleteMany({
                    where: { periodId: period.id, userId: { in: staleIds } },
                });
            }
            const existingRecords = await tx.payrollRecord.findMany({
                where: { periodId: period.id, userId: { in: payable.map(({ employee }) => employee.id) } },
                select: { userId: true },
            });
            const existingUserIds = new Set(existingRecords.map((record) => record.userId));
            const records = [];

            for (const { employee, calculation } of payable) {
                const overtimeHours = roundMoney(calculation.dailyRecords.reduce(
                    (total, day) => total + day.overtimeHours,
                    0,
                ));
                const documentNumbers = createPayrollDocumentNumbers({
                    periodEndDate: end,
                    employeeCode: employee.employeeId,
                    payslipPrefix: documentSettings.payslipPrefix,
                    receiptPrefix: documentSettings.receiptPrefix,
                });
                const data = {
                    workDays: calculation.workDays,
                    totalHours: calculation.totalHours,
                    overtimeHours,
                    dailyRate: Math.max(0, Number(employee.dailyRate) || 0),
                    basePay: calculation.regularPay,
                    overtimePay: calculation.overtimePay,
                    latePenalty: calculation.latePenalty,
                    advanceDeduct: calculation.advanceDeduction,
                    otherDeduct: calculation.otherExpenses,
                    socialSecurity: calculation.socialSecurity,
                    adjustment: calculation.adjustment,
                    specialIncome: calculation.specialIncome,
                    netPay: calculation.totalPay,
                    employeeName: employee.name,
                    employeeCode: employee.employeeId,
                    stationName: employee.station?.name || null,
                    departmentName: employee.department?.name || null,
                    bankName: employee.bankName,
                    bankAccountNumber: employee.bankAccountNumber,
                    ...documentNumbers,
                };
                const record = await tx.payrollRecord.upsert({
                    where: { periodId_userId: { periodId: period.id, userId: employee.id } },
                    update: data,
                    create: { periodId: period.id, userId: employee.id, ...data },
                });
                records.push(record);
            }

            const newRecords = records.filter((record) => !existingUserIds.has(record.userId));
            if (newRecords.length > 0) {
                await tx.notification.createMany({
                    data: newRecords.map((record) => ({
                        userId: record.userId,
                        type: "PAYROLL_ISSUED",
                        title: "สลิปเงินเดือนพร้อมแล้ว",
                        message: `สลิปเงินเดือนงวด ${periodName} พร้อมให้ดาวน์โหลดแล้ว`,
                        link: "/profile/documents",
                        isRead: false,
                    })),
                });
            }

            const updatedPeriod = await tx.payrollPeriod.update({
                where: { id: period.id },
                data: { status: isPartial ? "PROCESSING" : "FINALIZED", payDate: new Date() },
            });
            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: isPartial ? "SAVE_PARTIAL_PAYROLL" : "FINALIZE_PAYROLL",
                    entity: "PayrollPeriod",
                    entityId: period.id,
                    details: JSON.stringify({
                        startDate,
                        endDate,
                        stationId: selectedStationId,
                        departmentId: selectedDepartmentId,
                        employeeId: userId,
                        recordCount: records.length,
                    }),
                },
            });
            return { count: records.length, periodId: period.id, status: updatedPeriod.status };
        }, { timeout: 20_000 });

        return NextResponse.json({ success: true, ...result });
    } catch (error) {
        if (error instanceof FinalizedPayrollError) {
            return NextResponse.json({ error: "งวดนี้ปิดเรียบร้อยแล้วและไม่สามารถคำนวณทับได้" }, { status: 409 });
        }
        console.error("Finalize Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
