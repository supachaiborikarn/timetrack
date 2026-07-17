import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAttendanceDailySummary } from "@/lib/attendance-summary";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [
            totalEmployees,
            totalStations,
            pendingLeaves,
            attendanceSummary,
        ] = await Promise.all([
            prisma.user.count({ where: { isActive: true, role: "EMPLOYEE" } }),
            prisma.station.count({ where: { isActive: true } }),
            prisma.leave.count({ where: { status: "PENDING" } }),
            getAttendanceDailySummary(),
        ]);

        const presentToday = attendanceSummary.totals.present;
        const absentToday = attendanceSummary.totals.absentWithoutLeave;
        const lateToday = attendanceSummary.groups.reduce(
            (sum, group) => sum + group.present.filter((person) => person.lateMinutes > 5).length,
            0,
        );

        return NextResponse.json({
            totalEmployees,
            presentToday,
            absentToday,
            lateToday,
            pendingLeaves,
            totalStations,
            approvedLeaveToday: attendanceSummary.totals.approvedLeave,
            pendingLeaveToday: attendanceSummary.totals.pendingLeave,
            upcomingToday: attendanceSummary.totals.upcoming,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
