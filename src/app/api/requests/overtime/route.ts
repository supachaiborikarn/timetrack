import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List overtime requests
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");
        const userId = searchParams.get("userId");

        // Build where clause based on role
        const where: Record<string, unknown> = {};

        if (["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            // Admin can see all or filter by userId
            if (userId) where.userId = userId;
        } else {
            // Regular employee sees only their own
            where.userId = session.user.id;
        }

        if (status) where.status = status;

        const requests = await prisma.overtimeRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        name: true,
                        employeeId: true,
                        nickName: true,
                    },
                },
            },
        });

        return NextResponse.json({ requests });
    } catch (error) {
        console.error("Get OT requests error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new OT request
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { date, hours, reason } = await request.json();

        if (!date || !hours || !reason) {
            return NextResponse.json({ error: "Date, hours, and reason required" }, { status: 400 });
        }

        const otRequest = await prisma.overtimeRequest.create({
            data: {
                userId: session.user.id,
                date: new Date(date),
                hours,
                reason,
            },
        });

        return NextResponse.json({ request: otRequest }, { status: 201 });
    } catch (error) {
        console.error("Create OT request error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Approve/Reject OT request
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { id, action, rejectReason } = await request.json();

        if (!id || !action) {
            return NextResponse.json({ error: "ID and action required" }, { status: 400 });
        }

        const data: Record<string, unknown> = {
            approvedById: session.user.id,
            approvedAt: new Date(),
        };

        if (action === "approve") {
            data.status = "APPROVED";
        } else if (action === "reject") {
            data.status = "REJECTED";
            data.rejectReason = rejectReason || "";
        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        const updated = await prisma.overtimeRequest.update({
            where: { id },
            data,
        });

        return NextResponse.json({ request: updated });
    } catch (error) {
        console.error("Update OT request error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
