import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";
import { PAYROLL_ELIGIBLE_ROLES, toBangkokDateKey } from "@/lib/payroll-calculation";
import { loadPayrollCalculations } from "@/lib/payroll-service";

const DAY_MS = 24 * 60 * 60 * 1000;

function addDays(dateStr: string, days: number): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day + days)).toISOString().split("T")[0];
}

function isDateString(value: unknown): value is string {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseOptionalMoney(value: unknown, allowNegative = false): number | undefined {
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || (!allowNegative && parsed < 0)) throw new Error("INVALID_MONEY");
    return Math.round(parsed * 100) / 100;
}

type OverrideChanges = {
    overrideDailyWage?: number | null;
    overrideOT?: number | null;
    overrideLatePenalty?: number | null;
    adjustment?: number | null;
    otherDeduction?: number | null;
    note?: string | null;
};

async function upsertCanonicalOverride(
    tx: Prisma.TransactionClient,
    userId: string,
    dateStr: string,
    changes: OverrideChanges,
) {
    const date = parseDateStringToBangkokMidnight(dateStr);
    const end = new Date(date.getTime() + DAY_MS - 1);
    const existingRecords = await tx.dailyPayrollOverride.findMany({
        where: { userId, date: { gte: date, lte: end } },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    });
    const canonical = existingRecords.find((record) => record.date.getTime() === date.getTime());
    const source = existingRecords[0];
    const definedChanges = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as OverrideChanges;
    const merged = {
        overrideDailyWage: source?.overrideDailyWage ?? null,
        overrideOT: source?.overrideOT ?? null,
        overrideLatePenalty: source?.overrideLatePenalty ?? null,
        adjustment: source?.adjustment ?? 0,
        otherDeduction: source?.otherDeduction ?? null,
        note: source?.note ?? null,
        ...definedChanges,
    };

    const target = canonical
        ? await tx.dailyPayrollOverride.update({ where: { id: canonical.id }, data: merged })
        : await tx.dailyPayrollOverride.create({ data: { userId, date, ...merged } });

    await tx.dailyPayrollOverride.deleteMany({
        where: { userId, date: { gte: date, lte: end }, id: { not: target.id } },
    });
    return target;
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) return ApiErrors.unauthorized();

        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        if (!userId || !startDate || !endDate) {
            return ApiErrors.validation("userId, startDate, and endDate are required");
        }

        const loaded = await loadPayrollCalculations({ userId, startDate, endDate });
        const result = loaded.employees[0];
        if (!result) return ApiErrors.notFound("Employee not found");

        const { employee, calculation } = result;
        const dailyByDate = new Map(calculation.dailyRecords.map((record) => [record.date, record]));
        const colleagueWhere: Prisma.UserWhereInput = {
            id: { not: userId },
            isActive: true,
            role: { in: [...PAYROLL_ELIGIBLE_ROLES] },
            stationId: employee.stationId,
        };
        if (employee.departmentId) colleagueWhere.departmentId = employee.departmentId;
        const colleagues = employee.stationId
            ? await prisma.user.findMany({ where: colleagueWhere, select: { id: true, name: true, nickName: true } })
            : [];
        const colleagueAttendance = colleagues.length > 0
            ? await prisma.attendance.findMany({
                where: {
                    userId: { in: colleagues.map((colleague) => colleague.id) },
                    status: "APPROVED",
                    checkInTime: { not: null },
                    date: { gte: loaded.start, lte: loaded.end },
                },
                select: { userId: true, date: true },
            })
            : [];
        const presentByDate = new Map<string, Set<string>>();
        for (const attendance of colleagueAttendance) {
            const dateKey = toBangkokDateKey(attendance.date);
            const ids = presentByDate.get(dateKey) || new Set<string>();
            ids.add(attendance.userId);
            presentByDate.set(dateKey, ids);
        }

        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
        const dailyRecords = [];
        for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
            const record = dailyByDate.get(date);
            const attendance = record?.attendance;
            const override = record?.override;
            const dayDate = new Date(`${date}T00:00:00+07:00`);
            const present = presentByDate.get(date) || new Set<string>();
            dailyRecords.push({
                date,
                dayOfWeek: dayNames[dayDate.getDay()],
                checkInTime: attendance?.checkInTime?.toISOString() || null,
                checkOutTime: attendance?.checkOutTime?.toISOString() || null,
                actualHours: attendance?.actualHours == null ? null : record?.actualHours ?? Number(attendance.actualHours),
                breakMinutes: attendance?.breakDurationMinutes ?? null,
                lateMinutes: attendance?.lateMinutes ?? null,
                latePenalty: record?.latePenalty || 0,
                earlyLeavePenalty: record?.earlyLeavePenalty || 0,
                isLatePenaltyOverridden: override?.overrideLatePenalty != null,
                dailyWage: record?.dailyWage || 0,
                isWageOverridden: override?.overrideDailyWage != null,
                dayFactor: record?.dayFactor || 0,
                otHours: record?.overtimeHours || 0,
                otAmount: record?.otAmount || 0,
                isOTOverridden: override?.overrideOT != null,
                adjustment: record?.adjustment || 0,
                specialIncome: record?.specialIncome || 0,
                note: override?.note || null,
                total: record?.total || 0,
                absentColleagues: colleagues
                    .filter((colleague) => !present.has(colleague.id))
                    .map(({ name, nickName }) => ({ name, nickName })),
            });
        }

        const dailyRate = Math.max(0, Number(employee.dailyRate) || 0);
        return successResponse({
            employee: {
                id: employee.id,
                name: employee.name,
                employeeId: employee.employeeId,
                station: employee.station?.name || "-",
                department: employee.department?.name || "-",
                defaultDailyRate: dailyRate,
                hourlyRate: Math.max(0, Number(employee.hourlyRate) || dailyRate / 10),
                otMultiplier: Math.max(0, Number(employee.otRateMultiplier) || 1.5),
            },
            dailyRecords,
            summary: {
                totalDays: dailyRecords.length,
                workDays: calculation.workDays,
                fullDayCount: calculation.fullDayCount,
                halfDayCount: calculation.halfDayCount,
                totalHours: calculation.totalHours,
                totalWage: calculation.regularPay,
                totalOT: calculation.overtimePay,
                totalLatePenalty: calculation.latePenalty,
                totalEarlyLeavePenalty: calculation.earlyLeavePenalty,
                totalAdjustment: calculation.adjustment,
                totalSpecialIncome: calculation.specialIncome,
                totalEarnings: calculation.totalEarnings,
                advanceDeduction: calculation.advanceDeduction,
                otherExpenses: calculation.otherExpenses,
                socialSecurity: calculation.socialSecurity,
                totalDeductions: calculation.totalDeductions,
                grandTotal: calculation.totalPay,
            },
        });
    } catch (error) {
        console.error("Error fetching daily payroll:", error);
        return ApiErrors.internal();
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) return ApiErrors.unauthorized();
        const body = await request.json();
        if (!body.userId || !isDateString(body.date)) return ApiErrors.validation("userId and a valid date are required");

        let changes: OverrideChanges;
        try {
            changes = {
                overrideDailyWage: parseOptionalMoney(body.overrideDailyWage),
                overrideOT: parseOptionalMoney(body.overrideOT),
                overrideLatePenalty: parseOptionalMoney(body.overrideLatePenalty),
                adjustment: parseOptionalMoney(body.adjustment, true),
                note: body.note === undefined ? undefined : String(body.note || ""),
            };
        } catch {
            return ApiErrors.validation("จำนวนเงินต้องเป็นตัวเลข และค่าแรง OT หรือค่าหักต้องไม่ติดลบ");
        }

        const override = await prisma.$transaction(async (tx) => {
            const saved = await upsertCanonicalOverride(tx, body.userId, body.date, changes);
            await tx.auditLog.create({
                data: {
                    action: "UPDATE",
                    entity: "DailyPayrollOverride",
                    entityId: saved.id,
                    details: JSON.stringify({ date: body.date, changes }),
                    userId: session.user.id,
                },
            });
            return saved;
        });
        return successResponse({ override });
    } catch (error) {
        console.error("Error updating daily override:", error);
        return ApiErrors.internal();
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) return ApiErrors.unauthorized();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get("userId");
        const date = searchParams.get("date");
        if (!userId || !isDateString(date)) return ApiErrors.validation("userId and a valid date are required");
        const start = parseDateStringToBangkokMidnight(date);
        const end = new Date(start.getTime() + DAY_MS - 1);

        await prisma.$transaction(async (tx) => {
            const deleted = await tx.dailyPayrollOverride.deleteMany({ where: { userId, date: { gte: start, lte: end } } });
            if (deleted.count > 0) {
                await tx.auditLog.create({
                    data: {
                        action: "DELETE",
                        entity: "DailyPayrollOverride",
                        details: JSON.stringify({ userId, date, deleted: deleted.count }),
                        userId: session.user.id,
                    },
                });
            }
        });
        return successResponse({ deleted: true });
    } catch (error) {
        console.error("Error deleting daily override:", error);
        return ApiErrors.internal();
    }
}

export async function PATCH(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) return ApiErrors.unauthorized();
        const body = await request.json();
        const { userId, startDate, endDate } = body;
        if (!userId) return ApiErrors.validation("userId is required");
        if (!isDateString(startDate) || !isDateString(endDate)) {
            return ApiErrors.validation("startDate and endDate are required for period adjustments");
        }

        let totalAdjustment: number | undefined;
        let otherDeduction: number | undefined;
        try {
            totalAdjustment = parseOptionalMoney(body.totalAdjustment, true);
            otherDeduction = parseOptionalMoney(body.otherExpenses);
        } catch {
            return ApiErrors.validation("จำนวนเงินไม่ถูกต้อง");
        }
        if (totalAdjustment === undefined && otherDeduction === undefined) {
            return ApiErrors.validation("No adjustment value was provided");
        }

        const rangeStart = parseDateStringToBangkokMidnight(startDate);
        const rangeEndMidnight = parseDateStringToBangkokMidnight(endDate);
        const rangeEnd = new Date(rangeEndMidnight.getTime() + DAY_MS - 1);
        await prisma.$transaction(async (tx) => {
            if (totalAdjustment !== undefined) {
                await tx.dailyPayrollOverride.updateMany({
                    where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
                    data: { adjustment: 0 },
                });
            }
            if (otherDeduction !== undefined) {
                await tx.dailyPayrollOverride.updateMany({
                    where: { userId, date: { gte: rangeStart, lte: rangeEnd } },
                    data: { otherDeduction: null },
                });
            }
            const saved = await upsertCanonicalOverride(tx, userId, endDate, {
                adjustment: totalAdjustment,
                otherDeduction,
            });
            if (otherDeduction !== undefined) {
                await tx.user.update({ where: { id: userId }, data: { otherExpenses: 0 } });
            }
            await tx.auditLog.create({
                data: {
                    action: "UPDATE",
                    entity: "PayrollPeriodAdjustment",
                    entityId: saved.id,
                    details: JSON.stringify({ userId, startDate, endDate, totalAdjustment, otherDeduction }),
                    userId: session.user.id,
                },
            });
        });

        return successResponse({ updated: true });
    } catch (error) {
        console.error("Error updating payroll adjustments:", error);
        return ApiErrors.internal();
    }
}
