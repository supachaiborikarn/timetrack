import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";
import { startOfDayBangkok, getBangkokNow, getBangkokHour, addDays, subDays } from "@/lib/date-utils";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return ApiErrors.unauthorized();
        }

        const now = getBangkokNow();
        const today = startOfDayBangkok(); // No arg = uses new Date() internally, avoids double +7h offset

        // Get user with station and department
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                station: { select: { name: true } },
                department: { select: { name: true } },
            },
        });

        // CRITICAL FIX: improved logic to find relevant attendance
        // 1. Try to find attendance for 'today' (strict date match)
        let attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        // 2. If not found, check for ANY active attendance (not checked out)
        // This handles night shifts, late checkouts, and date boundary issues
        if (!attendance) {
            const activeAttendance = await prisma.attendance.findFirst({
                where: {
                    userId: session.user.id,
                    checkOutTime: null,
                },
                orderBy: { checkInTime: "desc" },
            });

            if (activeAttendance) {
                attendance = activeAttendance;
            }
        }

        // Determine which date to use for Shift Assignment lookup
        // If we found an attendance, use its date. Otherwise use today.
        const queryDate = attendance ? attendance.date : today;

        // Get shift assignment for the determined date
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: queryDate,
            },
            include: { shift: true },
        });

        // Get tomorrow's shift assignment
        const tomorrow = startOfDayBangkok(addDays(new Date(), 1));

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
