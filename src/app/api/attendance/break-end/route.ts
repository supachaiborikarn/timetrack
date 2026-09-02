import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    calculateBreakPenaltyAmount,
    resolveAllowedBreakMinutes,
} from "@/lib/break-rules";

export async function POST() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find active attendance (not checked out) regardless of date
        // This handles night shifts correctly
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                checkOutTime: null,
                checkInTime: { not: null },
            },
            orderBy: { checkInTime: "desc" },
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

        const [user, assignment] = await Promise.all([
            prisma.user.findUnique({
                where: { id: session.user.id },
                include: { station: true },
            }),
            prisma.shiftAssignment.findFirst({
                where: { userId: session.user.id, date: attendance.date },
                include: { shift: true },
            }),
        ]);
        const allowedBreakMinutes = resolveAllowedBreakMinutes(
            user?.station?.code,
            assignment?.shift?.breakMinutes,
        );
        const penaltyAmount = calculateBreakPenaltyAmount({
            durationMinutes: durationMin,
            allowedMinutes: allowedBreakMinutes,
            hourlyRate: attendance.user.hourlyRate,
        });

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
            allowedDuration: allowedBreakMinutes
        });

    } catch (error) {
        console.error("Break end error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
