import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { logActivity } from "@/lib/logger";
import type { Role } from "@prisma/client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.manage"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการที่พัก" }, { status: 403 });
        }

        const { id } = await params;
        const existing = await prisma.dormitory.findUnique({ where: { id } });
        if (!existing) return NextResponse.json({ error: "ไม่พบที่พัก" }, { status: 404 });

        const { name, code, address, stationId, capacity, note, isActive } = await request.json();

        const parsedCapacity = capacity === undefined ? undefined : capacity === null || capacity === "" ? null : Number(capacity);
        if (parsedCapacity != null && (!Number.isInteger(parsedCapacity) || parsedCapacity < 0)) {
            return NextResponse.json({ error: "จำนวนที่รองรับต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป" }, { status: 400 });
        }

        if (code && code.trim() !== existing.code) {
            const clash = await prisma.dormitory.findUnique({ where: { code: code.trim() } });
            if (clash) return NextResponse.json({ error: "รหัสที่พักนี้ถูกใช้ไปแล้ว" }, { status: 400 });
        }

        const dormitory = await prisma.dormitory.update({
            where: { id },
            data: {
                ...(name !== undefined ? { name: name.trim() } : {}),
                ...(code !== undefined ? { code: code.trim() } : {}),
                ...(address !== undefined ? { address: address?.trim() || null } : {}),
                ...(stationId !== undefined ? { stationId: stationId || null } : {}),
                ...(parsedCapacity !== undefined ? { capacity: parsedCapacity } : {}),
                ...(note !== undefined ? { note: note?.trim() || null } : {}),
                ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
            },
        });

        await logActivity(session.user.id, "UPDATE", "Dormitory", `แก้ไขที่พัก ${dormitory.name}`, dormitory.id);
        return NextResponse.json({ dormitory });
    } catch (error) {
        console.error("Error updating dormitory:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!(await hasPermission(session.user.role as Role, "housing.manage"))) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการที่พัก" }, { status: 403 });
        }

        const { id } = await params;
        const dormitory = await prisma.dormitory.findUnique({
            where: { id },
            include: { _count: { select: { residents: true } } },
        });
        if (!dormitory) return NextResponse.json({ error: "ไม่พบที่พัก" }, { status: 404 });

        // Deleting would SET NULL on every resident and quietly lose who lived where.
        // Closing a dorm is what people actually mean, so that is what is offered.
        if (dormitory._count.residents > 0) {
            return NextResponse.json(
                { error: `ยังมีพนักงาน ${dormitory._count.residents} คนผูกกับที่พักนี้ ให้ย้ายออกก่อน หรือปิดใช้งานแทนการลบ` },
                { status: 400 }
            );
        }

        await prisma.dormitory.delete({ where: { id } });
        await logActivity(session.user.id, "DELETE", "Dormitory", `ลบที่พัก ${dormitory.name}`, id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting dormitory:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
