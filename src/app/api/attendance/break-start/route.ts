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
        const today = startOfDayBangkok();

        // Find today's attendance
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: today,
            },
        });

        if (!attendance) {
            return NextResponse.json(
                { error: "กรุณาเช็คอินก่อนพักเบรก" },
                { status: 400 }
            );
        }

        if (attendance.checkOutTime) {
            return NextResponse.json(
                { error: "คุณเช็คเอาต์ไปแล้ว ไม่สามารถพักเบรกได้" },
                { status: 400 }
            );
        }

        if (attendance.breakStartTime) {
            return NextResponse.json(
                { error: "คุณได้เริ่มพักเบรกไปแล้ว" },
                { status: 400 }
            );
        }

        // Update break start time - use actual UTC time for database
        const actualNow = new Date();
        await prisma.attendance.update({
            where: { id: attendance.id },
            data: {
                breakStartTime: actualNow,
            },
        });

        return NextResponse.json({ success: true, breakStartTime: actualNow });

    } catch (error) {
        console.error("Break start error:", error);
        return NextResponse.json(
            { error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
            { status: 500 }
        );
    }
}
