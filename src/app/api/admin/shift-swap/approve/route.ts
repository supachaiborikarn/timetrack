import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Approve or reject a shift swap (manager action)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Only managers, HR, and admins can approve
        if (!["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { swapId, action } = body;

        if (!swapId || !["approve", "reject"].includes(action)) {
            return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }

        // Find the swap request
        const swap = await prisma.shiftSwap.findUnique({
            where: { id: swapId },
            include: {
                requester: { select: { name: true } },
                target: { select: { name: true } },
            },
        });

        if (!swap) {
            return NextResponse.json({ error: "ไม่พบคำขอแลกกะ" }, { status: 404 });
        }

        // Must be accepted by target first
        if (!swap.targetAccepted) {
            return NextResponse.json({ error: "ผู้รับยังไม่ยืนยัน" }, { status: 400 });
        }

        // Already processed
        if (swap.status !== "PENDING") {
            return NextResponse.json({ error: "คำขอนี้ถูกดำเนินการแล้ว" }, { status: 400 });
        }

        if (action === "reject") {
            await prisma.shiftSwap.update({
                where: { id: swapId },
                data: {
                    status: "REJECTED",
                    approvedBy: session.user.id,
                    approvedAt: new Date(),
                },
            });

            return NextResponse.json({ success: true, message: "ปฏิเสธคำขอแลกกะแล้ว" });
        }

        // Approve - swap the shift assignments
        const requesterDateStr = swap.requesterDate.toISOString().split("T")[0];
        const targetDateStr = swap.targetDate.toISOString().split("T")[0];

        // Find existing assignments
        const [requesterAssignment, targetAssignment] = await Promise.all([
            prisma.shiftAssignment.findFirst({
                where: {
                    userId: swap.requesterId,
                    date: new Date(requesterDateStr),
                },
            }),
            prisma.shiftAssignment.findFirst({
                where: {
                    userId: swap.targetId,
                    date: new Date(targetDateStr),
                },
            }),
        ]);

        // Perform the swap using transaction
        await prisma.$transaction(async (tx) => {
            // Swap requester's shift to target's date
            if (requesterAssignment) {
                await tx.shiftAssignment.update({
                    where: { id: requesterAssignment.id },
                    data: {
                        userId: swap.targetId,
                        date: new Date(targetDateStr),
                    },
                });
            }

            // Swap target's shift to requester's date
            if (targetAssignment) {
                await tx.shiftAssignment.update({
                    where: { id: targetAssignment.id },
                    data: {
                        userId: swap.requesterId,
                        date: new Date(requesterDateStr),
                    },
                });
            }

            // Update swap status
            await tx.shiftSwap.update({
                where: { id: swapId },
                data: {
                    status: "APPROVED",
                    approvedBy: session.user.id,
                    approvedAt: new Date(),
                },
            });
        });

        return NextResponse.json({
            success: true,
            message: `อนุมัติแลกกะเรียบร้อย: ${swap.requester.name} ↔ ${swap.target.name}`
        });
    } catch (error) {
        console.error("Error approving swap:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}

// GET: List pending swaps for manager approval
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const pendingSwaps = await prisma.shiftSwap.findMany({
            where: {
                status: "PENDING",
                targetAccepted: true,
            },
            include: {
                requester: {
                    select: { name: true, nickName: true, employeeId: true, department: true }
                },
                target: {
                    select: { name: true, nickName: true, employeeId: true, department: true }
                },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ swaps: pendingSwaps });
    } catch (error) {
        console.error("Error fetching pending swaps:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
