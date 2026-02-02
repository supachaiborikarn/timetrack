import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const stationId = searchParams.get("stationId");
        const statusParam = searchParams.get("status");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        // Build where clause
        const where: Record<string, unknown> = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        // Station filter
        if (stationId) {
            where.user = { stationId };
        }

        // Manager can only see their station
        if (session.user.role === "MANAGER" && session.user.stationId) {
            where.user = { stationId: session.user.stationId };
        }

        // Status filter
        if (statusParam === "LATE") {
            where.lateMinutes = { gt: 0 };
        } else if (statusParam && statusParam !== "all") {
            where.status = statusParam;
        }

        const records = await prisma.attendance.findMany({
            where,
            include: {
                user: {
                    include: {
                        station: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
            orderBy: [{ date: "desc" }, { checkInTime: "desc" }],
            take: 500,
        });

        return NextResponse.json({
            records: records.map((r) => ({
                id: r.id,
                date: r.date.toISOString(),
                checkInTime: r.checkInTime?.toISOString() || null,
                checkOutTime: r.checkOutTime?.toISOString() || null,
                lateMinutes: r.lateMinutes,
                actualHours: r.actualHours ? Number(r.actualHours) : null,
                overtimeHours: r.overtimeHours ? Number(r.overtimeHours) : null,
                status: r.status,
                user: {
                    id: r.user.id,
                    name: r.user.name,
                    employeeId: r.user.employeeId,
                    station: r.user.station?.name || "-",
                    department: r.user.department?.name || "-",
                },
            })),
        });
    } catch (error) {
        console.error("Error fetching attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

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

        const updated = await prisma.attendance.update({
            where: { id },
            data: {
                status,
                approvedBy: session.user.id,
                approvedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, id: updated.id });
    } catch (error) {
        console.error("Error updating attendance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
