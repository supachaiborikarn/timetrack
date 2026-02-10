import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get pending wage requests (Salary Advances)
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Build where clause - only PENDING
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            status: "PENDING"
        };

        // MANAGER/CASHIER can only see their station's employees
        // Note: Relation might be user.stationId or user.registeredStationId depending on business logic
        // For advances, usually it's about paying so registeredStationId might be more relevant, 
        // but let's stick to standard visibility rules if any.
        // For now, let's allow them to see all pending if they have access to this page, 
        // or filter by user.stationId if strict.
        if (["MANAGER", "CASHIER"].includes(session.user.role) && session.user.stationId) {
            where.user = { stationId: session.user.stationId };
        }

        const requests = await prisma.advance.findMany({
            where,
            include: {
                user: { select: { name: true, employeeId: true, registeredStationId: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                amount: Number(r.amount),
                reason: r.reason || "-",
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                user: { name: r.user.name, employeeId: r.user.employeeId },
            })),
        });
    } catch (error) {
        console.error("Error fetching wage requests:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Approve/reject wage request
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "id and status are required" }, { status: 400 });
        }

        // Prepare update data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            status,
        };

        if (status === "APPROVED") {
            updateData.approvedBy = session.user.id;
            updateData.approvedAt = new Date();
        }

        const updated = await prisma.advance.update({
            where: { id },
            data: updateData,
            include: { user: true },
        });

        return NextResponse.json({ success: true, request: updated });
    } catch (error) {
        console.error("Error updating wage request:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
