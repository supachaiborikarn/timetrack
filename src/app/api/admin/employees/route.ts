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
                registeredStation: { select: { id: true, name: true } },
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
                // New Fields
                nickname: e.nickName,
                gender: e.gender,
                birthDate: e.birthDate,
                address: e.address,
                citizenId: e.citizenId,
                startDate: e.startDate,
                probationEndDate: e.probationEndDate,
                bankName: e.bankName,
                bankAccountNumber: e.bankAccountNumber,
                // Social Security & Legal
                isSocialSecurityRegistered: e.isSocialSecurityRegistered,
                socialSecurityNumber: e.socialSecurityNumber,
                registeredStation: e.registeredStation,

                emergencyContactName: e.emergencyContactName,
                emergencyContactPhone: e.emergencyContactPhone,
                emergencyContactRelation: e.emergencyContactRelation,
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
            // New fields
            nickname,
            dailyRate,
            baseSalary,
            bankAccountNumber,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelation,
            // Remote fields
            nickName,
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
        } = body;

        // Validate required fields (Phone is no longer required)
        if (!employeeId || !name || !pin) {
            return NextResponse.json(
                { error: "กรุณากรอกข้อมูลให้ครบถ้วน (รหัสพนักงาน, ชื่อ, PIN)" },
                { status: 400 }
            );
        }

        // Check for duplicates
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { employeeId },
                    // Check phone only if provided
                    ...(phone ? [{ phone }] : []),
                    // Check username/name
                    { username: body.username || name },
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

        const username = body.username || name;

        const user = await prisma.user.create({
            data: {
                employeeId,
                name,
                username,
                phone: phone || null,  // Allow null
                email: email || null,
                pin: hashedPin,
                password: defaultPassword,
                role: role as Role,
                stationId: stationId || null,
                departmentId: departmentId || null,
                hourlyRate: hourlyRate || 0,
                otRateMultiplier: otRateMultiplier || 1.5,
                // New Fields Merged
                nickName: nickname || nickName || null,
                dailyRate: dailyRate || null,
                baseSalary: baseSalary || null,
                bankName: bankName || null,
                bankAccountNumber: bankAccountNumber || null,

                gender: gender || null,
                birthDate: birthDate ? new Date(birthDate) : null,
                address: address || null,
                citizenId: citizenId || null,
                startDate: startDate ? new Date(startDate) : new Date(),
                probationEndDate: probationEndDate ? new Date(probationEndDate) : null,

                isSocialSecurityRegistered: isSocialSecurityRegistered || false,
                socialSecurityNumber: socialSecurityNumber || null,
                registeredStationId: registeredStationId || null,

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
