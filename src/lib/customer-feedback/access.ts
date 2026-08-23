import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

/**
 * Access helper ของ API เสียงลูกค้า
 *
 * กติกา §4: ทุก internal API ต้องใช้ session.user.id ค้น User.isActive, role
 * และ stationId ปัจจุบันจากฐานข้อมูล — ห้ามใช้ค่าใน JWT เป็นตัวตัดสิน scope
 * เพราะ session เดิมอาจถือค่าสถานีก่อนย้าย
 */

export interface FeedbackAccessContext {
    userId: string;
    role: Role;
    stationId: string | null;
}

export async function getFeedbackAccessContext(): Promise<
    { ok: true; ctx: FeedbackAccessContext } | { ok: false; status: 401 | 403; message: string }
> {
    const session = await auth();
    if (!session?.user?.id) return { ok: false, status: 401, message: "ไม่ได้เข้าสู่ระบบ" };

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, isActive: true, stationId: true },
    });
    if (!user || !user.isActive) return { ok: false, status: 403, message: "บัญชีนี้ไม่สามารถใช้งานได้" };

    return { ok: true, ctx: { userId: user.id, role: user.role, stationId: user.stationId } };
}

export async function requireFeedbackPermission(
    ctx: FeedbackAccessContext,
    permissionCode: string
): Promise<{ ok: true } | { ok: false; status: 403; message: string }> {
    const allowed = await hasPermission(ctx.role, permissionCode);
    if (!allowed) return { ok: false, status: 403, message: "ไม่มีสิทธิ์เข้าถึง" };
    return { ok: true };
}

/**
 * คืน station scope สำหรับ query — ADMIN/HR เห็นทุกสถานี (undefined)
 * MANAGER ถูกจำกัด stationId ปัจจุบันจากฐานข้อมูล และถ้าไม่มี stationId
 * ต้องได้ 403 ทันที ห้าม fallback เป็นข้อมูลทุกสถานี
 */
export async function getStationScope(
    ctx: FeedbackAccessContext
): Promise<{ ok: true; stationId: string | null } | { ok: false; status: 403; message: string }> {
    if (ctx.role === "ADMIN" || ctx.role === "HR") return { ok: true, stationId: null };
    if (ctx.role === "MANAGER") {
        if (!ctx.stationId) {
            return { ok: false, status: 403, message: "ไม่พบสถานีที่ผู้จัดการรับผิดชอบ" };
        }
        return { ok: true, stationId: ctx.stationId };
    }
    return { ok: false, status: 403, message: "ไม่มีสิทธิ์เข้าถึง" };
}
