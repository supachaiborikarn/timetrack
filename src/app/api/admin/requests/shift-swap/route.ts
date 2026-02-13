import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get pending shift swap requests (for managers/admin)
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Build where clause
        const where: Record<string, unknown> = {};

        // Manager can only see their station
        if (session.user.role === "MANAGER" && session.user.stationId) {
            where.requester = { stationId: session.user.stationId };
        }

        const requests = await prisma.shiftSwap.findMany({
            where,
            include: {
                requester: { select: { name: true, employeeId: true } },
                target: { select: { name: true, employeeId: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                requesterDate: r.requesterDate.toISOString(),
                targetDate: r.targetDate.toISOString(),
                reason: r.reason,
                status: r.status,
                targetAccepted: r.targetAccepted,
                createdAt: r.createdAt.toISOString(),
                requester: { name: r.requester.name, employeeId: r.requester.employeeId },
                target: { name: r.target.name, employeeId: r.target.employeeId },
            })),
        });
    } catch (error) {
        console.error("Error fetching shift swaps:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Approve/reject shift swap (Bulk support)
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, ids, status } = body;

        const targetIds = ids || (id ? [id] : []);

        if (targetIds.length === 0 || !status) {
            return NextResponse.json({ error: "ids (or id) and status are required" }, { status: 400 });
        }

        let successCount = 0;
        let failCount = 0;

        for (const targetId of targetIds) {
            try {
                // Get the swap request
                const swap = await prisma.shiftSwap.findUnique({ where: { id: targetId } });
                if (!swap) {
                    console.warn(`Shift swap ${targetId} not found`);
                    failCount++;
                    continue;
                }

                // Update shift swap status
                await prisma.shiftSwap.update({
                    where: { id: targetId },
                    data: {
                        status,
                        approvedBy: session.user.id,
                        approvedAt: new Date(),
                    },
                });

                // If approved, swap the shift assignments
                if (status === "APPROVED") {
                    // Get current assignments
                    const requesterAssignment = await prisma.shiftAssignment.findFirst({
                        where: { userId: swap.requesterId, date: swap.requesterDate },
                    });
                    const targetAssignment = await prisma.shiftAssignment.findFirst({
                        where: { userId: swap.targetId, date: swap.targetDate },
                    });

                    if (requesterAssignment && targetAssignment) {
                        // Swap the shift IDs
                        await prisma.$transaction([
                            prisma.shiftAssignment.update({
                                where: { id: requesterAssignment.id },
                                data: { shiftId: targetAssignment.shiftId },
                            }),
                            prisma.shiftAssignment.update({
                                where: { id: targetAssignment.id },
                                data: { shiftId: requesterAssignment.shiftId },
                            }),
                        ]);
                    }
                }
                successCount++;
            } catch (error) {
                console.error(`Error processing shift swap ${targetId}:`, error);
                failCount++;
            }
        }

        if (successCount === 0 && failCount > 0) {
            return NextResponse.json({ error: "Failed to process requests" }, { status: 500 });
        }

        return NextResponse.json({ success: true, processed: successCount, failed: failCount });
    } catch (error) {
        console.error("Error updating shift swap:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
