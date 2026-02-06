import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBangkokNow, startOfDayBangkok } from "@/lib/date-utils";

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = getBangkokNow();
        const today = startOfDayBangkok(now);

        // Find today's attendance
        const attendance = await prisma.attendance.findFirst({
            where: { userId: session.user.id, date: today },
            include: { user: true }
        });

        if (!attendance) {
            return NextResponse.json({ error: "ไม่พบข้อมูลการลงเวลา" }, { status: 404 });
        }

        if (!attendance.breakStartTime) {
            return NextResponse.json({ error: "คุณยังไม่ได้เริ่มพักเบรก" }, { status: 400 });
        }

        if (attendance.breakEndTime) {
            return NextResponse.json({ error: "คุณจบการพักเบรกไปแล้ว" }, { status: 400 });
        }

        const breakStart = new Date(attendance.breakStartTime);
        const actualNow = new Date(); // Use actual UTC time
        const durationMin = Math.floor((actualNow.getTime() - breakStart.getTime()) / (1000 * 60));

        // Check for Station-specific override
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: { station: true }
        });

        // Default global break duration
        let ALLOWED_BREAK_MINS = 90;

        // Custom logic for Supachai (SPC) -> 60 minutes
        if (user?.station?.code === "SPC") {
            ALLOWED_BREAK_MINS = 60;
        }
        // For others, we could respect shift config OR keep 90 as safety
        else {
            // Optional: if want to use DB shift config for others in future:
            const assignment = await prisma.shiftAssignment.findFirst({
                where: { userId: session.user.id, date: today },
                include: { shift: true }
            });
            // Only use DB value if it exists AND is explicitly intended (e.g. > 60)
            // For now, to be safe and match legacy behavior, we keep default 90 for non-SPC
            if (assignment?.shift?.breakMinutes && assignment.shift.breakMinutes > 90) {
                ALLOWED_BREAK_MINS = assignment.shift.breakMinutes;
            }
        }

        let penaltyAmount = 0;
        const GRACE_PERIOD_MINS = 5;

        // Penalty Logic
        if (durationMin > (ALLOWED_BREAK_MINS + GRACE_PERIOD_MINS)) {
            penaltyAmount = Number(attendance.user.hourlyRate) * 1;
        }

        await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                breakEndTime: actualNow,
                breakDurationMin: durationMin,
                breakPenaltyAmount: penaltyAmount,
            },
        });

        return NextResponse.json({
            success: true,
            breakEndTime: actualNow,
            durationMin,
            penaltyAmount,
            allowedDuration: ALLOWED_BREAK_MINS
        });

    } catch (error) {
        console.error("Break end error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
