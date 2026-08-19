import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSelfReportedHousingStatus } from "@/lib/housing";
import { logActivity } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

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
