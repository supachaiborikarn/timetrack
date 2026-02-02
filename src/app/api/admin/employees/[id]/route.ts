import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET: Get single employee
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        const employee = await prisma.user.findUnique({
            where: { id },
            include: {
                station: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
            },
        });

        if (!employee) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        return NextResponse.json({ employee });
    } catch (error) {
        console.error("Error fetching employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT: Update employee
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();

        const {
            name,
            phone,
            email,
            pin,
            role,
            stationId,
            departmentId,
            hourlyRate,
            dailyRate,
            otRateMultiplier,
            isActive,
        } = body;

        // Check if employee exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            name,
            phone,
            email: email || null,
            role,
            stationId: stationId || null,
            departmentId: departmentId || null,
            hourlyRate,
            dailyRate: dailyRate || null,
            otRateMultiplier,
            isActive,
        };

        // Only update PIN if provided
        if (pin && pin.length === 6) {
            updateData.pin = await bcrypt.hash(pin, 10);
        }

        const employee = await prisma.user.update({
            where: { id },
            data: updateData,
            include: {
                station: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ employee });
    } catch (error) {
        console.error("Error updating employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Delete employee (soft delete by setting isActive to false)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = await params;

        // Check if employee exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Soft delete - set isActive to false and employeeStatus to RESIGNED
        await prisma.user.update({
            where: { id },
            data: {
                isActive: false,
                employeeStatus: "RESIGNED",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
