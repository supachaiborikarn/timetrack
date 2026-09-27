import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
export class KebdaoError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}
export async function kebdaoActor(permission: string) {
    const session = await auth();
    if (!session?.user?.id) throw new KebdaoError("กรุณาเข้าสู่ระบบ", 401);
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, role: true, stationId: true, isActive: true, employeeStatus: true } });
    if (!user?.isActive || user.employeeStatus !== "ACTIVE" || !await hasPermission(user.role, permission)) throw new KebdaoError("ไม่มีสิทธิ์ใช้งานส่วนนี้", 403);
    return user;
}
export function kebdaoError(error: unknown) {
    if (error instanceof KebdaoError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(error.code)) return NextResponse.json({ error: "ข้อมูลถูกใช้งานหรือเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่และตรวจสอบรหัส" }, { status: 409 });
    console.error("Kebdao request failed", error);
    return NextResponse.json({ error: "บันทึกหรือโหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
}
export const kebdaoInclude = { reviewedBy: { select: { name: true } }, assets: { select: { id: true } }, user: { select: { name: true, employeeId: true } }, station: { select: { name: true } } } as const;
