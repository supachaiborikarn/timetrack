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
            nickName,
            phone,
            email,
            pin,
            role,
            stationId,
            departmentId,
            hourlyRate,
            dailyRate,
            baseSalary,
            otRateMultiplier,
            isActive,
            // New fields
            // New fields
            bankAccountNumber,
            bankName,
            housingCost,
            // Remote fields

            gender,
            birthDate,
            address,
            citizenId,
            startDate,
            probationEndDate,
            // Social Security
            isSocialSecurityRegistered,
            socialSecurityNumber,
            registeredStationId,
            // Emergency Contact
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelation,
        } = body;

        // Check if employee exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Build update data
        const updateData: Record<string, unknown> = {
            name,
            nickName: nickName || null,
            phone: phone || null,
            email: email || null,
            role,
            stationId: stationId || null,
            departmentId: departmentId || null,
            hourlyRate: parseFloat(hourlyRate) || 0,
            dailyRate: parseFloat(dailyRate) || 0,
            baseSalary: parseFloat(baseSalary) || 0,
            otRateMultiplier: parseFloat(otRateMultiplier) || 1.5,
            isActive,
            // Bank
            bankAccountNumber: bankAccountNumber || null,
            bankName: bankName || null,

            // Personal
            gender: gender || null,
            birthDate: birthDate ? new Date(birthDate) : null,
            address: address || null,
            citizenId: citizenId || null,
            startDate: startDate ? new Date(startDate) : null,
            probationEndDate: probationEndDate ? new Date(probationEndDate) : null,

            // Social Security
            isSocialSecurityRegistered: isSocialSecurityRegistered || false,
            socialSecurityNumber: socialSecurityNumber || null,
            registeredStationId: registeredStationId || null,

            // Emergency Contact
            emergencyContactName: emergencyContactName || null,
            emergencyContactPhone: emergencyContactPhone || null,
            emergencyContactRelation: emergencyContactRelation || null,
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

// DELETE: Hard delete employee (permanently remove from database)
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

        // Hard delete - permanently remove from database
        await prisma.user.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
