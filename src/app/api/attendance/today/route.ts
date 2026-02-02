import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, getBangkokNow } from "@/lib/date-utils";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const now = getBangkokNow();
        const today = startOfDay(now);

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

        // Get today's shift assignment
        const shiftAssignment = await prisma.shiftAssignment.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
            include: { shift: true },
        });

        return NextResponse.json({
            attendance: attendance
                ? {
                    checkInTime: attendance.checkInTime?.toISOString() || null,
                    checkOutTime: attendance.checkOutTime?.toISOString() || null,
                    lateMinutes: attendance.lateMinutes,
                    status: attendance.status,
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
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
