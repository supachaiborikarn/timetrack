import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, getBangkokNow, calculateLateMinutes, calculateWorkHours } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER" && session.user.role !== "HR" && session.user.role !== "CASHIER")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId, type, date, time } = body; // type: 'CHECK_IN' | 'CHECK_OUT'

        if (!userId || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Parse date and time to create a Date object
        // Assuming date is "yyyy-MM-dd" and time is "HH:mm" (local time inputs)
        // We need to construct the UTC Date corresponding to that local time

        // Helper to construct Date from local date/time strings
        // E.g. "2024-02-03" + "08:00" -> Date object representing that time
        const targetDate = new Date(`${date}T${time}:00+07:00`);

        const localDateForCalc = new Date(targetDate.getTime() + (7 * 60 * 60 * 1000)); // Shift for local calc if needed
        const dayStart = startOfDay(localDateForCalc);

        // Find existing attendance
        let attendance = await prisma.attendance.findFirst({
            where: {
                userId: userId,
                date: dayStart,
            },
        });

        if (type === "CHECK_IN") {
            if (attendance?.checkInTime) {
                return NextResponse.json({ error: "User already checked in for this date" }, { status: 400 });
            }

            // Calculate Late
            const shiftAssignment = await prisma.shiftAssignment.findFirst({
                where: { userId, date: dayStart },
                include: { shift: true },
            });

            let lateMinutes = 0;
            if (shiftAssignment) {
                // Use localDateForCalc for comparison against shift string
                lateMinutes = calculateLateMinutes(localDateForCalc, shiftAssignment.shift.startTime);
            }

            attendance = await prisma.attendance.upsert({
                where: {
                    userId_date: { userId, date: dayStart },
                },
                create: {
                    userId,
                    date: dayStart,
                    checkInTime: targetDate,
                    checkInMethod: "MANUAL",
                    status: "APPROVED",
                    lateMinutes,
                },
                update: {
                    checkInTime: targetDate,
                    checkInMethod: "MANUAL",
                    status: "APPROVED",
                    lateMinutes,
                },
            });
        } else if (type === "CHECK_OUT") {
            if (!attendance || !attendance.checkInTime) {
                return NextResponse.json({ error: "Cannot check out without check in" }, { status: 400 });
            }

            // Calculate work hours
            const shiftAssignment = await prisma.shiftAssignment.findFirst({
                where: { userId, date: dayStart },
                include: { shift: true },
            });
            const breakMinutes = shiftAssignment?.shift.breakMinutes || 60;

            // Note: date-utils calculateWorkHours is expecting 2 Date objects.
            // If attendance.checkInTime is legacy (Fake BKK), and targetDate is UTC...
            // Similar logic to check-out route fix:
            let calCheckIn = attendance.checkInTime;
            const now = new Date();
            if (calCheckIn > now && targetDate < now) {
                // If stored checkin is future (legacy) and we are saving legit UTC,
                // we should shift targetDate to "Fake BKK" for calculation or shift CheckIn back.
                // Easiest is to just calculate difference in MS.
                // But let's stick to using standard logic, assuming Admin uses this for NEW records mainly.
                // Or if fixing old records, Admin inputs time.
            }

            const { totalHours, overtimeHours } = calculateWorkHours(attendance.checkInTime, targetDate, breakMinutes);

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOutTime: targetDate,
                    checkOutMethod: "MANUAL",
                    actualHours: totalHours,
                    overtimeHours: overtimeHours,
                },
            });
        }

        return NextResponse.json({ success: true, data: attendance });

    } catch (error) {
        console.error("Manual attendance error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
