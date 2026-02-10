import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List advances with filters
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const month = searchParams.get("month");
        const year = searchParams.get("year");
        const status = searchParams.get("status");
        const stationId = searchParams.get("stationId");
        const search = searchParams.get("search");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (month && year) {
            where.month = parseInt(month);
            where.year = parseInt(year);
        }

        if (status) {
            where.status = status;
        }

        if (search) {
            where.user = {
                ...(where.user || {}),
                name: { contains: search, mode: "insensitive" },
            };
        }

        if (stationId) {
            where.user = {
                ...(where.user || {}),
                registeredStationId: stationId,
            };
        }

        const advances = await prisma.advance.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeId: true,
                        registeredStationId: true,
                        registeredStation: {
                            select: { id: true, name: true, code: true },
                        },
                        station: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
            },
            orderBy: [{ createdAt: "desc" }],
        });

        // Get summary stats
        const totalAmount = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        const pendingCount = advances.filter(a => a.status === "PENDING").length;
        const approvedAmount = advances
            .filter(a => a.status === "APPROVED" || a.status === "PAID")
            .reduce((sum, a) => sum + Number(a.amount), 0);

        // Get stations for filter dropdown
        const stations = await prisma.station.findMany({
            where: { isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" },
        });

        return NextResponse.json({
            advances,
            summary: {
                totalCount: advances.length,
                totalAmount,
                pendingCount,
                approvedAmount,
            },
            stations,
        });
    } catch (error) {
        console.error("Error fetching advances:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new advance
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { userId, amount, reason, month, year, note } = body;

        if (!userId || !amount) {
            return NextResponse.json({ error: "userId and amount are required" }, { status: 400 });
        }

        const now = new Date();
        const advMonth = month || now.getMonth() + 1;
        const advYear = year || now.getFullYear();

        const advance = await prisma.advance.create({
            data: {
                userId,
                amount: parseFloat(amount),
                date: now,
                month: advMonth,
                year: advYear,
                reason: reason || null,
                note: note || null,
                status: "PENDING",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeId: true,
                        registeredStation: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(advance, { status: 201 });
    } catch (error) {
        console.error("Error creating advance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update advance (status, amount, note)
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, status, amount, reason, note } = body;

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {};

        if (status) {
            updateData.status = status;
            if (status === "APPROVED") {
                updateData.approvedBy = session.user.id;
                updateData.approvedAt = new Date();
            }
            if (status === "PAID") {
                updateData.paidAt = new Date();
            }
        }
        if (amount !== undefined) updateData.amount = parseFloat(amount);
        if (reason !== undefined) updateData.reason = reason;
        if (note !== undefined) updateData.note = note;

        const advance = await prisma.advance.update({
            where: { id },
            data: updateData,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        employeeId: true,
                        registeredStation: {
                            select: { id: true, name: true, code: true },
                        },
                    },
                },
            },
        });

        return NextResponse.json(advance);
    } catch (error) {
        console.error("Error updating advance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete advance
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "id is required" }, { status: 400 });
        }

        await prisma.advance.delete({ where: { id } });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting advance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
