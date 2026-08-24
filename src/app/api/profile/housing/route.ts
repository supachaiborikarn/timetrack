import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
    isHousingConfirmationRequired,
    isHousingConfirmationRole,
    isSelfReportedHousingStatus,
    parseHousingConfirmationStartedAt,
} from "@/lib/housing";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/** Data needed by the global popup, limited to the signed-in employee. */
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: {
                id: true,
                role: true,
                isActive: true,
                employeeStatus: true,
                housingStatus: true,
                dormitoryId: true,
                housingUpdatedAt: true,
                housingUpdatedById: true,
            },
        });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const confirmationStartedAt = parseHousingConfirmationStartedAt(
            process.env.HOUSING_CONFIRMATION_STARTED_AT,
        );
        const isAudience = user.isActive
            && user.employeeStatus === "ACTIVE"
            && isHousingConfirmationRole(user.role);
        const confirmationRequired = isAudience && isHousingConfirmationRequired(
            user.id,
            user.housingUpdatedById,
            user.housingUpdatedAt,
            confirmationStartedAt,
        );

        const dormitories = confirmationRequired
            ? await prisma.dormitory.findMany({
                where: { isActive: true },
                orderBy: [{ station: { name: "asc" } }, { name: "asc" }],
                select: {
                    id: true,
                    name: true,
                    station: { select: { id: true, name: true, code: true } },
                },
            })
            : [];

        return NextResponse.json({
            confirmationRequired,
            confirmationStartedAt: confirmationStartedAt.toISOString(),
            currentHousing: {
                housingStatus: user.housingStatus,
                dormitoryId: user.dormitoryId,
            },
            dormitories,
        });
    } catch (error) {
        console.error("Error loading employee housing confirmation:", error);
        return NextResponse.json({ error: "โหลดข้อมูลที่พักไม่สำเร็จ" }, { status: 500 });
    }
}

/** Let the signed-in employee report only their own current accommodation. */
export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { housingStatus, dormitoryId } = await request.json();
        if (!isSelfReportedHousingStatus(housingStatus)) {
            return NextResponse.json({ error: "กรุณาเลือกข้อมูลที่พัก" }, { status: 400 });
        }

        const resolvedDormitoryId = housingStatus === "COMPANY_DORM" && typeof dormitoryId === "string"
            ? dormitoryId.trim()
            : null;

        if (housingStatus === "COMPANY_DORM" && !resolvedDormitoryId) {
            return NextResponse.json({ error: "กรุณาเลือกปั๊มที่พักอยู่" }, { status: 400 });
        }

        let dormitory: { id: string; name: string; station: { name: string } | null } | null = null;
        if (resolvedDormitoryId) {
            dormitory = await prisma.dormitory.findFirst({
                where: { id: resolvedDormitoryId, isActive: true },
                select: { id: true, name: true, station: { select: { name: true } } },
            });
            if (!dormitory) {
                return NextResponse.json({ error: "ไม่พบที่พักที่เลือก หรือที่พักปิดใช้งานแล้ว" }, { status: 400 });
            }
        }

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                housingStatus,
                dormitoryId: resolvedDormitoryId,
                housingUpdatedAt: new Date(),
                // Stamped with the employee's own id, which is what marks the row as
                // self-reported in the admin roster and the allowance preview.
                housingUpdatedById: session.user.id,
            },
        });

        const housingLabel = dormitory
            ? `${dormitory.station?.name ?? dormitory.name} (${dormitory.name})`
            : "ที่พักของตัวเอง";
        await logActivity(
            session.user.id,
            "UPDATE",
            "User",
            `พนักงานอัปเดตข้อมูลที่พักของตัวเองเป็น ${housingLabel}`,
            session.user.id,
        );

        return NextResponse.json({ success: true, message: "บันทึกข้อมูลที่พักแล้ว" });
    } catch (error) {
        console.error("Error updating employee housing:", error);
        return NextResponse.json({ error: "บันทึกข้อมูลที่พักไม่สำเร็จ" }, { status: 500 });
    }
}
