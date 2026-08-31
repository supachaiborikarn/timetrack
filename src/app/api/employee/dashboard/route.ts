import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { getPayrollPeriod, startOfDayBangkok } from "@/lib/date-utils";

/**
 * GET /api/employee/dashboard
 * Returns all data needed for the employee dashboard in a single request.
 * OPTIMIZED: All independent queries run in parallel via Promise.all()
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const now = new Date();
        const { searchParams } = new URL(request.url);
        const calYear  = parseInt(searchParams.get("calYear")  || String(now.getFullYear()));
        const calMonth = parseInt(searchParams.get("calMonth") || String(now.getMonth())); // 0-indexed

        const calDate = new Date(calYear, calMonth, 1);
        const monthStart = startOfMonth(calDate);
        const monthEnd   = endOfMonth(calDate);
        const yearStart  = startOfYear(now);
        const yearEnd    = endOfYear(now);

        // Fetch current user early to get department info for frontyard logic
        const currentUser = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                departmentId: true,
                department: {
                    select: { isFrontYard: true }
                }
            },
        });

        const isFrontYard = currentUser?.department?.isFrontYard || false;
        
        const { startDate: payrollStart, endDate: payrollEnd } = getPayrollPeriod(calDate, isFrontYard);
        const todayBangkok = startOfDayBangkok(now);
        const periodEndUpToToday = new Date(Math.min(payrollEnd.getTime(), todayBangkok.getTime()));
        const currentYear = now.getFullYear();

        // ============================================================
        // PARALLEL BATCH: Run all independent queries simultaneously
        // ============================================================
        const [
            thisMonthAttendance,
            todayAttendance,
            expectedDays,
            approvedLeavesInPeriod,
            leaves,
            leaveBalance,
            advances,
            announcements,
            calAttendance,
        ] = await Promise.all([
            // 1. Attendance records for this payroll period
            prisma.attendance.findMany({
                where: {
                    userId,
                    date: { gte: payrollStart, lte: payrollEnd },
                },
                select: {
                    date: true,
                    checkInTime: true,
                    checkOutTime: true,
                    status: true,
                    lateMinutes: true,
                    earlyLeaveMinutes: true,
                },
            }),

            // 2. Today's attendance (break info)
            prisma.attendance.findFirst({
                where: { userId, date: todayBangkok },
                select: { breakStartTime: true, breakEndTime: true, breakDurationMin: true },
            }),

            // 3. Expected shift days count
            prisma.shiftAssignment.count({
                where: {
                    userId,
                    isDayOff: false,
                    date: { gte: payrollStart, lte: periodEndUpToToday },
                },
            }),

            // 4. Approved leaves in period
            prisma.leave.findMany({
                where: {
                    userId,
                    status: "APPROVED",
                    startDate: { lte: periodEndUpToToday },
                    endDate: { gte: payrollStart },
                },
            }),

            // 5. Leave counts this year
            prisma.leave.findMany({
                where: {
                    userId,
                    status: "APPROVED",
                    startDate: { gte: yearStart, lte: yearEnd },
                },
                select: { type: true },
            }),

            // 6. Leave balance
            prisma.leaveBalance.findUnique({
                where: { userId_year: { userId, year: currentYear } },
            }),

            // 7. Advance summary this month
            prisma.advance.findMany({
                where: {
                    userId,
                    month: calDate.getMonth() + 1,
                    year: calDate.getFullYear(),
                },
                select: { amount: true, status: true },
            }),

            // 8. Announcements (latest 5, with read tracking)
            prisma.announcement.findMany({
                where: { isActive: true },
                include: {
                    author: { select: { id: true, name: true, nickName: true } },
                    _count: { select: { comments: true, reads: true } },
                    reads: {
                        where: { userId },
                        select: { id: true },
                        take: 1,
                    },
                },
                orderBy: [
                    { isPinned: "desc" },
                    { createdAt: "desc" },
                ],
                take: 5,
            }),

            // 9. Calendar attendance data for requested month
            prisma.attendance.findMany({
                where: {
                    userId,
                    date: { gte: monthStart, lte: monthEnd },
                },
                select: {
                    date: true,
                    checkInTime: true,
                    checkOutTime: true,
                    status: true,
                    lateMinutes: true,
                },
            }),
        ]);

        // ============================================================
        // Post-processing (CPU-only, no DB)
        // ============================================================

        // Attendance stats
        const daysWorked    = thisMonthAttendance.filter(r => r.checkInTime).length;
        const lateCount     = thisMonthAttendance.filter(r => (r.lateMinutes || 0) > 0).length;
        const earlyOutCount = thisMonthAttendance.filter(r => (r.earlyLeaveMinutes || 0) > 0).length;

        // Break time
        let breakMinutesToday = 0;
        if (todayAttendance) {
            if (todayAttendance.breakDurationMin) {
                breakMinutesToday = todayAttendance.breakDurationMin;
            } else if (todayAttendance.breakStartTime) {
                const end = todayAttendance.breakEndTime || now;
                breakMinutesToday = Math.floor((end.getTime() - todayAttendance.breakStartTime.getTime()) / 60000);
            }
        }

        // Performance score
        let approvedLeaveDays = 0;
        approvedLeavesInPeriod.forEach(l => {
            const lStart = l.startDate < payrollStart ? payrollStart : l.startDate;
            const lEnd = l.endDate > periodEndUpToToday ? periodEndUpToToday : l.endDate;
            const ms = lEnd.getTime() - lStart.getTime();
            if (ms >= 0) {
               approvedLeaveDays += Math.round(ms / (1000 * 60 * 60 * 24)) + 1;
            }
        });

        const absentDays = Math.max(0, expectedDays - approvedLeaveDays - daysWorked);
        const performanceScore = Math.max(0, 100 - (lateCount * 2) - (earlyOutCount * 2) - (absentDays * 5));

        // Leave counts
        const leaveCount      = leaves.filter(l => l.type !== "OTHER").length;
        const permissionCount = leaves.filter(l => l.type === "OTHER").length;

        // Leave balance - create if not exists
        let finalLeaveBalance = leaveBalance;
        if (!finalLeaveBalance) {
            finalLeaveBalance = await prisma.leaveBalance.create({
                data: {
                    userId,
                    year: currentYear,
                    sickLeave: 30,
                    annualLeave: 6,
                    personalLeave: 3,
                },
            });
        }

        // Advance summary
        const advanceTotalAmount   = advances.reduce((s, a) => s + Number(a.amount), 0);
        const advancePendingAmount = advances
            .filter(a => a.status === "PENDING")
            .reduce((s, a) => s + Number(a.amount), 0);

        // Announcements - filter by department targeting
        const filteredAnnouncements = announcements
            .filter(a => {
                if (!a.targetDepartmentIds) return true;
                try {
                    const targetDepts: string[] = JSON.parse(a.targetDepartmentIds);
                    if (targetDepts.length === 0) return true;
                    return currentUser?.departmentId
                        ? targetDepts.includes(currentUser.departmentId)
                        : true;
                } catch {
                    return true;
                }
            })
            .map(a => ({
                id: a.id,
                title: a.title,
                content: a.content,
                isPinned: a.isPinned,
                createdAt: a.createdAt.toISOString(),
                author: { name: a.author.name, nickName: a.author.nickName },
                _count: a._count,
                reads: a.reads,
            }));

        // Calendar days
        const calendarDays = calAttendance.map(r => ({
            date: r.date.toISOString(),
            checkedIn: !!r.checkInTime,
            checkedOut: !!r.checkOutTime,
            isLate: (r.lateMinutes || 0) > 0,
            status: r.status,
        }));

        const response = NextResponse.json({
            daysWorked,
            lateCount,
            earlyOutCount,
            breakMinutesToday,
            performanceScore,
            leaveCount,
            permissionCount,
            leaveBalance: {
                sickLeave: finalLeaveBalance.sickLeave,
                usedSick: finalLeaveBalance.usedSick,
                annualLeave: finalLeaveBalance.annualLeave,
                usedAnnual: finalLeaveBalance.usedAnnual,
                personalLeave: finalLeaveBalance.personalLeave,
                usedPersonal: finalLeaveBalance.usedPersonal,
            },
            advanceSummary: {
                totalAmount: advanceTotalAmount,
                pendingAmount: advancePendingAmount,
            },
            announcements: filteredAnnouncements,
            calendarDays,
        });

        // Cache for 30s, serve stale for 60s while revalidating
        response.headers.set("Cache-Control", "private, s-maxage=30, stale-while-revalidate=60");
        return response;
    } catch (error) {
        console.error("Employee dashboard error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
