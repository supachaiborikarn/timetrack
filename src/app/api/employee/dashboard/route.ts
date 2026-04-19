import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";

/**
 * GET /api/employee/dashboard
 * Returns all data needed for the employee dashboard in a single request:
 *  - daysWorked, lateCount, earlyOutCount (this month)
 *  - leaveCount (approved leaves this year)
 *  - permissionCount (approved OTHER leaves this year, used as "permission")
 *  - advanceSummary (total & pending amounts this month)
 *  - announcements (latest 5)
 *  - calendar attendance data for the requested month
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
        
        const { getPayrollPeriod } = require("@/lib/date-utils");
        const { startDate: payrollStart, endDate: payrollEnd } = getPayrollPeriod(calDate, isFrontYard);

        // 1. Attendance records for this payroll period (daysWorked, lateCount, earlyOutCount)
        const thisMonthAttendance = await prisma.attendance.findMany({
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
        });

        const daysWorked   = thisMonthAttendance.filter(r => r.checkInTime).length;
        const lateCount    = thisMonthAttendance.filter(r => (r.lateMinutes || 0) > 0).length;
        const earlyOutCount = thisMonthAttendance.filter(r => (r.earlyLeaveMinutes || 0) > 0).length;

        // 2. Leave counts this year
        const leaves = await prisma.leave.findMany({
            where: {
                userId,
                status: "APPROVED",
                startDate: { gte: yearStart, lte: yearEnd },
            },
            select: { type: true },
        });

        const leaveCount      = leaves.filter(l => l.type !== "OTHER").length;
        const permissionCount = leaves.filter(l => l.type === "OTHER").length;

        // 3. Leave balance
        const currentYear = now.getFullYear();
        let leaveBalance = await prisma.leaveBalance.findUnique({
            where: { userId_year: { userId, year: currentYear } },
        });

        if (!leaveBalance) {
            leaveBalance = await prisma.leaveBalance.create({
                data: {
                    userId,
                    year: currentYear,
                    sickLeave: 30,
                    annualLeave: 6,
                    personalLeave: 3,
                },
            });
        }

        // 4. Advance summary this month (match payroll period year/month visually)
        const advances = await prisma.advance.findMany({
            where: {
                userId,
                month: calDate.getMonth() + 1,
                year: calDate.getFullYear(),
            },
            select: { amount: true, status: true },
        });

        const advanceTotalAmount   = advances.reduce((s, a) => s + Number(a.amount), 0);
        const advancePendingAmount = advances
            .filter(a => a.status === "PENDING")
            .reduce((s, a) => s + Number(a.amount), 0);

        // 5. Announcements (latest 5, with read tracking)
        const announcements = await prisma.announcement.findMany({
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
        });

        // Filter by department targeting
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

        // 6. Calendar attendance data for the requested month
        const calAttendance = await prisma.attendance.findMany({
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
        });

        const calendarDays = calAttendance.map(r => ({
            date: r.date.toISOString(),
            checkedIn: !!r.checkInTime,
            checkedOut: !!r.checkOutTime,
            isLate: (r.lateMinutes || 0) > 0,
            status: r.status,
        }));

        return NextResponse.json({
            daysWorked,
            lateCount,
            earlyOutCount,
            leaveCount,
            permissionCount,
            leaveBalance: {
                sickLeave: leaveBalance.sickLeave,
                usedSick: leaveBalance.usedSick,
                annualLeave: leaveBalance.annualLeave,
                usedAnnual: leaveBalance.usedAnnual,
                personalLeave: leaveBalance.personalLeave,
                usedPersonal: leaveBalance.usedPersonal,
            },
            advanceSummary: {
                totalAmount: advanceTotalAmount,
                pendingAmount: advancePendingAmount,
            },
            announcements: filteredAnnouncements,
            calendarDays,
        });
    } catch (error) {
        console.error("Employee dashboard error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
