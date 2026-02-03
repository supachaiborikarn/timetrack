import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Allow seeing all employees to support cross-station check-in (e.g. temporary transfer)
        const whereClause = {};

        const employees = await prisma.user.findMany({
            where: whereClause,
            include: {
                station: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({
            employees: employees.map((e) => ({
                id: e.id,
                employeeId: e.employeeId,
                name: e.name,
                phone: e.phone,
                email: e.email,
                role: e.role,
                hourlyRate: Number(e.hourlyRate),
                otRateMultiplier: Number(e.otRateMultiplier),
                isActive: e.isActive,
                station: e.station,
                department: e.department,
            })),
        });
    } catch (error) {
        console.error("Error fetching employees:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const {
            employeeId,
            name,
            phone,
            email,
            pin,
            role,
            stationId,
            departmentId,
            hourlyRate,
            otRateMultiplier,
            // New fields
            nickname,
            realName,
            dailyRate,
            baseSalary,
            specialPay,
            housingCost,
            workHours,
            position,
            bankName,
            bankAccountNumber,
            socialSecurityStation,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelation,
        } = body;

        // Validate required fields
        if (!employeeId || !name || !phone || !pin) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
                { status: 400 }
            );
        }

        // Check for duplicates
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { employeeId },
                    { phone },
                    { username: body.username || name }, // Check if username/name exists
                    ...(email ? [{ email }] : []),
                ],
            },
        });

        if (existing) {
            return NextResponse.json(
                { error: "รหัสพนักงาน, เบอร์โทร หรืออีเมลซ้ำ" },
                { status: 400 }
            );
        }

        // Hash PIN
        const hashedPin = await bcrypt.hash(pin, 10);
        // Default password "123456" for employees
        const defaultPassword = await bcrypt.hash("123456", 10);

        // Determine username (use provided username or fallback to name/employeeId)
        // Sanitizing name to be username-friendly if needed, but for now use raw name or employeeId
        // Ideally, we should ensure uniqueness.
        // Let's use name as username default.
        const username = body.username || name;

        const user = await prisma.user.create({
            data: {
                employeeId,
                name,
                username: username, // Save username
                phone,
                email: email || null,
                pin: hashedPin,
                password: defaultPassword, // Set default password
                role: role as Role,
                stationId: stationId || null,
                departmentId: departmentId || null,
                hourlyRate: hourlyRate || 0,
                otRateMultiplier: otRateMultiplier || 1.5,
                // New Fields
                nickname: nickname || null,
                realName: realName || null,
                dailyRate: dailyRate || null,
                baseSalary: baseSalary || null,
                specialPay: specialPay || 0,
                housingCost: housingCost || 0,
                workHours: workHours || 12,
                position: position || null,
                bankName: bankName || null,
                bankAccountNumber: bankAccountNumber || null,
                socialSecurityStation: socialSecurityStation || null,
                emergencyContactName: emergencyContactName || null,
                emergencyContactPhone: emergencyContactPhone || null,
                emergencyContactRelation: emergencyContactRelation || null,
            },
        });

        return NextResponse.json({ success: true, userId: user.id });
    } catch (error) {
        console.error("Error creating employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
