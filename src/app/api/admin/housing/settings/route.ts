import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getHousingAllowanceDefault, setHousingAllowanceDefault } from "@/lib/server/housing-settings";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.view"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลที่พัก" }, { status: 403 });
        }

        return NextResponse.json({ monthlyAllowance: await getHousingAllowanceDefault() });
    } catch (error) {
        console.error("Error reading housing settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.manage"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์แก้ไขค่าที่พัก" }, { status: 403 });
        }

        const { monthlyAllowance } = await request.json();
        const amount = Number(monthlyAllowance);
        if (!Number.isFinite(amount) || amount < 0) {
            return NextResponse.json({ error: "ค่าที่พักต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
        }

        await setHousingAllowanceDefault(amount);
        await logActivity(session.user.id, "UPDATE", "SystemConfig", `ตั้งค่าที่พักรายเดือนเป็น ${amount} บาท`);
        return NextResponse.json({ monthlyAllowance: amount });
    } catch (error) {
        console.error("Error saving housing settings:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
