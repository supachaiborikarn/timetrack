import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, getBangkokNow } from "@/lib/date-utils";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const today = getBangkokNow();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);

        // Get counts in parallel
        const [
            totalEmployees,
            totalStations,
            todayAttendance,
            pendingLeaves,
        ] = await Promise.all([
            prisma.user.count({ where: { isActive: true, role: "EMPLOYEE" } }),
            prisma.station.count({ where: { isActive: true } }),
            prisma.attendance.findMany({
                where: {
                    date: { gte: startOfToday, lte: endOfToday },
                },
                select: {
                    checkInTime: true,
                    lateMinutes: true,
                },
            }),
            prisma.leave.count({ where: { status: "PENDING" } }),
        ]);

        const presentToday = todayAttendance.filter((a) => a.checkInTime !== null).length;
        const lateToday = todayAttendance.filter((a) => (a.lateMinutes || 0) > 5).length;

        // Calculate absent (employees with shift today but no check-in)
        const todayShifts = await prisma.shiftAssignment.count({
            where: {
                date: { gte: startOfToday, lte: endOfToday },
            },
        });
        const absentToday = Math.max(0, todayShifts - presentToday);

        return NextResponse.json({
            totalEmployees,
            presentToday,
            absentToday,
            lateToday,
            pendingLeaves,
            totalStations,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
