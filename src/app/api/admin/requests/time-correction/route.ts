import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDayBangkok } from "@/lib/date-utils";

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

// Approve/reject time correction (Bulk support)
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
                // Update time correction
                const updated = await prisma.timeCorrection.update({
                    where: { id: targetId },
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

                    // Normalize date to match Attendance table convention (Bangkok Midnight)
                    // TimeCorrection uses UTC Midnight (00:00Z), while Attendance uses Bangkok Midnight (17:00Z prev day)
                    // startOfDayBangkok handles this conversion correctly
                    const attendanceDate = startOfDayBangkok(updated.date);

                    await prisma.attendance.upsert({
                        where: {
                            userId_date: {
                                userId: updated.userId,
                                date: attendanceDate,
                            },
                        },
                        create: {
                            userId: updated.userId,
                            date: attendanceDate,
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
                successCount++;
            } catch (error) {
                console.error(`Error processing time correction ${targetId}:`, error);
                failCount++;
            }
        }

        if (successCount === 0 && failCount > 0) {
            return NextResponse.json({ error: "Failed to process requests" }, { status: 500 });
        }

        return NextResponse.json({ success: true, processed: successCount, failed: failCount });
    } catch (error) {
        console.error("Error updating time correction:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
