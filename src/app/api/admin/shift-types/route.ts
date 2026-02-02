import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all shift types
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const shifts = await prisma.shift.findMany({
            orderBy: { sortOrder: "asc" },
            include: {
                station: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ shifts });
    } catch (error) {
        console.error("Error fetching shifts:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new shift type
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { code, name, startTime, endTime, stationId, breakMinutes, isNightShift, sortOrder } = body;

        if (!code || !name || !startTime || !endTime) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check if code already exists
        const existing = await prisma.shift.findUnique({ where: { code } });
        if (existing) {
            return NextResponse.json({ error: "รหัสกะนี้มีอยู่แล้ว" }, { status: 400 });
        }

        const shift = await prisma.shift.create({
            data: {
                code,
                name,
                startTime,
                endTime,
                stationId: stationId || null,
                breakMinutes: breakMinutes || 60,
                isNightShift: isNightShift || false,
                sortOrder: sortOrder || 0,
            },
        });

        return NextResponse.json({ shift, message: "สร้างกะสำเร็จ" });
    } catch (error) {
        console.error("Error creating shift:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update shift type
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, code, name, startTime, endTime, stationId, breakMinutes, isNightShift, sortOrder, isActive } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing shift ID" }, { status: 400 });
        }

        // Check if code exists on another shift
        if (code) {
            const existing = await prisma.shift.findFirst({
                where: { code, id: { not: id } },
            });
            if (existing) {
                return NextResponse.json({ error: "รหัสกะนี้มีอยู่แล้ว" }, { status: 400 });
            }
        }

        const shift = await prisma.shift.update({
            where: { id },
            data: {
                code,
                name,
                startTime,
                endTime,
                stationId: stationId || null,
                breakMinutes: breakMinutes ?? undefined,
                isNightShift: isNightShift ?? undefined,
                sortOrder: sortOrder ?? undefined,
                isActive: isActive ?? undefined,
            },
        });

        return NextResponse.json({ shift, message: "อัปเดตกะสำเร็จ" });
    } catch (error) {
        console.error("Error updating shift:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete shift type
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing shift ID" }, { status: 400 });
        }

        // Check if shift has assignments
        const assignmentCount = await prisma.shiftAssignment.count({
            where: { shiftId: id },
        });

        if (assignmentCount > 0) {
            return NextResponse.json(
                { error: `ไม่สามารถลบได้ เนื่องจากมีการมอบหมายกะนี้อยู่ ${assignmentCount} รายการ` },
                { status: 400 }
            );
        }

        await prisma.shift.delete({ where: { id } });

        return NextResponse.json({ message: "ลบกะสำเร็จ" });
    } catch (error) {
        console.error("Error deleting shift:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
