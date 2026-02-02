import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST: Bulk operations (assign, copy)
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { action, assignments, sourceWeek, targetWeek, stationId } = body;

        // Bulk assign shifts
        if (action === "assign" && assignments && Array.isArray(assignments)) {
            const results = await Promise.all(
                assignments.map(async (item: { userId: string; date: string; shiftId: string; isDayOff?: boolean }) => {
                    try {
                        const assignment = await prisma.shiftAssignment.upsert({
                            where: {
                                userId_date: {
                                    userId: item.userId,
                                    date: new Date(item.date),
                                },
                            },
                            create: {
                                userId: item.userId,
                                shiftId: item.shiftId,
                                date: new Date(item.date),
                                isDayOff: item.isDayOff || false,
                            },
                            update: {
                                shiftId: item.shiftId,
                                isDayOff: item.isDayOff || false,
                            },
                        });
                        return { success: true, id: assignment.id };
                    } catch (error) {
                        return { success: false, userId: item.userId, date: item.date, error };
                    }
                })
            );

            const successCount = results.filter((r) => r.success).length;
            return NextResponse.json({
                success: true,
                message: `บันทึก ${successCount} รายการสำเร็จ`,
                count: successCount,
            });
        }

        // Copy week to another week
        if (action === "copyWeek" && sourceWeek && targetWeek && stationId) {
            // Get employees of the station
            const employees = await prisma.user.findMany({
                where: { stationId, isActive: true },
                select: { id: true },
            });

            const employeeIds = employees.map((e) => e.id);

            // Get source week assignments
            const sourceStart = new Date(sourceWeek.start);
            const sourceEnd = new Date(sourceWeek.end);

            const sourceAssignments = await prisma.shiftAssignment.findMany({
                where: {
                    userId: { in: employeeIds },
                    date: { gte: sourceStart, lte: sourceEnd },
                },
            });

            // Calculate week difference
            const targetStart = new Date(targetWeek.start);
            const weekDiffMs = targetStart.getTime() - sourceStart.getTime();

            // Create target assignments
            const createdCount = await Promise.all(
                sourceAssignments.map(async (sa) => {
                    const newDate = new Date(sa.date.getTime() + weekDiffMs);
                    try {
                        await prisma.shiftAssignment.upsert({
                            where: {
                                userId_date: {
                                    userId: sa.userId,
                                    date: newDate,
                                },
                            },
                            create: {
                                userId: sa.userId,
                                shiftId: sa.shiftId,
                                date: newDate,
                                isDayOff: sa.isDayOff,
                            },
                            update: {
                                shiftId: sa.shiftId,
                                isDayOff: sa.isDayOff,
                            },
                        });
                        return true;
                    } catch {
                        return false;
                    }
                })
            );

            const successCount = createdCount.filter(Boolean).length;
            return NextResponse.json({
                success: true,
                message: `คัดลอก ${successCount} รายการสำเร็จ`,
                count: successCount,
            });
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Bulk operation error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
