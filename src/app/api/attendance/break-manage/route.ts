import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBangkokNow, startOfDay } from "@/lib/date-utils";

// POST: Supervisor starts or ends break for an employee
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only ADMIN, HR, MANAGER, CASHIER can manage breaks
        const allowedRoles = ["ADMIN", "HR", "MANAGER", "CASHIER"];
        if (!allowedRoles.includes(session.user.role)) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
        }

        const body = await request.json();
        const { employeeId, action } = body; // action: 'start' or 'end'

        if (!employeeId || !action) {
            return NextResponse.json({ error: "Missing employeeId or action" }, { status: 400 });
        }

        const now = getBangkokNow();
        const today = startOfDay(now);

        // Find employee's attendance for today
        const attendanceRaw = await prisma.attendance.findFirst({
            where: {
                userId: employeeId,
                date: today,
            },
            include: { user: true }
        });
        const attendance = attendanceRaw as any;

        if (!attendance) {
            return NextResponse.json({ error: "พนักงานยังไม่ได้เช็คอินวันนี้" }, { status: 400 });
        }

        if (attendance.checkOutTime) {
            return NextResponse.json({ error: "พนักงานเช็คเอาต์ไปแล้ว" }, { status: 400 });
        }

        if (action === 'start') {
            if (attendance.breakStartTime) {
                return NextResponse.json({ error: "พนักงานเริ่มพักไปแล้ว" }, { status: 400 });
            }

            await prisma.attendance.update({
                where: { id: attendance.id },
                data: { breakStartTime: now },
            });

            return NextResponse.json({
                success: true,
                message: `เริ่มพักให้ ${attendance.user.name} เรียบร้อย`,
                breakStartTime: now
            });

        } else if (action === 'end') {
            if (!attendance.breakStartTime) {
                return NextResponse.json({ error: "พนักงานยังไม่ได้เริ่มพัก" }, { status: 400 });
            }

            if (attendance.breakEndTime) {
                return NextResponse.json({ error: "พนักงานจบพักไปแล้ว" }, { status: 400 });
            }

            const breakStart = new Date(attendance.breakStartTime);
            const breakEnd = new Date(now);
            const durationMin = Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60));

            let penaltyAmount = 0;
            const ALLOWED_BREAK_MINS = 90;
            const GRACE_PERIOD_MINS = 5;

            if (durationMin > (ALLOWED_BREAK_MINS + GRACE_PERIOD_MINS)) {
                penaltyAmount = Number(attendance.user.hourlyRate) * 1;
            }

            await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    breakEndTime: now,
                    breakDurationMin: durationMin,
                    breakPenaltyAmount: penaltyAmount,
                },
            });

            return NextResponse.json({
                success: true,
                message: `จบพักให้ ${attendance.user.name} เรียบร้อย`,
                breakEndTime: now,
                durationMin,
                penaltyAmount
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Supervisor break management error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด กรุณาลองใหม่" }, { status: 500 });
    }
}
