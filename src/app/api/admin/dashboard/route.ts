import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok, getBangkokNow } from "@/lib/date-utils";

// GET: Dashboard stats for manager
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admin/hr/manager can access
        if (!["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const now = getBangkokNow();
        const today = startOfDayBangkok(now);

        // Get manager's station for filtering (if manager role)
        let stationFilter: { stationId?: string } = {};
        if (session.user.role === "MANAGER") {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { stationId: true },
            });
            if (user?.stationId) {
                stationFilter = { stationId: user.stationId };
            }
        }

        // Count stats in parallel
        const [
            totalEmployees,
            todayAttendance,
            pendingShiftSwaps,
            pendingTimeCorrections,
            pendingLeaves,
            openShifts,
            todayAssignments,
        ] = await Promise.all([
            // Total active employees
            prisma.user.count({
                where: {
                    isActive: true,
                    employeeStatus: "ACTIVE",
                    role: "EMPLOYEE",
                    ...stationFilter,
                },
            }),

            // Today's attendance count
            prisma.attendance.count({
                where: {
                    date: today,
                    checkInTime: { not: null },
                    user: stationFilter.stationId
                        ? { stationId: stationFilter.stationId }
                        : undefined,
                },
            }),

            // Pending shift swap requests
            prisma.shiftSwap.count({
                where: {
                    status: "PENDING",
                    targetAccepted: true, // Target accepted, waiting manager approval
                },
            }),

            // Pending time corrections
            prisma.timeCorrection.count({
                where: {
                    status: "PENDING",
                    user: stationFilter.stationId
                        ? { stationId: stationFilter.stationId }
                        : undefined,
                },
            }),

            // Pending leaves
            prisma.leave.count({
                where: {
                    status: "PENDING",
                    user: stationFilter.stationId
                        ? { stationId: stationFilter.stationId }
                        : undefined,
                },
            }),

            // Open shifts in pool
            prisma.shiftPool.count({
                where: {
                    status: "OPEN",
                    date: { gte: today },
                },
            }),

            // Today's shift assignments
            prisma.shiftAssignment.count({
                where: {
                    date: today,
                    isDayOff: false,
                    user: stationFilter.stationId
                        ? { stationId: stationFilter.stationId }
                        : undefined,
                },
            }),
        ]);

        // Get recent pending requests (limited)
        const recentRequests = await prisma.shiftSwap.findMany({
            where: {
                status: "PENDING",
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                requester: { select: { name: true, employeeId: true } },
                target: { select: { name: true, employeeId: true } },
            },
        });

        const recentLeaves = await prisma.leave.findMany({
            where: {
                status: "PENDING",
                user: stationFilter.stationId
                    ? { stationId: stationFilter.stationId }
                    : undefined,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                user: { select: { name: true, employeeId: true } },
            },
        });

        const recentTimeCorrections = await prisma.timeCorrection.findMany({
            where: {
                status: "PENDING",
                user: stationFilter.stationId
                    ? { stationId: stationFilter.stationId }
                    : undefined,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
                user: { select: { name: true, employeeId: true } },
            },
        });

        // Calculate attendance percentage
        const attendanceRate = todayAssignments > 0
            ? Math.round((todayAttendance / todayAssignments) * 100)
            : 0;

        // Combine all requests into a unified format for dashboard display
        const allRequests: Array<{
            id: string;
            type: "shift_swap" | "leave" | "time_correction";
            employeeName: string;
            description: string;
            createdAt: string;
        }> = [];

        // Add shift swaps
        recentRequests.forEach((swap: any) => {
            allRequests.push({
                id: swap.id,
                type: "shift_swap",
                employeeName: swap.requester?.name || "Unknown",
                description: `ขอสลับกะกับ ${swap.target?.name || "Unknown"}`,
                createdAt: swap.createdAt.toISOString(),
            });
        });

        // Add leaves
        recentLeaves.forEach((leave: any) => {
            allRequests.push({
                id: leave.id,
                type: "leave",
                employeeName: leave.user?.name || "Unknown",
                description: `ขอลา ${leave.leaveType === "SICK" ? "ป่วย" : leave.leaveType === "ANNUAL" ? "พักร้อน" : leave.leaveType === "PERSONAL" ? "กิจ" : leave.leaveType}`,
                createdAt: leave.createdAt.toISOString(),
            });
        });

        // Add time corrections
        recentTimeCorrections.forEach((tc: any) => {
            allRequests.push({
                id: tc.id,
                type: "time_correction",
                employeeName: tc.user?.name || "Unknown",
                description: `ขอแก้ไขเวลา${tc.correctionType === "CHECK_IN" ? "เข้างาน" : "ออกงาน"}`,
                createdAt: tc.createdAt.toISOString(),
            });
        });

        // Sort by createdAt descending and take top 5
        allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const topRequests = allRequests.slice(0, 5);

        return NextResponse.json({
            stats: {
                totalEmployees,
                todayAttendance,
                todayExpected: todayAssignments,
                attendanceRate,
                pendingApprovals: pendingShiftSwaps + pendingTimeCorrections + pendingLeaves,
                pendingShiftSwaps,
                pendingTimeCorrections,
                pendingLeaves,
                openShifts,
            },
            recent: {
                requests: topRequests,
                shiftSwaps: recentRequests,
                leaves: recentLeaves,
                timeCorrections: recentTimeCorrections,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
