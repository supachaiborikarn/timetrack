import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, format, startOfDayBangkok, getBangkokNow } from "@/lib/date-utils";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = startOfDayBangkok();
        const thirtyDaysAgo = subDays(today, 30);
        const sevenDaysAgo = subDays(today, 7);

        // === OPTIMIZED: 2 bulk queries instead of 47 individual queries ===

        // 1. Fetch ALL attendance records for last 30 days in ONE query
        const allAttendances = await prisma.attendance.findMany({
            where: {
                date: { gte: thirtyDaysAgo, lt: subDays(today, -1) },
            },
            select: {
                date: true,
                checkInTime: true,
                lateMinutes: true,
            },
        });

        // 2. Fetch shift assignment counts for last 7 days in ONE query
        const shiftAssignments = await prisma.shiftAssignment.findMany({
            where: {
                date: { gte: sevenDaysAgo, lt: subDays(today, -1) },
                isDayOff: false,
            },
            select: {
                date: true,
            },
        });

        // === Group attendance by date in JavaScript ===
        const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
        const attendanceByDate = new Map<string, typeof allAttendances>();

        for (const a of allAttendances) {
            const d = new Date(a.date.getTime() + BANGKOK_OFFSET_MS);
            const key = format(d, "yyyy-MM-dd");
            if (!attendanceByDate.has(key)) attendanceByDate.set(key, []);
            attendanceByDate.get(key)!.push(a);
        }

        // Group shift assignments by date
        const shiftCountByDate = new Map<string, number>();
        for (const sa of shiftAssignments) {
            const d = new Date(sa.date.getTime() + BANGKOK_OFFSET_MS);
            const key = format(d, "yyyy-MM-dd");
            shiftCountByDate.set(key, (shiftCountByDate.get(key) || 0) + 1);
        }

        // === Build weekly data (last 7 days) ===
        const dayNames = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];
        const weeklyData = [];

        for (let i = 6; i >= 0; i--) {
            const date = subDays(today, i);
            const dateKey = format(date, "yyyy-MM-dd");
            const dayAttendances = attendanceByDate.get(dateKey) || [];
            const shiftsCount = shiftCountByDate.get(dateKey) || 0;

            const onTime = dayAttendances.filter(a => a.checkInTime && (!a.lateMinutes || a.lateMinutes === 0)).length;
            const late = dayAttendances.filter(a => a.checkInTime && a.lateMinutes && a.lateMinutes > 0).length;
            const absent = Math.max(0, shiftsCount - dayAttendances.filter(a => a.checkInTime).length);

            weeklyData.push({
                day: dayNames[date.getDay()],
                date: dateKey,
                onTime,
                late,
                absent,
            });
        }

        // === Build trend data (last 30 days) ===
        const trendData = [];
        for (let i = 29; i >= 0; i--) {
            const date = subDays(today, i);
            const dateKey = format(date, "yyyy-MM-dd");
            const dayAttendances = attendanceByDate.get(dateKey) || [];

            const lateAttendances = dayAttendances.filter(a => a.lateMinutes && a.lateMinutes > 0);
            const lateCount = lateAttendances.length;
            const avgLateMinutes = lateCount > 0
                ? Math.round(lateAttendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0) / lateCount)
                : 0;

            trendData.push({
                date: dateKey,
                lateCount,
                avgLateMinutes,
            });
        }

        // 3. Summary stats (2 simple count queries)
        const [totalEmployees, todayAttendance, todayLate] = await Promise.all([
            prisma.user.count({ where: { isActive: true, role: "EMPLOYEE" } }),
            prisma.attendance.count({ where: { date: today, checkInTime: { not: null } } }),
            prisma.attendance.count({ where: { date: today, lateMinutes: { gt: 0 } } }),
        ]);

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

