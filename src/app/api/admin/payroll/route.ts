import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function toBangkokDateKey(d: Date): string {
    const bkk = new Date(d.getTime() + BANGKOK_OFFSET_MS);
    return bkk.toISOString().split("T")[0];
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
        const stationId = searchParams.get("stationId");
        const departmentId = searchParams.get("departmentId");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        // Get social security config from SystemConfig
        const ssoRateConfig = await prisma.systemConfig.findUnique({ where: { key: "social_security_rate" } });
        const ssoMaxConfig = await prisma.systemConfig.findUnique({ where: { key: "social_security_max" } });
        const ssoRate = ssoRateConfig ? parseFloat(ssoRateConfig.value) : 0.05;
        const ssoMax = ssoMaxConfig ? parseFloat(ssoMaxConfig.value) : 750;

        // Use Bangkok midnight to match how dates are stored in DB
        const start = parseDateStringToBangkokMidnight(startDate);
        const endMidnight = parseDateStringToBangkokMidnight(endDate);
        const end = new Date(endMidnight.getTime() + 24 * 60 * 60 * 1000 - 1); // end of day

        // For advance matching: use endDate month (payroll period 26 Jan - 25 Feb = February salary)
        const advanceMonth = parseInt(endDate.split("-")[1]);
        const advanceYear = parseInt(endDate.split("-")[0]);

        // Get all employees
        const employeeWhere: Record<string, unknown> = {
            isActive: true,
            role: "EMPLOYEE",
        };

        if (stationId) {
            employeeWhere.stationId = stationId;
        }

        if (departmentId) {
            employeeWhere.departmentId = departmentId;
        }

        const employees = await prisma.user.findMany({
            where: employeeWhere,
            include: {
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        // Get attendance in range for all employees
        const employeeIds = employees.map((e) => e.id);
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: { in: employeeIds },
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });

        // Get all daily payroll overrides for the date range
        const overrides = await prisma.dailyPayrollOverride.findMany({
            where: {
                userId: { in: employeeIds },
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });

        // Map overrides by "userId:dateKey"
        const overrideMap = new Map<string, typeof overrides[0]>();
        for (const o of overrides) {
            const dk = toBangkokDateKey(o.date);
            overrideMap.set(`${o.userId}:${dk}`, o);
        }

        // Get approved/paid advances for matching month/year
        const advances = await prisma.advance.findMany({
            where: {
                userId: { in: employeeIds },
                status: { in: ["APPROVED", "PAID"] },
                month: advanceMonth,
                year: advanceYear,
            },
        });

        // Group advances by userId
        const advancesByUser: Record<string, number> = {};
        for (const adv of advances) {
            if (!advancesByUser[adv.userId]) advancesByUser[adv.userId] = 0;
            advancesByUser[adv.userId] += Number(adv.amount);
        }

        // Calculate payroll for each employee
        const payrollData = employees.map((emp) => {
            const empAttendance = attendanceRecords.filter((a) => a.userId === emp.id);

            // Daily rate from employee
            const dailyRate = Number(emp.dailyRate) || 0;

            // Deduplicate attendance by Bangkok date key
            // Some records have duplicate dates stored as both 00:00Z and 17:00Z
            const seenDates = new Set<string>();
            let workDays = 0;
            let totalHours = 0;
            let latePenalty = 0;
            let totalOTAmount = 0;
            let totalAdjustment = 0;

            for (const record of empAttendance) {
                if (record.checkInTime) {
                    const dateKey = toBangkokDateKey(record.date);
                    if (seenDates.has(dateKey)) continue; // skip duplicate
                    seenDates.add(dateKey);

                    const override = overrideMap.get(`${emp.id}:${dateKey}`);

                    const actualHours = record.actualHours ? Number(record.actualHours) : 0;
                    totalHours += actualHours;

                    // Day factor: <5.5h = 0, 5.5-9.99h = 0.5, >=10h = 1.0
                    let dayFactor = 0;
                    if (actualHours >= 10) dayFactor = 1;
                    else if (actualHours >= 5.5) dayFactor = 0.5;

                    workDays += dayFactor;

                    // Late penalty (override or auto)
                    if (override?.overrideLatePenalty != null) {
                        latePenalty += Number(override.overrideLatePenalty);
                    } else if (record.latePenaltyAmount) {
                        latePenalty += Number(record.latePenaltyAmount);
                    }

                    // OT (from override only — HR adds manually)
                    if (override?.overrideOT != null) {
                        totalOTAmount += Number(override.overrideOT);
                    }

                    // Adjustment
                    if (override?.adjustment) {
                        totalAdjustment += Number(override.adjustment);
                    }
                }
            }

            // Calculate pay
            const regularPay = workDays * dailyRate;
            const overtimePay = totalOTAmount;

            // Deductions
            const advanceDeduction = advancesByUser[emp.id] || 0;
            const otherExpenses = Number(emp.otherExpenses) || 0;

            // Social security: rate × actual gross pay, capped at max
            const grossPay = regularPay + overtimePay - latePenalty;
            const socialSecurity = emp.isSocialSecurityRegistered
                ? Math.min(grossPay * ssoRate, ssoMax)
                : 0;

            const totalDeductions = latePenalty + advanceDeduction + otherExpenses + socialSecurity;
            const totalPay = regularPay + overtimePay - totalDeductions + totalAdjustment;

            return {
                id: emp.id,
                name: emp.name,
                nickName: emp.nickName,
                employeeId: emp.employeeId,
                station: emp.station?.name || "-",
                department: emp.department?.name || "-",
                dailyRate,
                workDays,
                totalHours,
                regularPay,
                overtimePay,
                latePenalty,
                advanceDeduction,
                otherExpenses,
                socialSecurity,
                totalDeductions,
                adjustment: totalAdjustment,
                totalPay,
                bankName: emp.bankName,
                bankAccountNumber: emp.bankAccountNumber,
            };
        });

        // Filter out employees with no work days
        const activePayroll = payrollData.filter((p) => p.workDays > 0);

        // Summary
        const summary = {
            totalEmployees: activePayroll.length,
            totalWorkDays: activePayroll.reduce((sum, p) => sum + p.workDays, 0),
            totalHours: activePayroll.reduce((sum, p) => sum + p.totalHours, 0),
            totalRegularPay: activePayroll.reduce((sum, p) => sum + p.regularPay, 0),
            totalOvertimePay: activePayroll.reduce((sum, p) => sum + p.overtimePay, 0),
            totalLatePenalty: activePayroll.reduce((sum, p) => sum + p.latePenalty, 0),
            totalAdvanceDeduction: activePayroll.reduce((sum, p) => sum + p.advanceDeduction, 0),
            totalOtherExpenses: activePayroll.reduce((sum, p) => sum + p.otherExpenses, 0),
            totalSocialSecurity: activePayroll.reduce((sum, p) => sum + p.socialSecurity, 0),
            totalDeductions: activePayroll.reduce((sum, p) => sum + p.totalDeductions, 0),
            grandTotal: activePayroll.reduce((sum, p) => sum + p.totalPay, 0),
            ssoRate,
            ssoMax,
        };

        return NextResponse.json({
            employees: activePayroll.sort((a, b) => a.name.localeCompare(b.name)),
            summary,
        });
    } catch (error) {
        console.error("Error calculating payroll:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
