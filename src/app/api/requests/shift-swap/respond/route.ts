import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Respond to a shift swap request (accept or reject)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { swapId, action } = body;

        if (!swapId || !["accept", "reject"].includes(action)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Find the swap request
        const swap = await prisma.shiftSwap.findUnique({
            where: { id: swapId },
        });

        if (!swap) {
            return NextResponse.json({ error: "ไม่พบคำขอแลกกะ" }, { status: 404 });
        }

        // Verify current user is the target
        if (swap.targetId !== session.user.id) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดำเนินการ" }, { status: 403 });
        }

        // Already processed
        if (swap.targetAccepted || swap.status !== "PENDING") {
            return NextResponse.json({ error: "คำขอนี้ถูกดำเนินการแล้ว" }, { status: 400 });
        }

        if (action === "reject") {
            // Reject the swap
            await prisma.shiftSwap.update({
                where: { id: swapId },
                data: { status: "REJECTED" },
            });

            return NextResponse.json({ success: true, message: "ปฏิเสธคำขอแลกกะแล้ว" });
        }

        // Accept the swap - now waiting for manager approval
        await prisma.shiftSwap.update({
            where: { id: swapId },
            data: { targetAccepted: true },
        });

        return NextResponse.json({
            success: true,
            message: "ยืนยันแลกกะแล้ว รอผู้จัดการอนุมัติ"
        });
    } catch (error) {
        console.error("Error responding to swap:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
