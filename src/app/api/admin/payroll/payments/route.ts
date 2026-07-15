import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeBankAccountNumber } from "@/lib/payroll-document-settings";

const PAYMENT_STATUSES = new Set(["PENDING", "PAID", "FAILED"]);
const PAYMENT_METHODS = new Set(["BANK_TRANSFER", "CASH", "CHEQUE", "OTHER"]);

function canManagePayroll(role?: string) {
    return role === "ADMIN" || role === "HR";
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !canManagePayroll(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const periods = await prisma.payrollPeriod.findMany({
            where: { status: { in: ["PROCESSING", "FINALIZED"] } },
            orderBy: { endDate: "desc" },
            take: 18,
            include: { _count: { select: { records: true } } },
        });
        const requestedPeriodId = request.nextUrl.searchParams.get("periodId");
        const periodId = requestedPeriodId || periods[0]?.id;
        const records = periodId
            ? await prisma.payrollRecord.findMany({
                where: { periodId },
                orderBy: [{ paymentStatus: "desc" }, { employeeCode: "asc" }],
                include: {
                    user: {
                        select: {
                            name: true,
                            employeeId: true,
                            bankName: true,
                            bankAccountNumber: true,
                            station: { select: { name: true } },
                            department: { select: { name: true } },
                        },
                    },
                },
            })
            : [];

        return NextResponse.json({
            periods,
            selectedPeriodId: periodId ?? null,
            records: records.map((record) => ({
                ...record,
                employeeName: record.employeeName || record.user.name,
                employeeCode: record.employeeCode || record.user.employeeId,
                stationName: record.stationName || record.user.station?.name || "-",
                departmentName: record.departmentName || record.user.department?.name || "-",
                bankName: record.bankName ?? record.user.bankName,
                bankAccountNumber: normalizeBankAccountNumber(
                    record.bankAccountNumber ?? record.user.bankAccountNumber,
                ),
            })),
        });
    } catch (error) {
        console.error("Load payroll payments error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !canManagePayroll(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const rawRecordIds: unknown[] = Array.isArray(body.recordIds) ? body.recordIds : [];
        const validRecordIds = rawRecordIds.flatMap((id) => typeof id === "string" ? [id] : []);
        const recordIds: string[] = Array.from(new Set<string>(validRecordIds)).slice(0, 500);
        const paymentStatus = String(body.paymentStatus ?? "").toUpperCase();
        const paymentMethod = String(body.paymentMethod ?? "BANK_TRANSFER").toUpperCase();
        const paymentReference = String(body.paymentReference ?? "").trim().slice(0, 120) || null;
        const paymentNote = String(body.paymentNote ?? "").trim().slice(0, 500) || null;

        if (recordIds.length === 0) {
            return NextResponse.json({ error: "กรุณาเลือกรายการเงินเดือน" }, { status: 400 });
        }
        if (!PAYMENT_STATUSES.has(paymentStatus) || !PAYMENT_METHODS.has(paymentMethod)) {
            return NextResponse.json({ error: "ข้อมูลการจ่ายเงินไม่ถูกต้อง" }, { status: 400 });
        }

        let paidAt: Date | null = null;
        if (paymentStatus === "PAID") {
            paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
            if (Number.isNaN(paidAt.getTime())) {
                return NextResponse.json({ error: "วันที่จ่ายไม่ถูกต้อง" }, { status: 400 });
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const records = await tx.payrollRecord.findMany({
                where: { id: { in: recordIds } },
                select: { id: true, userId: true, paymentStatus: true, period: { select: { name: true } } },
            });
            if (records.length !== recordIds.length) {
                throw new Error("PAYROLL_RECORD_NOT_FOUND");
            }

            const updated = await tx.payrollRecord.updateMany({
                where: { id: { in: recordIds } },
                data: {
                    paymentStatus,
                    paymentMethod,
                    paidAt,
                    paymentReference: paymentStatus === "PAID" ? paymentReference : null,
                    paymentNote,
                },
            });

            const newlyPaid = records.filter((record) => (
                paymentStatus === "PAID" && record.paymentStatus !== "PAID"
            ));
            if (newlyPaid.length > 0) {
                await tx.notification.createMany({
                    data: newlyPaid.map((record) => ({
                        userId: record.userId,
                        type: "PAYROLL_PAID",
                        title: "บันทึกการจ่ายเงินเดือนแล้ว",
                        message: `เงินเดือนงวด ${record.period.name} ถูกบันทึกว่าจ่ายแล้ว`,
                        link: "/profile/documents",
                        isRead: false,
                    })),
                });
            }

            await tx.auditLog.create({
                data: {
                    userId: session.user.id,
                    action: "UPDATE_PAYROLL_PAYMENT",
                    entity: "PayrollRecord",
                    details: JSON.stringify({
                        recordIds,
                        paymentStatus,
                        paymentMethod,
                        paidAt: paidAt?.toISOString() ?? null,
                        paymentReference,
                        paymentNote,
                    }),
                },
            });
            return updated.count;
        });

        return NextResponse.json({ success: true, updatedCount: result });
    } catch (error) {
        if (error instanceof Error && error.message === "PAYROLL_RECORD_NOT_FOUND") {
            return NextResponse.json({ error: "ไม่พบรายการเงินเดือนบางรายการ" }, { status: 404 });
        }
        console.error("Update payroll payment error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
