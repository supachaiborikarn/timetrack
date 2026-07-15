import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseAmount(value: unknown, allowZero = true): number | null {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || (!allowZero && amount === 0)) return null;
    return Math.round(amount * 100) / 100;
}

// GET - List advances with filters
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
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
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { userId, amount, reason, month, year, note } = body;

        const parsedAmount = parseAmount(amount, false);
        if (!userId || parsedAmount === null) {
            return NextResponse.json({ error: "userId and amount are required" }, { status: 400 });
        }

        const now = new Date();
        const advMonth = month ? parseInt(String(month)) : now.getMonth() + 1;
        const advYear = year ? parseInt(String(year)) : now.getFullYear();

        const advance = await prisma.advance.create({
            data: {
                userId,
                amount: parsedAmount,
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
        if (amount !== undefined) {
            const parsedAmount = parseAmount(amount);
            if (parsedAmount === null) {
                return NextResponse.json({ error: "amount must be a non-negative number" }, { status: 400 });
            }
            updateData.amount = parsedAmount;
        }
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

// PATCH - Update advance amount by userId + month/year (for payroll page inline edit)
export async function PATCH(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { userId, month, year, amount } = body;

        if (!userId || !month || !year || amount === undefined) {
            return NextResponse.json({ error: "userId, month, year, and amount are required" }, { status: 400 });
        }

        const parsedMonth = Number(month);
        const parsedYear = Number(year);
        const newAmount = parseAmount(amount);
        if (
            newAmount === null ||
            !Number.isInteger(parsedMonth) || parsedMonth < 1 || parsedMonth > 12 ||
            !Number.isInteger(parsedYear) || parsedYear < 2000
        ) {
            return NextResponse.json({ error: "Invalid month, year, or amount" }, { status: 400 });
        }

        // Find existing advances for this user/period
        const advances = await prisma.advance.findMany({
            where: {
                userId,
                status: { in: ["APPROVED", "PAID"] },
                month: parsedMonth,
                year: parsedYear,
            },
            orderBy: { createdAt: "asc" },
        });

        await prisma.$transaction(async (tx) => {
            if (advances.length === 0 && newAmount > 0) {
                await tx.advance.create({
                    data: {
                        userId,
                        amount: newAmount,
                        date: new Date(),
                        month: parsedMonth,
                        year: parsedYear,
                        status: "APPROVED",
                        approvedBy: session.user.id,
                        approvedAt: new Date(),
                    },
                });
                return;
            }
            if (advances.length > 0) {
                await tx.advance.update({ where: { id: advances[0].id }, data: { amount: newAmount } });
                if (advances.length > 1) {
                    await tx.advance.updateMany({
                        where: { id: { in: advances.slice(1).map((advance) => advance.id) } },
                        data: { amount: 0 },
                    });
                }
            }
        });

        return NextResponse.json({ updated: true, amount: newAmount });
    } catch (error) {
        console.error("Error patching advance:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
