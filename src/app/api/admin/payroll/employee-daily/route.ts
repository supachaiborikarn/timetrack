import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { startOfDay, endOfDay, addDays } from "@/lib/date-utils";

interface DailyRecord {
    date: string;
    dayOfWeek: string;
    checkInTime: string | null;
    checkOutTime: string | null;
    actualHours: number | null;
    lateMinutes: number | null;
    latePenalty: number;
    dailyWage: number;
    isWageOverridden: boolean;
    otHours: number;
    otAmount: number;
    isOTOverridden: boolean;
    note: string | null;
    total: number;
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

        // Get attendance records
        const attendances = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            orderBy: { date: "asc" },
        });

        // Get overrides
        const overrides = await prisma.dailyPayrollOverride.findMany({
            where: {
                userId,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
        });

        // Create a map for quick override lookup
        const overrideMap = new Map(
            overrides.map(o => [o.date.toISOString().split("T")[0], o])
        );

        // Create a map for attendance lookup
        const attendanceMap = new Map(
            attendances.map(a => [a.date.toISOString().split("T")[0], a])
        );

        // Build daily records for every day in range
        const dailyRecords: DailyRecord[] = [];
        const start = startOfDay(new Date(startDate));
        const end = endOfDay(new Date(endDate));
        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

        let currentDate = start;
        while (currentDate <= end) {
            const dateKey = currentDate.toISOString().split("T")[0];
            const attendance = attendanceMap.get(dateKey);
            const override = overrideMap.get(dateKey);

            // Calculate actual hours and OT
            const actualHours = attendance?.actualHours ? Number(attendance.actualHours) : null;
            const lateMinutes = attendance?.lateMinutes || null;
            const latePenalty = attendance ? Number(attendance.latePenaltyAmount) || 0 : 0;

            // OT calculation
            let otHours = 0;
            if (actualHours && actualHours > normalHoursPerDay) {
                otHours = actualHours - normalHoursPerDay;
            }

            // Get wage (override or default)
            const isWageOverridden = override?.overrideDailyWage != null;
            const dailyWage = isWageOverridden
                ? Number(override!.overrideDailyWage)
                : (attendance?.checkInTime ? dailyRate : 0);

            // Get OT amount (override or calculated)
            const isOTOverridden = override?.overrideOT != null;
            const otAmount = isOTOverridden
                ? Number(override!.overrideOT)
                : (otHours * hourlyRate * otMultiplier);

            const total = dailyWage + otAmount - latePenalty;

            dailyRecords.push({
                date: dateKey,
                dayOfWeek: dayNames[currentDate.getDay()],
                checkInTime: attendance?.checkInTime?.toISOString() || null,
                checkOutTime: attendance?.checkOutTime?.toISOString() || null,
                actualHours,
                lateMinutes,
                latePenalty,
                dailyWage,
                isWageOverridden,
                otHours: Math.round(otHours * 100) / 100,
                otAmount: Math.round(otAmount * 100) / 100,
                isOTOverridden,
                note: override?.note || null,
                total: Math.round(total * 100) / 100,
            });

            currentDate = addDays(currentDate, 1);
        }

        // Calculate summary
        const summary = {
            totalDays: dailyRecords.length,
            workDays: dailyRecords.filter(d => d.checkInTime).length,
            totalWage: dailyRecords.reduce((sum, d) => sum + d.dailyWage, 0),
            totalOT: dailyRecords.reduce((sum, d) => sum + d.otAmount, 0),
            totalLatePenalty: dailyRecords.reduce((sum, d) => sum + d.latePenalty, 0),
            grandTotal: dailyRecords.reduce((sum, d) => sum + d.total, 0),
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
        const { userId, date, overrideDailyWage, overrideOT, note } = body;

        if (!userId || !date) {
            return ApiErrors.validation("userId and date are required");
        }

        const dateObj = new Date(date);

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
                note: note !== undefined ? note : undefined,
            },
            create: {
                userId,
                date: dateObj,
                overrideDailyWage,
                overrideOT,
                note,
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

        await prisma.dailyPayrollOverride.deleteMany({
            where: {
                userId,
                date: new Date(date),
            },
        });

        return successResponse({ deleted: true });
    } catch (error) {
        console.error("Error deleting daily override:", error);
        return ApiErrors.internal();
    }
}
