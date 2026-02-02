import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Get pending time correction requests (for managers/admin)
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Build where clause
        const where: Record<string, unknown> = {};

        // MANAGER/CASHIER can only see their station
        if (["MANAGER", "CASHIER"].includes(session.user.role) && session.user.stationId) {
            where.user = { stationId: session.user.stationId };
        }

        const requests = await prisma.timeCorrection.findMany({
            where,
            include: {
                user: { select: { name: true, employeeId: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({
            requests: requests.map((r) => ({
                id: r.id,
                date: r.date.toISOString(),
                requestType: r.requestType,
                requestedTime: r.requestedTime.toISOString(),
                reason: r.reason,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                user: { name: r.user.name, employeeId: r.user.employeeId },
            })),
        });
    } catch (error) {
        console.error("Error fetching time corrections:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// Approve/reject time correction
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, status } = body;

        if (!id || !status) {
            return NextResponse.json({ error: "id and status are required" }, { status: 400 });
        }

        // Update time correction
        const updated = await prisma.timeCorrection.update({
            where: { id },
            data: {
                status,
                approvedBy: session.user.id,
                approvedAt: new Date(),
            },
            include: { user: true },
        });

        // If approved, update the actual attendance record
        if (status === "APPROVED") {
            const attendanceData: Record<string, unknown> = {};

            if (updated.requestType === "CHECK_IN" || updated.requestType === "BOTH") {
                attendanceData.checkInTime = updated.requestedTime;
                attendanceData.lateMinutes = 0; // Reset late
                attendanceData.latePenaltyAmount = 0;
            }
            if (updated.requestType === "CHECK_OUT" || updated.requestType === "BOTH") {
                attendanceData.checkOutTime = updated.requestedTime;
            }

            await prisma.attendance.upsert({
                where: {
                    userId_date: {
                        userId: updated.userId,
                        date: updated.date,
                    },
                },
                create: {
                    userId: updated.userId,
                    date: updated.date,
                    checkInTime: updated.requestType !== "CHECK_OUT" ? updated.requestedTime : undefined,
                    checkOutTime: updated.requestType !== "CHECK_IN" ? updated.requestedTime : undefined,
                    status: "APPROVED",
                },
                update: {
                    ...attendanceData,
                    status: "APPROVED",
                    approvedBy: session.user.id,
                    approvedAt: new Date(),
                },
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating time correction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
