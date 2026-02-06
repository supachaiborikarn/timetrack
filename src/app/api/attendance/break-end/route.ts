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

        let penaltyAmount = 0;
        const ALLOWED_BREAK_MINS = 90;
        const GRACE_PERIOD_MINS = 5;

        // Penalty Logic: > 95 mins late -> deduct 1 hour wage
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
            penaltyAmount
        });

    } catch (error) {
        console.error("Break end error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
