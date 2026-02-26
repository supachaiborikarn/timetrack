import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

function toBangkokDateKey(d: Date): string {
    const bkk = new Date(d.getTime() + BANGKOK_OFFSET_MS);
    return bkk.toISOString().split("T")[0];
}

function addDaysBKK(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    return dt.toISOString().split("T")[0];
}

interface DailyRecord {
    date: string;
    dayOfWeek: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    actualHours: number | null;
    breakMinutes: number | null;
    lateMinutes: number | null;
    latePenalty: number;
    isLatePenaltyOverridden: boolean;
    dailyWage: number;
    isWageOverridden: boolean;
    otHours: number;
    otAmount: number;
    isOTOverridden: boolean;
    adjustment: number;
    note: string | null;
    total: number;
    absentColleagues: { name: string; nickName: string | null }[];
}

// GET: Fetch employee's daily payroll data for a date range
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return ApiErrors.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const normalHoursPerDay = parseFloat(searchParams.get("normalHoursPerDay") || "10.5");

        if (!userId || !startDate || !endDate) {
            return ApiErrors.validation("userId, startDate, and endDate are required");
        }

        // Get employee info
        const employee = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                employeeId: true,
                dailyRate: true,
                hourlyRate: true,
                otRateMultiplier: true,
                otherExpenses: true,
                isSocialSecurityRegistered: true,
                stationId: true,
                departmentId: true,
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        if (!employee) {
            return ApiErrors.notFound("Employee not found");
        }

        const dailyRate = Number(employee.dailyRate) || 0;
        const hourlyRate = Number(employee.hourlyRate) || (dailyRate / normalHoursPerDay);
        const otMultiplier = Number(employee.otRateMultiplier) || 1.5;

        // Get attendance records - use Bangkok midnight for date range
        const start = parseDateStringToBangkokMidnight(startDate);
        const endMidnight = parseDateStringToBangkokMidnight(endDate);
        const end = new Date(endMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);

        const attendances = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: { date: "asc" },
        });

        // Get overrides
        const overrides = await prisma.dailyPayrollOverride.findMany({
            where: {
                userId,
                date: {
                    gte: start,
                    lte: end,
                },
            },
        });

        // Create maps using Bangkok date key (not UTC)
        const overrideMap = new Map(
            overrides.map(o => [toBangkokDateKey(o.date), o])
        );

        // For attendance, deduplicate by Bangkok date key (keep first)
        const attendanceMap = new Map<string, typeof attendances[0]>();
        for (const a of attendances) {
            const dk = toBangkokDateKey(a.date);
            if (!attendanceMap.has(dk)) {
                attendanceMap.set(dk, a);
            }
        }

        // Fetch station colleagues' attendance for absence overlap
        let colleagueAttendanceMap = new Map<string, Set<string>>();
        let colleagueNameMap = new Map<string, { name: string; nickName: string | null }>();
        if (employee.stationId) {
            const colleagueWhere: Record<string, unknown> = {
                stationId: employee.stationId,
                id: { not: userId },
                isActive: true,
            };
            if (employee.departmentId) {
                colleagueWhere.departmentId = employee.departmentId;
            }
            const colleagues = await prisma.user.findMany({
                where: colleagueWhere,
                select: { id: true, name: true, nickName: true },
            });

            for (const c of colleagues) {
                colleagueNameMap.set(c.id, { name: c.name, nickName: c.nickName });
            }

            // Get all attendance records for colleagues in this period
            const colleagueAttendances = await prisma.attendance.findMany({
                where: {
                    userId: { in: colleagues.map(c => c.id) },
                    date: {
                        gte: start,
                        lte: end,
                    },
                },
                select: { userId: true, date: true },
            });

            // Build a map: dateKey -> Set of userIds who DID check in
            for (const ca of colleagueAttendances) {
                const dk = toBangkokDateKey(ca.date);
                if (!colleagueAttendanceMap.has(dk)) {
                    colleagueAttendanceMap.set(dk, new Set());
                }
                colleagueAttendanceMap.get(dk)!.add(ca.userId);
            }
        }

        const allColleagueIds = Array.from(colleagueNameMap.keys());

        // Build daily records for every day in range using Bangkok calendar
        const dailyRecords: DailyRecord[] = [];
        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

        let currentDateStr = startDate; // "YYYY-MM-DD"
        while (currentDateStr <= endDate) {
            const dateKey = currentDateStr;
            const attendance = attendanceMap.get(dateKey);
            const override = overrideMap.get(dateKey);

            // Get day of week from the date string
            const [y, m, d] = currentDateStr.split("-").map(Number);
            const dayOfWeekDate = new Date(Date.UTC(y, m - 1, d));

            // Calculate actual hours and OT
            const actualHours = attendance?.actualHours ? Number(attendance.actualHours) : null;
            const lateMinutes = attendance?.lateMinutes || null;
            const latePenalty = attendance ? Number(attendance.latePenaltyAmount) || 0 : 0;

            // OT is not auto-calculated — HR adds manually via override
            const otHours = 0;

            // Get wage (override or default)
            const isWageOverridden = override?.overrideDailyWage != null;
            const dailyWage = isWageOverridden
                ? Number(override!.overrideDailyWage)
                : (attendance?.checkInTime ? dailyRate : 0);

            // Get OT amount (override or calculated)
            const isOTOverridden = override?.overrideOT != null;
            const otAmount = isOTOverridden
                ? Number(override!.overrideOT)
                : 0; // Default 0 — HR adds OT manually

            // Get late penalty (override or auto)
            const isLatePenaltyOverridden = override?.overrideLatePenalty != null;
            const finalLatePenalty = isLatePenaltyOverridden
                ? Number(override!.overrideLatePenalty)
                : latePenalty;

            // Get adjustment (+/- arbitrary amount)
            const adjustment = override?.adjustment ? Number(override.adjustment) : 0;

            const total = dailyWage + otAmount - finalLatePenalty + adjustment;

            // Find absent colleagues on this day (only relevant if this employee is also absent)
            const absentColleagues: { name: string; nickName: string | null }[] = [];
            if (!attendance?.checkInTime && allColleagueIds.length > 0) {
                const presentOnDate = colleagueAttendanceMap.get(dateKey) || new Set();
                for (const cId of allColleagueIds) {
                    if (!presentOnDate.has(cId)) {
                        const info = colleagueNameMap.get(cId);
                        if (info) absentColleagues.push(info);
                    }
                }
            }

            dailyRecords.push({
                date: dateKey,
                dayOfWeek: dayNames[dayOfWeekDate.getUTCDay()],
                checkInTime: attendance?.checkInTime?.toISOString() || null,
                checkOutTime: attendance?.checkOutTime?.toISOString() || null,
                actualHours,
                breakMinutes: attendance?.breakDurationMin ?? null,
                lateMinutes,
                latePenalty: finalLatePenalty,
                isLatePenaltyOverridden,
                dailyWage,
                isWageOverridden,
                otHours: Math.round(otHours * 100) / 100,
                otAmount: Math.round(otAmount * 100) / 100,
                isOTOverridden,
                adjustment: Math.round(adjustment * 100) / 100,
                note: override?.note || null,
                total: Math.round(total * 100) / 100,
                absentColleagues,
            });

            currentDateStr = addDaysBKK(currentDateStr, 1);
        }

        // Get advance deduction
        const advanceMonth = parseInt(endDate.split("-")[1]);
        const advanceYear = parseInt(endDate.split("-")[0]);
        const advances = await prisma.advance.findMany({
            where: {
                userId,
                status: { in: ["APPROVED", "PAID"] },
                month: advanceMonth,
                year: advanceYear,
            },
        });
        const advanceDeduction = advances.reduce((sum, a) => sum + Number(a.amount), 0);

        // Get other expenses and social security
        const otherExpenses = Number(employee.otherExpenses) || 0;

        // Social security from SystemConfig
        const ssoRateConfig = await prisma.systemConfig.findUnique({ where: { key: "social_security_rate" } });
        const ssoMaxConfig = await prisma.systemConfig.findUnique({ where: { key: "social_security_max" } });
        const ssoRate = ssoRateConfig ? parseFloat(ssoRateConfig.value) : 0.05;
        const ssoMax = ssoMaxConfig ? parseFloat(ssoMaxConfig.value) : 750;

        const totalWage = dailyRecords.reduce((sum, d) => sum + d.dailyWage, 0);
        const totalOT = dailyRecords.reduce((sum, d) => sum + d.otAmount, 0);
        const totalLatePenalty = dailyRecords.reduce((sum, d) => sum + d.latePenalty, 0);
        const totalAdjustment = dailyRecords.reduce((sum, d) => sum + d.adjustment, 0);
        const grossPay = totalWage + totalOT - totalLatePenalty;
        const socialSecurity = employee.isSocialSecurityRegistered
            ? Math.min(grossPay * ssoRate, ssoMax)
            : 0;
        const totalDeductions = totalLatePenalty + advanceDeduction + otherExpenses + socialSecurity;

        // Calculate summary
        const summary = {
            totalDays: dailyRecords.length,
            workDays: dailyRecords.filter(d => d.checkInTime).length,
            totalWage,
            totalOT,
            totalLatePenalty,
            totalAdjustment,
            advanceDeduction,
            otherExpenses,
            socialSecurity,
            totalDeductions,
            grandTotal: totalWage + totalOT - totalDeductions + totalAdjustment,
        };

        return successResponse({
            employee: {
                id: employee.id,
                name: employee.name,
                employeeId: employee.employeeId,
                station: employee.station?.name || "-",
                department: employee.department?.name || "-",
                defaultDailyRate: dailyRate,
                hourlyRate,
                otMultiplier,
            },
            dailyRecords,
            summary,
        });
    } catch (error) {
        console.error("Error fetching employee daily payroll:", error);
        return ApiErrors.internal();
    }
}

// POST: Create or update daily override
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return ApiErrors.unauthorized();
        }

        const body = await request.json();
        const { userId, date, overrideDailyWage, overrideOT, overrideLatePenalty, adjustment, note } = body;

        if (!userId || !date) {
            return ApiErrors.validation("userId and date are required");
        }

        const dateObj = new Date(date);

        // Get existing override and employee info for audit
        const existing = await prisma.dailyPayrollOverride.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: dateObj,
                },
            },
        });

        const employee = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, employeeId: true },
        });

        // Upsert override
        const override = await prisma.dailyPayrollOverride.upsert({
            where: {
                userId_date: {
                    userId,
                    date: dateObj,
                },
            },
            update: {
                overrideDailyWage: overrideDailyWage !== undefined ? overrideDailyWage : undefined,
                overrideOT: overrideOT !== undefined ? overrideOT : undefined,
                overrideLatePenalty: overrideLatePenalty !== undefined ? overrideLatePenalty : undefined,
                adjustment: adjustment !== undefined ? adjustment : undefined,
                note: note !== undefined ? note : undefined,
            },
            create: {
                userId,
                date: dateObj,
                overrideDailyWage,
                overrideOT,
                overrideLatePenalty,
                adjustment,
                note,
            },
        });

        // Create audit log
        const changes: string[] = [];
        if (overrideDailyWage !== undefined) {
            changes.push(`ค่าแรง: ${existing?.overrideDailyWage?.toString() || "auto"} → ${overrideDailyWage}`);
        }
        if (overrideOT !== undefined) {
            changes.push(`OT: ${existing?.overrideOT?.toString() || "auto"} → ${overrideOT}`);
        }
        if (overrideLatePenalty !== undefined) {
            changes.push(`หักสาย: ${existing?.overrideLatePenalty?.toString() || "auto"} → ${overrideLatePenalty}`);
        }
        if (adjustment !== undefined) {
            changes.push(`ปรับเงิน: ${existing?.adjustment?.toString() || "0"} → ${adjustment}`);
        }

        await prisma.auditLog.create({
            data: {
                action: existing ? "UPDATE" : "CREATE",
                entity: "DailyPayrollOverride",
                entityId: override.id,
                details: JSON.stringify({
                    employeeId: employee?.employeeId,
                    employeeName: employee?.name,
                    date: date,
                    changes: changes,
                    oldDailyWage: existing?.overrideDailyWage?.toString() || null,
                    oldOT: existing?.overrideOT?.toString() || null,
                    newDailyWage: override.overrideDailyWage?.toString() || null,
                    newOT: override.overrideOT?.toString() || null,
                }),
                userId: session.user.id,
            },
        });

        return successResponse({ override });
    } catch (error) {
        console.error("Error updating daily override:", error);
        return ApiErrors.internal();
    }
}

// DELETE: Remove override (reset to default)
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return ApiErrors.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const date = searchParams.get("date");

        if (!userId || !date) {
            return ApiErrors.validation("userId and date are required");
        }

        // Get existing override for audit
        const existing = await prisma.dailyPayrollOverride.findUnique({
            where: {
                userId_date: {
                    userId,
                    date: new Date(date),
                },
            },
        });

        const employee = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true, employeeId: true },
        });

        await prisma.dailyPayrollOverride.deleteMany({
            where: {
                userId,
                date: new Date(date),
            },
        });

        // Create audit log for deletion
        if (existing) {
            await prisma.auditLog.create({
                data: {
                    action: "DELETE",
                    entity: "DailyPayrollOverride",
                    entityId: existing.id,
                    details: JSON.stringify({
                        employeeId: employee?.employeeId,
                        employeeName: employee?.name,
                        date: date,
                        deletedDailyWage: existing.overrideDailyWage?.toString() || null,
                        deletedOT: existing.overrideOT?.toString() || null,
                    }),
                    userId: session.user.id,
                },
            });
        }

        return successResponse({ deleted: true });
    } catch (error) {
        console.error("Error deleting daily override:", error);
        return ApiErrors.internal();
    }
}
