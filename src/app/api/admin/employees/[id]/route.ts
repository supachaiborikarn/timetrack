import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { deleteAsset } from "@/lib/assets";
import { updateEmployeeAndCloseQr } from "@/lib/customer-feedback/employee-status";
import { tryDeleteEmployeeAccount } from "@/lib/employee-removal";

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

        const parsedHourlyRate = Number(hourlyRate || 0);
        const parsedDailyRate = Number(dailyRate || 0);
        const parsedBaseSalary = Number(baseSalary || 0);
        const parsedOtRateMultiplier = Number(otRateMultiplier || 1.5);
        if ([parsedHourlyRate, parsedDailyRate, parsedBaseSalary, parsedOtRateMultiplier].some((value) => !Number.isFinite(value) || value < 0)) {
            return NextResponse.json({ error: "ค่าแรง เงินเดือน และอัตรา OT ต้องเป็นตัวเลขตั้งแต่ศูนย์ขึ้นไป" }, { status: 400 });
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
            hourlyRate: parsedHourlyRate,
            dailyRate: parsedDailyRate,
            baseSalary: parsedBaseSalary,
            otRateMultiplier: parsedOtRateMultiplier,
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
        if (isActive === true) {
            updateData.employeeStatus = "ACTIVE";
        }

        const updateEmployee = (client: Pick<typeof prisma, "user">) => client.user.update({
            where: { id },
            data: updateData,
            include: {
                station: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
            },
        });
        const employee = isActive === false
            ? (await updateEmployeeAndCloseQr(id, updateEmployee)).employee
            : await updateEmployee(prisma);

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

        // Guard เดียวกับ src/lib/employee-removal.ts — ห้าม hard delete เมื่อมี
        // feedback response หรือคำขอทบทวนที่ยังไม่ปิด
        const [feedbackQrCount, feedbackVisitCount, feedbackResponseCount, openReviewRequestCount] = await Promise.all([
            prisma.customerFeedbackQr.count({ where: { employeeId: id } }),
            prisma.customerFeedbackVisit.count({
                where: {
                    OR: [
                        { employeeId: id },
                        { qrCode: { employeeId: id } },
                    ],
                },
            }),
            prisma.customerFeedbackResponse.count({ where: { employeeId: id } }),
            prisma.customerFeedbackReviewRequest.count({
                where: { employeeId: id, status: { in: ["OPEN", "IN_REVIEW"] } },
            }),
        ]);
        if (feedbackQrCount > 0 || feedbackVisitCount > 0 || feedbackResponseCount > 0 || openReviewRequestCount > 0) {
            return NextResponse.json(
                { error: "พนักงานคนนี้มี QR การเปิดแบบประเมิน คำตอบจากลูกค้า หรือคำขอทบทวนที่ยังไม่ปิด จึงลบถาวรไม่ได้ ให้ปิดใช้งานแทน" },
                { status: 400 }
            );
        }

        // Check if employee exists
        const existing = await prisma.user.findUnique({ where: { id } });
        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // เก็บตำแหน่งไฟล์ไว้ก่อนลบแถว แล้วค่อยลบ bytes หลัง transaction สำเร็จ
        const assets = await prisma.storedAsset.findMany({
            where: { ownerUserId: id },
            select: { id: true, mimeType: true, sizeBytes: true, storageDriver: true, storageKey: true },
        });
        const deletion = await tryDeleteEmployeeAccount(id);
        if (!deletion.deleted) {
            return NextResponse.json(
                { error: "มีการสร้าง QR การเปิดแบบประเมิน หรือข้อมูลเสียงลูกค้าระหว่างทำรายการ กรุณาปิดใช้งานพนักงานแทน" },
                { status: 409 }
            );
        }
        for (const asset of assets) await deleteAsset(asset);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting employee:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
