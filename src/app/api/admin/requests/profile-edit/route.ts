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

// Approve/reject profile edit request
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, status, rejectReason } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "id and status are required" }, { status: 400 });
        }

        // 1. Get the request
        const editRequest = await prisma.profileEditRequest.findUnique({
            where: { id },
        });

        if (!editRequest) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        if (editRequest.status !== "PENDING") {
            return NextResponse.json({ error: "Request already processed" }, { status: 400 });
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
            where: { id },
            data: {
                status,
                reviewedBy: session.user.id,
                reviewedAt: new Date(),
                rejectReason: status === "REJECTED" ? rejectReason : null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating profile edit request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
