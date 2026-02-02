import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await prisma.shiftSwap.findMany({
            where: { requesterId: session.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
                target: { select: { name: true } },
            },
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                requesterDate: r.requesterDate.toISOString(),
                targetDate: r.targetDate.toISOString(),
                reason: r.reason,
                status: r.status,
                targetAccepted: r.targetAccepted,
                target: { name: r.target.name },
                createdAt: r.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error("Error fetching shift swaps:", error);
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
        const { requesterDate, targetId, targetDate, reason } = body;

        if (!requesterDate || !targetId || !targetDate) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        // Check target exists and is in same station
        const requester = await prisma.user.findUnique({
            where: { id: session.user.id },
        });

        const target = await prisma.user.findUnique({
            where: { id: targetId },
        });

        if (!target || target.stationId !== requester?.stationId) {
            return NextResponse.json(
                { error: "ไม่พบเพื่อนร่วมงานหรืออยู่คนละสถานี" },
                { status: 400 }
            );
        }

        // Create shift swap request
        const swap = await prisma.shiftSwap.create({
            data: {
                requesterId: session.user.id,
                targetId,
                requesterDate: new Date(requesterDate),
                targetDate: new Date(targetDate),
                reason: reason || null,
            },
        });

        return NextResponse.json({ success: true, id: swap.id });
    } catch (error) {
        console.error("Error creating shift swap:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
