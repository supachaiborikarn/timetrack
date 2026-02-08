import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, format, startOfDayBangkok, getBangkokNow, addDays } from "@/lib/date-utils";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = getBangkokNow();
        const today = startOfDayBangkok(now);

        // Get last 7 days for weekly chart
        const weeklyData = [];
        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const nextDay = subDays(today, i - 1);

            const attendances = await prisma.attendance.findMany({
                where: {
                    date: {
                        gte: date,
                        lt: nextDay,
                    },
                },
            });

            const shiftsCount = await prisma.shiftAssignment.count({
                where: {
                    date: {
                        gte: date,
                        lt: nextDay,
                    },
                    isDayOff: false,
                },
            });

            const onTime = attendances.filter(a => a.checkInTime && (!a.lateMinutes || a.lateMinutes === 0)).length;
            const late = attendances.filter(a => a.checkInTime && a.lateMinutes && a.lateMinutes > 0).length;
            const absent = Math.max(0, shiftsCount - attendances.filter(a => a.checkInTime).length);

            weeklyData.push({
                day: dayNames[date.getDay()],
                date: format(date, "yyyy-MM-dd"),
                onTime,
                late,
                absent,
            });
        }

        // Get last 30 days for lateness trend
        const trendData = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(today, i);
            const nextDay = subDays(today, i - 1);

            const lateAttendances = await prisma.attendance.findMany({
                where: {
                    date: {
                        gte: date,
                        lt: nextDay,
                    },
                    lateMinutes: {
                        gt: 0,
                    },
                },
                select: {
                    lateMinutes: true,
                },
            });

            const lateCount = lateAttendances.length;
            const avgLateMinutes = lateCount > 0
                ? Math.round(lateAttendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0) / lateCount)
                : 0;

            trendData.push({
                date: format(date, "yyyy-MM-dd"),
                lateCount,
                avgLateMinutes,
            });
        }

        // Summary stats
        const totalEmployees = await prisma.user.count({
            where: { isActive: true, role: "EMPLOYEE" },
        });

        const todayAttendance = await prisma.attendance.count({
            where: {
                date: today,
                checkInTime: { not: null },
            },
        });

        const todayLate = await prisma.attendance.count({
            where: {
                date: today,
                lateMinutes: { gt: 0 },
            },
        });

        const weekLateTotal = weeklyData.reduce((sum, d) => sum + d.late, 0);
        const weekAbsentTotal = weeklyData.reduce((sum, d) => sum + d.absent, 0);

        return NextResponse.json({
            weekly: weeklyData,
            trend: trendData,
            summary: {
                totalEmployees,
                todayAttendance,
                todayLate,
                weekLateTotal,
                weekAbsentTotal,
            },
        });
    } catch (error) {
        console.error("Analytics API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
