import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";
import * as XLSX from "xlsx";

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

        // Get SSO config
        const ssoRateConfig = await prisma.systemConfig.findUnique({ where: { key: "social_security_rate" } });
        const ssoMaxConfig = await prisma.systemConfig.findUnique({ where: { key: "social_security_max" } });
        const ssoRate = ssoRateConfig ? parseFloat(ssoRateConfig.value) : 0.05;
        const ssoMax = ssoMaxConfig ? parseFloat(ssoMaxConfig.value) : 750;

        const start = parseDateStringToBangkokMidnight(startDate);
        const endMidnight = parseDateStringToBangkokMidnight(endDate);
        const end = new Date(endMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);
        // Use endDate month for advance matching (26 Jan - 25 Feb = February salary)
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

        // Get attendance in range
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

        // Get all daily payroll overrides
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

        // Get approved/paid advances
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

        // Calculate payroll per employee
        const payrollData = employees.map((emp) => {
            const empAttendance = attendanceRecords.filter((a) => a.userId === emp.id);

            const dailyRate = Number(emp.dailyRate) || 0;

            // Deduplicate attendance by Bangkok date key
            const seenDates = new Set<string>();
            let workDays = 0;
            let totalHours = 0;
            let latePenalty = 0;
            let totalOTAmount = 0;
            let totalAdjustment = 0;

            for (const record of empAttendance) {
                if (record.checkInTime) {
                    const dateKey = toBangkokDateKey(record.date);
                    if (seenDates.has(dateKey)) continue;
                    seenDates.add(dateKey);

                    const override = overrideMap.get(`${emp.id}:${dateKey}`);

                    workDays++;
                    const actualHours = record.actualHours ? Number(record.actualHours) : 0;
                    totalHours += actualHours;

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
            const totalPay = regularPay + overtimePay - totalDeductions + totalAdjustment;

            return {
                employeeId: emp.employeeId,
                name: emp.name,
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
                totalPay,
            };
        }).filter((p) => p.workDays > 0);

        // Build Excel
        const headers = [
            "รหัสพนักงาน",
            "ชื่อ-นามสกุล",
            "สถานี",
            "แผนก",
            "ค่าแรง/วัน",
            "วันทำงาน",
            "ชม.รวม",
            "ค่าแรง",
            "รายได้พิเศษ",
            "หักสาย",
            "หักเบิกล่วงหน้า",
            "ค่าใช้จ่ายอื่นๆ",
            "หักประกันสังคม",
            "รวมหัก",
            "รวมสุทธิ",
        ];

        const rows = payrollData.map((p) => [
            p.employeeId,
            p.name,
            p.station,
            p.department,
            p.dailyRate.toFixed(2),
            p.workDays,
            p.totalHours.toFixed(1),
            p.regularPay.toFixed(2),
            p.overtimePay.toFixed(2),
            p.latePenalty.toFixed(2),
            p.advanceDeduction.toFixed(2),
            p.otherExpenses.toFixed(2),
            p.socialSecurity.toFixed(2),
            p.totalDeductions.toFixed(2),
            p.totalPay.toFixed(2),
        ]);

        // Summary
        const totalRegularPay = payrollData.reduce((sum, p) => sum + p.regularPay, 0);
        const totalOTPay = payrollData.reduce((sum, p) => sum + p.overtimePay, 0);
        const totalLatePenalty = payrollData.reduce((sum, p) => sum + p.latePenalty, 0);
        const totalAdvance = payrollData.reduce((sum, p) => sum + p.advanceDeduction, 0);
        const totalOtherExp = payrollData.reduce((sum, p) => sum + p.otherExpenses, 0);
        const totalSSO = payrollData.reduce((sum, p) => sum + p.socialSecurity, 0);
        const totalDeductions = payrollData.reduce((sum, p) => sum + p.totalDeductions, 0);
        const grandTotal = payrollData.reduce((sum, p) => sum + p.totalPay, 0);

        rows.push([]);
        rows.push(["สรุปรวม"]);
        rows.push(["จำนวนพนักงาน", payrollData.length.toString()]);
        rows.push(["ค่าแรงรวม", "", "", "", "", "", "", totalRegularPay.toFixed(2)]);
        rows.push(["รายได้พิเศษรวม", "", "", "", "", "", "", "", totalOTPay.toFixed(2)]);
        rows.push(["หักสายรวม", "", "", "", "", "", "", "", "", totalLatePenalty.toFixed(2)]);
        rows.push(["หักเบิกล่วงหน้ารวม", "", "", "", "", "", "", "", "", "", totalAdvance.toFixed(2)]);
        rows.push(["ค่าใช้จ่ายอื่นๆรวม", "", "", "", "", "", "", "", "", "", "", totalOtherExp.toFixed(2)]);
        rows.push(["หักประกันสังคมรวม", "", "", "", "", "", "", "", "", "", "", "", totalSSO.toFixed(2)]);
        rows.push(["รวมหักทั้งหมด", "", "", "", "", "", "", "", "", "", "", "", "", totalDeductions.toFixed(2)]);
        rows.push(["รวมสุทธิทั้งหมด", "", "", "", "", "", "", "", "", "", "", "", "", "", grandTotal.toFixed(2)]);
        rows.push([]);
        rows.push([`ประกันสังคม: ${(ssoRate * 100).toFixed(0)}% สูงสุด ${ssoMax.toLocaleString()} บาท/เดือน`]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

        ws["!cols"] = [
            { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 12 },
            { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 12 },
            { wch: 12 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
            { wch: 14 }, { wch: 10 }, { wch: 12 },
        ];

        const sheetName = `เงินเดือน ${startDate} ถึง ${endDate}`;
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
        const filename = `payroll_${startDate}_${endDate}.xlsx`;

        return new NextResponse(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Error exporting payroll:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
