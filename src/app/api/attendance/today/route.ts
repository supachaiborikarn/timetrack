import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { startOfDayBangkok, getBangkokNow, addDays } from "@/lib/date-utils";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return ApiErrors.unauthorized();
        }

        const now = getBangkokNow();
        const today = startOfDayBangkok(now);

        // Debug logging for production
        console.log('[today API] Debug:', {
            userId: session.user.id,
            nowUTC: new Date().toISOString(),
            bangkokNow: now.toISOString(),
            todayQuery: today.toISOString(),
        });

        // Get user with station and department
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        // Get today's attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        // More debug logging
        console.log('[today API] Attendance query result:', {
            found: !!attendance,
            attendanceId: attendance?.id,
            attendanceDate: attendance?.date?.toISOString(),
            checkIn: attendance?.checkInTime?.toISOString(),
        });

        // Get today's shift assignment
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
            include: { shift: true },
        });

        // Get tomorrow's shift assignment
        const tomorrow = startOfDayBangkok(addDays(now, 1));

        const tomorrowShiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: tomorrow,
            },
            include: { shift: true },
        });

        return successResponse({
            attendance: attendance
                ? {
                    checkInTime: attendance.checkInTime?.toISOString() || null,
                    checkOutTime: attendance.checkOutTime?.toISOString() || null,
                    lateMinutes: attendance.lateMinutes,
                    latePenaltyAmount: Number(attendance.latePenaltyAmount || 0),
                    status: attendance.status,
                    breakStartTime: attendance.breakStartTime?.toISOString() || null,
                    breakEndTime: attendance.breakEndTime?.toISOString() || null,
                    breakDurationMin: attendance.breakDurationMin,
                    breakPenaltyAmount: Number(attendance.breakPenaltyAmount),
                }
                : null,
            shift: shiftAssignment?.shift
                ? {
                    name: shiftAssignment.shift.name,
                    startTime: shiftAssignment.shift.startTime,
                    endTime: shiftAssignment.shift.endTime,
                    breakMinutes: shiftAssignment.shift.breakMinutes,
                }
                : null,
            tomorrowShift: tomorrowShiftAssignment?.shift
                ? {
                    name: tomorrowShiftAssignment.shift.name,
                    startTime: tomorrowShiftAssignment.shift.startTime,
                    endTime: tomorrowShiftAssignment.shift.endTime,
                    breakMinutes: tomorrowShiftAssignment.shift.breakMinutes,
                }
                : null,
            user: user
                ? {
                    name: user.name,
                    station: user.station?.name || "ไม่ระบุ",
                    department: user.department?.name || "ไม่ระบุ",
                    hourlyRate: Number(user.hourlyRate),
                }
                : null,
        });
    } catch (error) {
        console.error("Error fetching today data:", error);
        return ApiErrors.internal();
    }
}
