import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List all departments
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const departments = await prisma.department.findMany({
            orderBy: [{ station: { name: "asc" } }, { name: "asc" }],
            include: {
                station: {
                    select: { id: true, name: true, code: true },
                },
                _count: {
                    select: { employees: true },
                },
            },
        });

        return NextResponse.json({
            departments: departments.map((d) => ({
                id: d.id,
                name: d.name,
                code: d.code,
                stationId: d.stationId,
                stationName: d.station.name,
                stationCode: d.station.code,
                isFrontYard: d.isFrontYard,
                weeklyDayOff: d.weeklyDayOff,
                employeeCount: d._count.employees,
            })),
        });
    } catch (error) {
        console.error("Error fetching departments:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST - Create new department
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, code, stationId, isFrontYard } = body;

        if (!name || !code || !stationId) {
            return NextResponse.json({ error: "กรุณากรอกข้อมูลให้ครบ" }, { status: 400 });
        }

        // Check if code exists in this station
        const existing = await prisma.department.findUnique({
            where: { stationId_code: { stationId, code } },
        });
        if (existing) {
            return NextResponse.json({ error: "รหัสแผนกนี้มีอยู่แล้วในสถานีนี้" }, { status: 400 });
        }

        const department = await prisma.department.create({
            data: {
                name,
                code,
                stationId,
                isFrontYard: isFrontYard || false,
            },
            include: {
                station: { select: { name: true } },
            },
        });

        return NextResponse.json({
            department,
            message: "สร้างแผนกสำเร็จ",
        });
    } catch (error) {
        console.error("Error creating department:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update department
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, code, stationId, isFrontYard } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing department ID" }, { status: 400 });
        }

        // Check if code exists on another department in same station
        if (code && stationId) {
            const existing = await prisma.department.findFirst({
                where: {
                    stationId,
                    code,
                    id: { not: id },
                },
            });
            if (existing) {
                return NextResponse.json({ error: "รหัสแผนกนี้มีอยู่แล้วในสถานีนี้" }, { status: 400 });
            }
        }

        const department = await prisma.department.update({
            where: { id },
            data: {
                name,
                code,
                stationId,
                isFrontYard: isFrontYard ?? undefined,
            },
        });

        return NextResponse.json({
            department,
            message: "อัปเดตแผนกสำเร็จ",
        });
    } catch (error) {
        console.error("Error updating department:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE - Delete department
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing department ID" }, { status: 400 });
        }

        // Check if department has employees
        const department = await prisma.department.findUnique({
            where: { id },
            include: { _count: { select: { employees: true } } },
        });

        if (!department) {
            return NextResponse.json({ error: "ไม่พบแผนกนี้" }, { status: 404 });
        }

        if (department._count.employees > 0) {
            return NextResponse.json({
                error: `ไม่สามารถลบได้ มีพนักงาน ${department._count.employees} คนในแผนกนี้`,
            }, { status: 400 });
        }

        await prisma.department.delete({ where: { id } });

        return NextResponse.json({ message: "ลบแผนกสำเร็จ" });
    } catch (error) {
        console.error("Error deleting department:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
