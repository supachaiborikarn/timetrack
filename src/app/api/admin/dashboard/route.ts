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

        const { searchParams } = new URL(request.url);
        const isLight = searchParams.get("light") === "true";

        const now = getBangkokNow();
        const today = startOfDayBangkok();

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

        // === LIGHT MODE: Return only counts for polling (saves ~80% per request) ===
        if (isLight) {
            const [
                totalEmployees,
                todayAttendance,
                pendingShiftSwaps,
                pendingTimeCorrections,
                pendingLeavesCount,
                openShifts,
                todayAssignmentsCount,
            ] = await Promise.all([
                prisma.user.count({
                    where: { isActive: true, employeeStatus: "ACTIVE", role: "EMPLOYEE", ...stationFilter },
                }),
                prisma.attendance.count({
                    where: {
                        date: today,
                        checkInTime: { not: null },
                        user: stationFilter.stationId ? { stationId: stationFilter.stationId } : undefined,
                    },
                }),
                prisma.shiftSwap.count({ where: { status: "PENDING", targetAccepted: true } }),
                prisma.timeCorrection.count({
                    where: {
                        status: "PENDING",
                        user: stationFilter.stationId ? { stationId: stationFilter.stationId } : undefined,
                    },
                }),
                prisma.leave.count({
                    where: {
                        status: "PENDING",
                        user: stationFilter.stationId ? { stationId: stationFilter.stationId } : undefined,
                    },
                }),
                prisma.shiftPool.count({ where: { status: "OPEN", date: { gte: today } } }),
                prisma.shiftAssignment.count({
                    where: {
                        date: today,
                        isDayOff: false,
                        user: stationFilter.stationId ? { stationId: stationFilter.stationId } : undefined,
                    },
                }),
            ]);

            const attendanceRate = todayAssignmentsCount > 0
                ? Math.round((todayAttendance / todayAssignmentsCount) * 100)
                : 0;

            return NextResponse.json({
                stats: {
                    totalEmployees,
                    todayAttendance,
                    todayExpected: todayAssignmentsCount,
                    attendanceRate,
                    pendingApprovals: pendingShiftSwaps + pendingTimeCorrections + pendingLeavesCount,
                    pendingShiftSwaps,
                    pendingTimeCorrections,
                    pendingLeaves: pendingLeavesCount,
                    openShifts,
                },
            });
        }

        // === FULL MODE: Complete dashboard data (initial page load only) ===

        // Count stats in parallel
        const counts = await Promise.all([
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

            // Today's shift assignments count
            prisma.shiftAssignment.count({
                where: {
                    date: today,
                    isDayOff: false,
                    user: stationFilter.stationId
                        ? { stationId: stationFilter.stationId }
                        : undefined,
                },
            }),

            // Fetch details for Absent logic (Assignments)
            prisma.shiftAssignment.findMany({
                where: {
                    date: today,
                    isDayOff: false,
                    user: {
                        isActive: true,
                        role: "EMPLOYEE",
                        ...stationFilter,
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            nickName: true,
                            phone: true,
                            photoUrl: true,
                            department: { select: { name: true } },
                            station: { select: { name: true } },
                        }
                    },
                    shift: {
                        select: {
                            name: true,
                            startTime: true,
                            endTime: true,
                        }
                    }
                }
            }),

            // Fetch details for Absent logic (Attendance)
            prisma.attendance.findMany({
                where: {
                    date: today,
                    checkInTime: { not: null },
                    user: stationFilter.stationId
                        ? { stationId: stationFilter.stationId }
                        : undefined,
                },
                select: { userId: true }
            }),

            // Fetch Leaves for today to check context
            prisma.leave.findMany({
                where: {
                    startDate: { lte: today },
                    endDate: { gte: today },
                    status: { in: ["PENDING", "APPROVED", "REJECTED"] },
                    user: {
                        isActive: true,
                        role: "EMPLOYEE",
                        ...stationFilter,
                    }
                },
                select: {
                    userId: true,
                    type: true,
                    status: true,
                    reason: true,
                }
            })
        ]);

        const totalEmployees = counts[0];
        const todayAttendance = counts[1];
        const pendingShiftSwaps = counts[2];
        const pendingTimeCorrections = counts[3];
        const pendingLeavesCount = counts[4];
        const openShifts = counts[5];
        const todayAssignmentsCount = counts[6];
        const todayAssignmentsList = counts[7];
        const todayAttendanceList = counts[8];
        const todayLeavesList = counts[9];

        // Create Maps for fast lookup
        const presentUserIds = new Set(todayAttendanceList.map(a => a.userId));
        const leaveMap = new Map(); // userId -> Leave Record
        todayLeavesList.forEach(l => leaveMap.set(l.userId, l));

        // Group assignments by station for overlap calculation
        const stationAssignmentsMap = new Map<string, string[]>(); // stationName -> userIds[]

        // 1. Identify Absent Candidates (Shift but no Check-in)
        let absentCandidates = todayAssignmentsList.filter(sa => !presentUserIds.has(sa.user.id));

        // 2. Filter out APPROVED leaves (Authorized Absence)
        // We only want to show "Unexpected" absences or "Pending" leaves
        absentCandidates = absentCandidates.filter(sa => {
            const leave = leaveMap.get(sa.user.id);
            // If on APPROVED leave, they are NOT "Absent" in the negative sense
            if (leave && leave.status === "APPROVED") return false;
            return true;
        });

        // 3. Build Overlap Map
        absentCandidates.forEach(sa => {
            const stationName = sa.user.station?.name || "Unknown";
            if (!stationAssignmentsMap.has(stationName)) {
                stationAssignmentsMap.set(stationName, []);
            }
            stationAssignmentsMap.get(stationName)!.push(sa.user.name);
        });

        // 4. Map to final response format
        const absentEmployees = absentCandidates.map(sa => {
            const leave = leaveMap.get(sa.user.id);
            const stationName = sa.user.station?.name || "Unknown";

            // Get others in same station (excluding self)
            const othersInStation = stationAssignmentsMap.get(stationName) || [];
            const overlaps = othersInStation.filter(name => name !== sa.user.name);

            return {
                id: sa.user.id,
                name: sa.user.name,
                nickName: sa.user.nickName,
                phone: sa.user.phone,
                photoUrl: sa.user.photoUrl,
                department: sa.user.department?.name || "-",
                station: stationName,
                shiftName: sa.shift.name,
                shiftTime: `${sa.shift.startTime} - ${sa.shift.endTime}`,
                // Enhanced Context
                leaveStatus: leave ? leave.status : null,
                leaveType: leave ? leave.type : null,
                overlaps: overlaps // List of other absent names in same station
            };
        });

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
        const attendanceRate = todayAssignmentsCount > 0
            ? Math.round((todayAttendance / todayAssignmentsCount) * 100)
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

        // Monthly attendance summary for calendar widget
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(monthStart.getHours() - 7); // Adjust for Bangkok TZ
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        monthEnd.setHours(monthEnd.getHours() - 7);

        const monthlyRecords = await prisma.attendance.findMany({
            where: {
                date: { gte: monthStart, lte: monthEnd },
                user: stationFilter.stationId
                    ? { stationId: stationFilter.stationId }
                    : { isActive: true, role: "EMPLOYEE" },
            },
            select: {
                date: true,
                status: true,
                lateMinutes: true,
                checkInTime: true,
            },
        });

        // Aggregate by day
        const dailyMap = new Map<string, { onTime: number; late: number; absent: number }>();
        monthlyRecords.forEach((rec) => {
            // Convert date to Bangkok date string
            const d = new Date(rec.date.getTime() + 7 * 60 * 60 * 1000);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            if (!dailyMap.has(key)) {
                dailyMap.set(key, { onTime: 0, late: 0, absent: 0 });
            }
            const entry = dailyMap.get(key)!;
            if (!rec.checkInTime) {
                entry.absent++;
            } else if (rec.lateMinutes && rec.lateMinutes > 0) {
                entry.late++;
            } else {
                entry.onTime++;
            }
        });

        const monthlyAttendance = Array.from(dailyMap.entries())
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({
            stats: {
                totalEmployees,
                todayAttendance,
                todayExpected: todayAssignmentsCount,
                attendanceRate,
                pendingApprovals: pendingShiftSwaps + pendingTimeCorrections + pendingLeavesCount,
                pendingShiftSwaps,
                pendingTimeCorrections,
                pendingLeaves: pendingLeavesCount,
                openShifts,
                absentEmployees, // Add filtered list here
            },
            recent: {
                requests: topRequests,
                shiftSwaps: recentRequests,
                leaves: recentLeaves,
                timeCorrections: recentTimeCorrections,
            },
            monthlyAttendance,
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
