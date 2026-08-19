import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.view"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์ดูข้อมูลที่พัก" }, { status: 403 });
        }

        const dormitories = await prisma.dormitory.findMany({
            orderBy: [{ isActive: "desc" }, { name: "asc" }],
            include: {
                station: { select: { id: true, name: true, code: true } },
                _count: { select: { residents: { where: { isActive: true } } } },
            },
        });

        return NextResponse.json({
            dormitories: dormitories.map((d) => ({
                id: d.id,
                name: d.name,
                code: d.code,
                address: d.address,
                note: d.note,
                capacity: d.capacity,
                isActive: d.isActive,
                station: d.station,
                residentCount: d._count.residents,
            })),
        });
    } catch (error) {
        console.error("Error listing dormitories:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.manage"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการที่พัก" }, { status: 403 });
        }

        const { name, code, address, stationId, capacity, note } = await request.json();
        if (!name?.trim() || !code?.trim()) {
            return NextResponse.json({ error: "กรุณาระบุชื่อและรหัสที่พัก" }, { status: 400 });
        }

        const parsedCapacity = capacity == null || capacity === "" ? null : Number(capacity);
        if (parsedCapacity !== null && (!Number.isInteger(parsedCapacity) || parsedCapacity < 0)) {
            return NextResponse.json({ error: "จำนวนที่รองรับต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
        }

        const existing = await prisma.dormitory.findUnique({ where: { code: code.trim() } });
        if (existing) return NextResponse.json({ error: "รหัสที่พักนี้ถูกใช้ไปแล้ว" }, { status: 400 });

        const dormitory = await prisma.dormitory.create({
            data: {
                name: name.trim(),
                code: code.trim(),
                address: address?.trim() || null,
                stationId: stationId || null,
                capacity: parsedCapacity,
                note: note?.trim() || null,
            },
        });

        await logActivity(session.user.id, "CREATE", "Dormitory", `เพิ่มที่พัก ${dormitory.name}`, dormitory.id);
        return NextResponse.json({ dormitory }, { status: 201 });
    } catch (error) {
        console.error("Error creating dormitory:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
