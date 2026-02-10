import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get pending wage requests (Salary Advances)
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");

        // Build where clause - only PENDING
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {
            status: "PENDING"
        };

        // MANAGER/CASHIER can only see their station's employees
        if (["MANAGER", "CASHIER"].includes(session.user.role) && session.user.stationId) {
            where.user = { stationId: session.user.stationId };
        }

        // Station filter from query params (overrides role-based filter for ADMIN/HR)
        if (stationId) {
            where.user = {
                ...(where.user || {}),
                registeredStationId: stationId,
            };
        }

        const requests = await prisma.advance.findMany({
            where,
            include: {
                user: {
                    select: {
                        name: true,
                        employeeId: true,
                        registeredStationId: true,
                        registeredStation: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        // Compute total amount
        const totalAmount = requests.reduce((sum, r) => sum + Number(r.amount), 0);

        // Get stations for filter dropdown
        const stations = await prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                amount: Number(r.amount),
                reason: r.reason || "-",
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                user: {
                    name: r.user.name,
                    employeeId: r.user.employeeId,
                    registeredStation: r.user.registeredStation,
                },
            })),
            stations,
            totalAmount,
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
