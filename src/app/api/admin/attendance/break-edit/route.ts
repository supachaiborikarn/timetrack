import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PUT: Edit break times for an attendance record
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only admin/hr/manager can edit break times
        if (!["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { attendanceId, breakStartTime, breakEndTime } = body;

        if (!attendanceId) {
            return NextResponse.json({ error: "Missing attendanceId" }, { status: 400 });
        }

        // Find the attendance record
        const attendance = await prisma.attendance.findUnique({
            where: { id: attendanceId },
            include: { user: true }
        });

        if (!attendance) {
            return NextResponse.json({ error: "ไม่พบข้อมูลการลงเวลา" }, { status: 404 });
        }

        // Parse the new times
        let newBreakStartTime: Date | null = null;
        let newBreakEndTime: Date | null = null;
        let breakDurationMin: number | null = null;
        let breakPenaltyAmount = 0;

        if (breakStartTime) {
            newBreakStartTime = new Date(breakStartTime);
        }

        if (breakEndTime) {
            newBreakEndTime = new Date(breakEndTime);
        }

        // Calculate duration if both times are present
        if (newBreakStartTime && newBreakEndTime) {
            breakDurationMin = Math.floor(
                (newBreakEndTime.getTime() - newBreakStartTime.getTime()) / (1000 * 60)
            );

            // Get station-specific break allowance
            const user = await prisma.user.findUnique({
                where: { id: attendance.userId },
                include: { station: true }
            });

            let ALLOWED_BREAK_MINS = 90;
            if (user?.station?.code === "SPC") {
                ALLOWED_BREAK_MINS = 60;
            }

            const GRACE_PERIOD_MINS = 5;

            // Calculate penalty
            if (breakDurationMin > (ALLOWED_BREAK_MINS + GRACE_PERIOD_MINS)) {
                breakPenaltyAmount = Number(attendance.user.hourlyRate) * 1;
            }
        }

        // Update the attendance record
        const updated = await prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                breakStartTime: newBreakStartTime,
                breakEndTime: newBreakEndTime,
                breakDurationMin,
                breakPenaltyAmount,
            },
            include: { user: true }
        });

        return NextResponse.json({
            success: true,
            message: `อัปเดตเวลาพักของ ${updated.user.name} เรียบร้อย`,
            attendance: {
                id: updated.id,
                breakStartTime: updated.breakStartTime,
                breakEndTime: updated.breakEndTime,
                breakDurationMin: updated.breakDurationMin,
                breakPenaltyAmount: updated.breakPenaltyAmount,
            }
        });

    } catch (error) {
        console.error("Break edit error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
    }
}
