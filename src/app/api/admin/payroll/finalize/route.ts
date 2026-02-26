import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function toBangkokDateKey(d: Date): string {
    const bkk = new Date(d.getTime() + BANGKOK_OFFSET_MS);
    return bkk.toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { startDate, endDate, stationId, userId } = body;

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "Dates required" }, { status: 400 });
        }

        const start = parseDateStringToBangkokMidnight(startDate);
        const endStr = endDate as string;
        const endParts = endStr.split("-");
        const end = new Date(Date.UTC(
            parseInt(endParts[0]), parseInt(endParts[1]) - 1, parseInt(endParts[2]),
            16, 59, 59, 999
        ));

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
                    payDate: new Date(),
                }
            });
        }

        // 2. Fetch Employees
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const employeeWhere: any = { isActive: true, role: "EMPLOYEE" };
        if (userId) {
            employeeWhere.id = userId;
        } else if (stationId && stationId !== "all") {
            employeeWhere.stationId = stationId;
        }

        const employees = await prisma.user.findMany({
            where: employeeWhere,
            select: {
                id: true,
                name: true,
                dailyRate: true,
                hourlyRate: true,
                otRateMultiplier: true,
                otherExpenses: true,
                isSocialSecurityRegistered: true,
            }
        });

        const employeeIds = employees.map(e => e.id);

        // 3. Fetch Attendance
        const attendance = await prisma.attendance.findMany({
            where: {
                userId: { in: employeeIds },
                date: { gte: start, lte: end }
            }
        });

        // 4. Fetch Overrides
        const overrides = await prisma.dailyPayrollOverride.findMany({
            where: {
                userId: { in: employeeIds },
                date: { gte: start, lte: end },
            },
        });
        const overrideMap = new Map<string, typeof overrides[0]>();
        for (const o of overrides) {
            overrideMap.set(`${o.userId}:${toBangkokDateKey(o.date)}`, o);
        }

        // 5. Fetch Advances
        const advanceMonth = parseInt(endDate.split("-")[1]);
        const advanceYear = parseInt(endDate.split("-")[0]);
        const advances = await prisma.advance.findMany({
            where: {
                userId: { in: employeeIds },
                status: { in: ["APPROVED", "PAID"] },
                month: advanceMonth,
                year: advanceYear,
            },
        });
        const advancesByUser: Record<string, number> = {};
        for (const adv of advances) {
            if (!advancesByUser[adv.userId]) advancesByUser[adv.userId] = 0;
            advancesByUser[adv.userId] += Number(adv.amount);
        }

        // 6. Get SSO config
        const ssoRateConfig = await prisma.systemConfig.findUnique({ where: { key: "socialSecurityRate" } });
        const ssoMaxConfig = await prisma.systemConfig.findUnique({ where: { key: "socialSecurityMaxBase" } });
        const ssoRate = ssoRateConfig ? parseFloat(ssoRateConfig.value) / 100 : 0.05;
        const ssoMax = ssoMaxConfig ? parseFloat(ssoMaxConfig.value) * ssoRate : 750;

        // 7. Calculate and Upsert Records
        const records = [];
        for (const emp of employees) {
            const empAtt = attendance.filter(a => a.userId === emp.id);
            const dailyRate = Number(emp.dailyRate) || 0;

            const seenDates = new Set<string>();
            let workDays = 0;
            let totalHours = 0;
            let latePenalty = 0;
            let totalOTAmount = 0;
            let totalAdjustment = 0;

            for (const record of empAtt) {
                if (!record.checkInTime) continue;
                const dateKey = toBangkokDateKey(record.date);
                if (seenDates.has(dateKey)) continue;
                seenDates.add(dateKey);

                const override = overrideMap.get(`${emp.id}:${dateKey}`);

                workDays++;
                totalHours += record.actualHours ? Number(record.actualHours) : 0;

                if (override?.overrideLatePenalty != null) {
                    latePenalty += Number(override.overrideLatePenalty);
                } else if (record.latePenaltyAmount) {
                    latePenalty += Number(record.latePenaltyAmount);
                }

                if (override?.overrideOT != null) {
                    totalOTAmount += Number(override.overrideOT);
                }

                if (override?.adjustment) {
                    totalAdjustment += Number(override.adjustment);
                }
            }

            const regularPay = workDays * dailyRate;
            const overtimePay = totalOTAmount;
            const advanceDeduction = advancesByUser[emp.id] || 0;
            const otherExpenses = Number(emp.otherExpenses) || 0;
            const grossPay = regularPay + overtimePay - latePenalty;
            const socialSecurity = emp.isSocialSecurityRegistered
                ? Math.min(grossPay * ssoRate, ssoMax)
                : 0;
            const totalDeductions = latePenalty + advanceDeduction + otherExpenses + socialSecurity;
            const netPay = regularPay + overtimePay - totalDeductions + totalAdjustment;

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
                        advanceDeduct: advanceDeduction,
                        otherDeduct: otherExpenses,
                        socialSecurity,
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
                        advanceDeduct: advanceDeduction,
                        otherDeduct: otherExpenses,
                        socialSecurity,
                        netPay
                    }
                });
                records.push(record);
            }
        }

        if (records.length > 0) {
            const notifications = records.map(record => ({
                userId: record.userId,
                type: "PAYROLL_ISSUED",
                title: "สลิปเงินเดือนเบิกจ่ายแล้ว",
                message: `สลิปเงินเดือนงวด ${periodName} พร้อมให้ดาวน์โหลดแล้ว`,
                link: "/profile/documents",
                isRead: false
            }));

            await prisma.notification.createMany({ data: notifications });
        }

        return NextResponse.json({ success: true, count: records.length, periodId: period.id });

    } catch (error) {
        console.error("Finalize Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
