import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { startDate, endDate, stationId } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "Dates required" }, { status: 400 });
        }

        // Logic here is similar to Payroll Calculation but creates PayrollRecords
        // 1. Create or Find PayrollPeriod
        const periodName = `Payroll ${format(new Date(endDate), "MM/yyyy")}`;
        let period = await prisma.payrollPeriod.findFirst({
            where: {
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            }
        });

        if (!period) {
            period = await prisma.payrollPeriod.create({
                data: {
                    name: periodName,
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    payDate: new Date(), // Default to today/now
                }
            });
        }

        // 2. Fetch Employees
        const employeeWhere: any = { isActive: true, role: "EMPLOYEE" };
        if (stationId && stationId !== "all") employeeWhere.stationId = stationId;

        const employees = await prisma.user.findMany({
            where: employeeWhere,
            select: { id: true, dailyRate: true, hourlyRate: true, otRateMultiplier: true }
        });

        // 3. Fetch Attendance
        const attendance = await prisma.attendance.findMany({
            where: {
                userId: { in: employees.map(e => e.id) },
                date: { gte: new Date(startDate), lte: new Date(endDate) }
            }
        });

        // 4. Calculate and Upsert Records
        const records = [];
        for (const emp of employees) {
            const empAtt = attendance.filter(a => a.userId === emp.id);
            const normalHours = 10.5;
            const hourlyRate = Number(emp.hourlyRate) || (Number(emp.dailyRate) / normalHours);

            let workDays = 0;
            let totalHours = 0;
            let regularPay = 0;
            const overtimePay = 0; // OT added manually by HR
            let latePenalty = 0;

            empAtt.forEach(att => {
                if (!att.checkInTime) return;
                workDays++;
                const actual = att.actualHours ? Number(att.actualHours) : 0;
                totalHours += actual;

                // All hours count as regular — OT is manually added by HR
                regularPay += actual * hourlyRate;

                if (att.latePenaltyAmount) latePenalty += Number(att.latePenaltyAmount);
            });

            const netPay = regularPay + overtimePay - latePenalty;

            // Only save if there's activity or pay
            if (workDays > 0 || netPay > 0) {
                const record = await prisma.payrollRecord.upsert({
                    where: {
                        periodId_userId: {
                            periodId: period.id,
                            userId: emp.id
                        }
                    },
                    update: {
                        workDays,
                        totalHours,
                        overtimeHours: 0,
                        basePay: regularPay,
                        overtimePay,
                        latePenalty,
                        netPay,
                        updatedAt: new Date()
                    },
                    create: {
                        periodId: period.id,
                        userId: emp.id,
                        workDays,
                        totalHours,
                        overtimeHours: 0,
                        basePay: regularPay,
                        overtimePay,
                        latePenalty,
                        netPay
                    }
                });
                records.push(record);
            }
        }

        if (records.length > 0) {
            // Send Notifications
            const notifications = records.map(record => ({
                userId: record.userId,
                type: "PAYROLL_ISSUED",
                title: "สลิปเงินเดือนเบิกจ่ายแล้ว",
                message: `สลิปเงินเดือนงวด ${periodName} พร้อมให้ดาวน์โหลดแล้ว`,
                link: "/profile/documents",
                isRead: false
            }));

            await prisma.notification.createMany({
                data: notifications
            });
        }

        return NextResponse.json({ success: true, count: records.length, periodId: period.id });

    } catch (error) {
        console.error("Finalize Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
