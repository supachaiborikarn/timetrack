import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId") || session.user.id;
        const periodId = searchParams.get("periodId");

        // Only admins can view other users' payslips
        if (userId !== session.user.id && !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get list of payslips
        if (!periodId) {
            const payslips = await prisma.payrollRecord.findMany({
                where: { userId },
                select: {
                    id: true,
                    periodId: true,
                    workDays: true,
                    totalHours: true,
                    overtimeHours: true,
                    basePay: true,
                    overtimePay: true,
                    latePenalty: true,
                    advanceDeduct: true,
                    otherDeduct: true,
                    socialSecurity: true,
                    netPay: true,
                    createdAt: true,
                    period: {
                        select: {
                            name: true,
                            startDate: true,
                            endDate: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            employeeId: true,
                            bankName: true,
                            bankAccountNumber: true,
                            department: { select: { name: true } }
                        }
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 12,
            });

            return NextResponse.json({ payslips });
        }

        // Get specific payslip
        const payslip = await prisma.payrollRecord.findFirst({
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

        if (!payslip) {
            return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
        }

        return NextResponse.json({ payslip });
    } catch (error) {
        console.error("Get payslip error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
