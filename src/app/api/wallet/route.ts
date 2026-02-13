import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return ApiErrors.unauthorized();
        }

        const userId = session.user.id;
        const { searchParams } = new URL(request.url);
        const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
        const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

        // Calculate date range for the month
        const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
        const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59)); // last day of month

        // Fetch all data in parallel
        const [user, attendances, specialIncomes, advances, overrides] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    employeeId: true,
                    dailyRate: true,
                    hourlyRate: true,
                    otRateMultiplier: true,
                    station: { select: { name: true } },
                    department: { select: { name: true, isFrontYard: true } },
                },
            }),
            prisma.attendance.findMany({
                where: {
                    userId,
                    date: { gte: startDate, lte: endDate },
                },
                orderBy: { date: "asc" },
            }),
            prisma.specialIncome.findMany({
                where: {
                    userId,
                    date: { gte: startDate, lte: endDate },
                },
                orderBy: { date: "asc" },
            }),
            prisma.advance.findMany({
                where: {
                    userId,
                    date: { gte: startDate, lte: endDate },
                    status: { in: ["APPROVED", "PAID"] },
                },
            }),
            prisma.dailyPayrollOverride.findMany({
                where: {
                    userId,
                    date: { gte: startDate, lte: endDate },
                },
            }),
        ]);

        if (!user) {
            return ApiErrors.notFound("User");
        }

        const dailyRate = Number(user.dailyRate);
        const hourlyRate = Number(user.hourlyRate);
        const otMultiplier = Number(user.otRateMultiplier);

        // Index special incomes and overrides by date
        const incomesByDate = new Map<string, typeof specialIncomes>();
        for (const si of specialIncomes) {
            const dateKey = si.date.toISOString().split("T")[0];
            if (!incomesByDate.has(dateKey)) incomesByDate.set(dateKey, []);
            incomesByDate.get(dateKey)!.push(si);
        }

        const overridesByDate = new Map<string, typeof overrides[0]>();
        for (const ov of overrides) {
            const dateKey = ov.date.toISOString().split("T")[0];
            overridesByDate.set(dateKey, ov);
        }

        // Build daily breakdown
        let totalDailyWage = 0;
        let totalOT = 0;
        let totalSpecialIncome = 0;
        let totalApprovedSpecialIncome = 0;
        let totalPenalty = 0;
        let totalAdvanceDeduct = 0;
        let pendingCount = 0;

        const dailyBreakdown = attendances.map((att) => {
            const dateKey = att.date.toISOString().split("T")[0];
            const override = overridesByDate.get(dateKey);
            const dayIncomes = incomesByDate.get(dateKey) || [];

            // Daily wage
            const wage = override?.overrideDailyWage
                ? Number(override.overrideDailyWage)
                : dailyRate;

            // OT pay
            const otHours = att.overtimeHours ? Number(att.overtimeHours) : 0;
            const otPay = override?.overrideOT
                ? Number(override.overrideOT)
                : otHours * hourlyRate * otMultiplier;

            // Penalties
            const latePenalty = Number(att.latePenaltyAmount || 0);
            const breakPenalty = Number(att.breakPenaltyAmount || 0);
            const penalties = latePenalty + breakPenalty;

            // Special incomes for this day
            const daySpecialTotal = dayIncomes.reduce((sum, si) => sum + Number(si.amount), 0);
            const dayApprovedSpecial = dayIncomes
                .filter((si) => si.status === "APPROVED" || si.status === "PAID")
                .reduce((sum, si) => sum + Number(si.amount), 0);
            const dayPending = dayIncomes.filter((si) => si.status === "PENDING").length;

            // Net for the day
            const netDaily = wage + otPay + dayApprovedSpecial - penalties;

            // Accumulate totals
            totalDailyWage += wage;
            totalOT += otPay;
            totalSpecialIncome += daySpecialTotal;
            totalApprovedSpecialIncome += dayApprovedSpecial;
            totalPenalty += penalties;
            pendingCount += dayPending;

            return {
                date: dateKey,
                status: att.status,
                checkIn: att.checkInTime?.toISOString() || null,
                checkOut: att.checkOutTime?.toISOString() || null,
                actualHours: att.actualHours ? Number(att.actualHours) : null,
                overtimeHours: otHours,
                dailyWage: wage,
                overtimePay: otPay,
                latePenalty,
                breakPenalty,
                totalPenalty: penalties,
                specialIncomes: dayIncomes.map((si) => ({
                    id: si.id,
                    type: si.type,
                    description: si.description,
                    salesAmount: si.salesAmount ? Number(si.salesAmount) : null,
                    percentage: si.percentage ? Number(si.percentage) : null,
                    amount: Number(si.amount),
                    status: si.status,
                })),
                netDaily,
                hasOverride: !!override,
            };
        });

        // Advance deductions
        totalAdvanceDeduct = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);

        // Projected net pay
        const projectedNetPay =
            totalDailyWage + totalOT + totalApprovedSpecialIncome - totalPenalty - totalAdvanceDeduct;

        return successResponse({
            employee: {
                name: user.name,
                employeeId: user.employeeId,
                station: user.station?.name || null,
                department: user.department?.name || null,
                dailyRate,
            },
            period: {
                month,
                year,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
            },
            dailyBreakdown,
            monthSummary: {
                totalDailyWage,
                totalOT,
                totalSpecialIncome,
                totalApprovedSpecialIncome,
                totalPenalty,
                totalAdvanceDeduct,
                projectedNetPay,
                workDays: attendances.length,
                pendingItems: pendingCount,
            },
            advances: advances.map((adv) => ({
                id: adv.id,
                amount: Number(adv.amount),
                date: adv.date.toISOString().split("T")[0],
                status: adv.status,
                reason: adv.reason,
            })),
        });
    } catch (error) {
        console.error("Error fetching wallet data:", error);
        return ApiErrors.internal();
    }
}
