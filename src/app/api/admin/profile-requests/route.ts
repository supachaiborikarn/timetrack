import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET: Admin fetches all pending profile edit requests
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "PENDING";

        const requests = await prisma.profileEditRequest.findMany({
            where: { status },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeId: true,
                        nickName: true,
                        station: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({ requests });

    } catch (error) {
        console.error("Get profile requests error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}

// PUT: Admin approves or rejects a request
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { requestId, action, rejectReason } = body; // action: 'approve' or 'reject'

        if (!requestId || !action) {
            return NextResponse.json({ error: "Missing requestId or action" }, { status: 400 });
        }

        const editRequest = await prisma.profileEditRequest.findUnique({
            where: { id: requestId },
        });

        if (!editRequest) {
            return NextResponse.json({ error: "ไม่พบคำขอ" }, { status: 404 });
        }

        if (editRequest.status !== "PENDING") {
            return NextResponse.json({ error: "คำขอนี้ได้รับการดำเนินการแล้ว" }, { status: 400 });
        }

        if (action === "approve") {
            // Update the user's field with new value
            await prisma.user.update({
                where: { id: editRequest.userId },
                data: { [editRequest.fieldName]: editRequest.newValue },
            });

            // Mark request as approved
            await prisma.profileEditRequest.update({
                where: { id: requestId },
                data: {
                    status: "APPROVED",
                    reviewedAt: new Date(),
                    reviewedBy: session.user.id,
                },
            });

            return NextResponse.json({
                success: true,
                message: `อนุมัติการแก้ไข${editRequest.fieldLabel}เรียบร้อย`,
            });

        } else if (action === "reject") {
            // Mark request as rejected
            await prisma.profileEditRequest.update({
                where: { id: requestId },
                data: {
                    status: "REJECTED",
                    reviewedAt: new Date(),
                    reviewedBy: session.user.id,
                    rejectReason: rejectReason || null,
                },
            });

            return NextResponse.json({
                success: true,
                message: `ปฏิเสธการแก้ไข${editRequest.fieldLabel}`,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });

    } catch (error) {
        console.error("Process profile request error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
