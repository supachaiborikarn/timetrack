import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await prisma.timeCorrection.findMany({
            where: { userId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                date: r.date.toISOString(),
                requestType: r.requestType,
                requestedTime: r.requestedTime.toISOString(),
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching time corrections:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { date, requestType, requestedTime, reason } = body;

        if (!date || !requestType || !requestedTime || !reason) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        // Get original attendance for that date
        const attendance = await prisma.attendance.findFirst({
            where: {
                userId: session.user.id,
                date: new Date(date),
            },
        });

        // Create time correction request
        const correction = await prisma.timeCorrection.create({
            data: {
                userId: session.user.id,
                date: new Date(date),
                requestType,
                requestedTime: new Date(requestedTime),
                reason,
                originalCheckIn: attendance?.checkInTime,
                originalCheckOut: attendance?.checkOutTime,
            },
        });

        return NextResponse.json({ success: true, id: correction.id });
    } catch (error) {
        console.error("Error creating time correction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
