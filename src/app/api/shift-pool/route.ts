import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, getBangkokNow } from "@/lib/date-utils";

// GET: Get open shifts in pool
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");

        // Get user's station if not provided
        let targetStationId = stationId;
        if (!targetStationId) {
            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { stationId: true },
            });
            targetStationId = user?.stationId || null;
        }

        const now = getBangkokNow();
        const today = startOfDay(now);

        // Build where clause
        const where: Record<string, unknown> = {
            status: "OPEN",
            date: { gte: today },
        };

        // Get open shifts
        const openShifts = await prisma.shiftPool.findMany({
            where,
            orderBy: { date: "asc" },
            take: 50,
        });

        // Enrich with shift and user data
        const enrichedShifts = await Promise.all(
            openShifts.map(async (pool) => {
                const [shift, releasedByUser] = await Promise.all([
                    prisma.shift.findUnique({
                        where: { id: pool.shiftId },
                        select: { code: true, name: true, startTime: true, endTime: true },
                    }),
                    prisma.user.findUnique({
                        where: { id: pool.releasedBy },
                        select: { name: true, department: { select: { name: true } } },
                    }),
                ]);

                return {
                    ...pool,
                    shift,
                    releasedByUser: releasedByUser
                        ? { name: releasedByUser.name, department: releasedByUser.department?.name }
                        : null,
                };
            })
        );

        return NextResponse.json({ shifts: enrichedShifts });
    } catch (error) {
        console.error("Error fetching shift pool:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Release a shift to pool
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { date, reason } = body;

        if (!date) {
            return NextResponse.json({ error: "date is required" }, { status: 400 });
        }

        const dateObj = startOfDay(new Date(date));

        // Get user's shift assignment for that date
        const assignment = await prisma.shiftAssignment.findUnique({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: dateObj,
                },
            },
            include: { shift: true },
        });

        if (!assignment) {
            return NextResponse.json(
                { error: "ไม่พบกะที่กำหนดในวันนี้" },
                { status: 400 }
            );
        }

        if (assignment.isDayOff) {
            return NextResponse.json(
                { error: "วันนี้เป็นวันหยุดอยู่แล้ว" },
                { status: 400 }
            );
        }

        // Check if already released
        const existingPool = await prisma.shiftPool.findFirst({
            where: {
                releasedBy: session.user.id,
                date: dateObj,
                status: "OPEN",
            },
        });

        if (existingPool) {
            return NextResponse.json(
                { error: "คุณปล่อยกะนี้ไว้แล้ว" },
                { status: 400 }
            );
        }

        // Calculate expiry (24 hours before shift or end of day before)
        const expiredAt = new Date(dateObj);
        expiredAt.setHours(18, 0, 0, 0); // 6 PM day before

        // Create pool entry
        const poolEntry = await prisma.shiftPool.create({
            data: {
                shiftId: assignment.shiftId,
                date: dateObj,
                releasedBy: session.user.id,
                reason,
                expiredAt,
            },
        });

        return NextResponse.json({
            success: true,
            message: "ปล่อยกะสำเร็จ",
            poolEntry,
        });
    } catch (error) {
        console.error("Error releasing shift:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT: Claim a shift from pool
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { poolId } = body;

        if (!poolId) {
            return NextResponse.json({ error: "poolId is required" }, { status: 400 });
        }

        // Get pool entry
        const poolEntry = await prisma.shiftPool.findUnique({
            where: { id: poolId },
        });

        if (!poolEntry) {
            return NextResponse.json({ error: "ไม่พบกะนี้" }, { status: 404 });
        }

        if (poolEntry.status !== "OPEN") {
            return NextResponse.json(
                { error: "กะนี้ถูกรับไปแล้วหรือหมดอายุ" },
                { status: 400 }
            );
        }

        if (poolEntry.releasedBy === session.user.id) {
            return NextResponse.json(
                { error: "ไม่สามารถรับกะที่ตัวเองปล่อยได้" },
                { status: 400 }
            );
        }

        const now = getBangkokNow();

        // Update pool entry
        const updatedPool = await prisma.shiftPool.update({
            where: { id: poolId },
            data: {
                claimedBy: session.user.id,
                claimedAt: now,
                status: "CLAIMED",
            },
        });

        // Create shift assignment for claimer
        await prisma.shiftAssignment.upsert({
            where: {
                userId_date: {
                    userId: session.user.id,
                    date: poolEntry.date,
                },
            },
            create: {
                userId: session.user.id,
                shiftId: poolEntry.shiftId,
                date: poolEntry.date,
                isDayOff: false,
            },
            update: {
                shiftId: poolEntry.shiftId,
                isDayOff: false,
            },
        });

        // Update original user's assignment to day off (optional - or delete)
        await prisma.shiftAssignment.update({
            where: {
                userId_date: {
                    userId: poolEntry.releasedBy,
                    date: poolEntry.date,
                },
            },
            data: {
                isDayOff: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: "รับกะสำเร็จ",
            poolEntry: updatedPool,
        });
    } catch (error) {
        console.error("Error claiming shift:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Cancel released shift
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { poolId } = body;

        if (!poolId) {
            return NextResponse.json({ error: "poolId is required" }, { status: 400 });
        }

        const poolEntry = await prisma.shiftPool.findUnique({
            where: { id: poolId },
        });

        if (!poolEntry) {
            return NextResponse.json({ error: "ไม่พบกะนี้" }, { status: 404 });
        }

        if (poolEntry.releasedBy !== session.user.id && !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (poolEntry.status !== "OPEN") {
            return NextResponse.json(
                { error: "ไม่สามารถยกเลิกได้ กะนี้ถูกรับไปแล้ว" },
                { status: 400 }
            );
        }

        await prisma.shiftPool.update({
            where: { id: poolId },
            data: { status: "CANCELLED" },
        });

        return NextResponse.json({ success: true, message: "ยกเลิกสำเร็จ" });
    } catch (error) {
        console.error("Error cancelling shift release:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
