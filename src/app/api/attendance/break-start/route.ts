import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
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
        });

        if (!attendance) {
            return NextResponse.json(
                { error: "กรุณาเช็คอินก่อนพักเบรก" },
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
