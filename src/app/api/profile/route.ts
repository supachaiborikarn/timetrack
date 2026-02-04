import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET - Get current user profile
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            include: {
                station: { select: { id: true, name: true, code: true } },
                department: { select: { id: true, name: true, code: true } },
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            profile: {
                id: user.id,
                employeeId: user.employeeId,
                name: user.name,
                nickName: user.nickName,
                email: user.email,
                phone: user.phone,
                role: user.role,
                station: user.station,
                department: user.department,
                // Wage info
                hourlyRate: user.hourlyRate,
                dailyRate: user.dailyRate,
                baseSalary: user.baseSalary,
                // Bank info
                bankAccountNumber: user.bankAccountNumber,
                bankName: user.bankName,
                // Additional
                createdAt: user.createdAt,

            },
        });
    } catch (error) {
        console.error("Error fetching profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT - Update profile
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { phone, email, currentPassword, newPassword, newPin } = body;

        // Build update data
        const updateData: {
            phone?: string;
            email?: string;
            password?: string;
            pin?: string;
        } = {};

        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email;

        // Change password
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: "กรุณาใส่รหัสผ่านปัจจุบัน" }, { status: 400 });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id },
            });

            if (!user || !user.password) {
                return NextResponse.json({ error: "User not found" }, { status: 404 });
            }

            const isValid = await bcrypt.compare(currentPassword, user.password);
            if (!isValid) {
                return NextResponse.json({ error: "รหัสผ่านปัจจุบันไม่ถูกต้อง" }, { status: 400 });
            }

            updateData.password = await bcrypt.hash(newPassword, 10);
        }

        // Change PIN
        if (newPin) {
            if (!/^\d{4,6}$/.test(newPin)) {
                return NextResponse.json({ error: "PIN ต้องเป็นตัวเลข 4-6 หลัก" }, { status: 400 });
            }
            updateData.pin = await bcrypt.hash(newPin, 10);
        }

        // Update user
        const updated = await prisma.user.update({
            where: { id: session.user.id },
            data: updateData,
        });

        return NextResponse.json({
            success: true,
            message: "อัปเดตโปรไฟล์สำเร็จ",
            profile: {
                id: updated.id,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
            },
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
