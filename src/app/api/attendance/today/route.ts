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

        // Get today's attendance
        let attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        // Get today's shift assignment
        let shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
            include: { shift: true },
        });

        // Night shift cross-midnight support:
        // If no attendance found today and it's before 10:00 AM Bangkok time,
        // check if there's an open night shift from yesterday
        const bangkokHour = getBangkokHour();
        if (!attendance && bangkokHour < 10) {
            const yesterday = startOfDayBangkok(subDays(new Date(), 1));
            const yesterdayShiftAssignment = await prisma.shiftAssignment.findFirst({
                where: {
                    userId: session.user.id,
                    date: yesterday,
                },
                include: { shift: true },
            });

            if (yesterdayShiftAssignment?.shift.isNightShift) {
                const yesterdayAttendance = await prisma.attendance.findFirst({
                    where: {
                        userId: session.user.id,
                        date: yesterday,
                    },
                });

                // If checked in yesterday but not checked out, use yesterday's data
                if (yesterdayAttendance?.checkInTime && !yesterdayAttendance?.checkOutTime) {
                    attendance = yesterdayAttendance;
                    shiftAssignment = yesterdayShiftAssignment;
                }
            }
        }

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
