import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get pending profile edit requests (for admin/hr)
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const requests = await prisma.profileEditRequest.findMany({
            where: { status: "PENDING" },
            include: {
                user: { select: { name: true, employeeId: true, nickName: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                userId: r.userId,
                fieldName: r.fieldName,
                fieldLabel: r.fieldLabel,
                oldValue: r.oldValue,
                newValue: r.newValue,
                status: r.status,
                createdAt: r.createdAt,
                user: r.user,
            })),
        });
    } catch (error) {
        console.error("Error fetching profile edit requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Approve/reject profile edit request (Bulk support)
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, ids, status, rejectReason } = body;

        const targetIds = ids || (id ? [id] : []);

        if (targetIds.length === 0 || !status) {
            return NextResponse.json({ error: "ids (or id) and status are required" }, { status: 400 });
        }

        let successCount = 0;
        let failCount = 0;

        for (const targetId of targetIds) {
            try {
                // 1. Get the request
                const editRequest = await prisma.profileEditRequest.findUnique({
                    where: { id: targetId },
                });

                if (!editRequest) {
                    console.warn(`Profile edit request ${targetId} not found`);
                    failCount++;
                    continue;
                }

                if (editRequest.status !== "PENDING") {
                    console.warn(`Profile edit request ${targetId} already processed`);
                    failCount++;
                    continue;
                }

                // 2. If APPROVED, update the User profile
                if (status === "APPROVED") {
                    await prisma.user.update({
                        where: { id: editRequest.userId },
                        data: {
                            [editRequest.fieldName]: editRequest.newValue,
                        },
                    });
                }

                // 3. Update the request status
                await prisma.profileEditRequest.update({
                    where: { id: targetId },
                    data: {
                        status,
                        reviewedBy: session.user.id,
                        reviewedAt: new Date(),
                        rejectReason: status === "REJECTED" ? rejectReason : null,
                    },
                });

                successCount++;
            } catch (error) {
                console.error(`Error processing profile edit request ${targetId}:`, error);
                failCount++;
            }
        }

        if (successCount === 0 && failCount > 0) {
            return NextResponse.json({ error: "Failed to process requests" }, { status: 500 });
        }

        return NextResponse.json({ success: true, processed: successCount, failed: failCount });
    } catch (error) {
        console.error("Error updating profile edit request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
