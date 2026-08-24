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

type ParseResult<T> = { ok: true; value: T } | { ok: false; message: string };

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** ใช้ station จาก server scope ก่อนค่าที่ผู้ใช้ส่งมาเสมอ */
export function resolveFeedbackStationId(
    scopeStationId: string | null,
    requestedStationId: string | null | undefined
): string | undefined {
    return scopeStationId ?? requestedStationId ?? undefined;
}

export function parseFeedbackPagination(
    pageValue: string | null,
    pageSizeValue: string | null,
    defaults: { pageSize: number; maxPageSize: number }
): ParseResult<{ page: number; pageSize: number }> {
    const parseInteger = (raw: string | null, fallback: number, field: string, max?: number) => {
        if (raw === null) return { ok: true as const, value: fallback };
        if (!/^\d+$/.test(raw)) return { ok: false as const, message: `${field} ต้องเป็นจำนวนเต็มบวก` };
        const value = Number(raw);
        if (!Number.isSafeInteger(value) || value < 1 || (max !== undefined && value > max)) {
            return { ok: false as const, message: `${field} อยู่นอกช่วงที่อนุญาต` };
        }
        return { ok: true as const, value };
    };

    const page = parseInteger(pageValue, 1, "page");
    if (!page.ok) return page;
    const pageSize = parseInteger(pageSizeValue, defaults.pageSize, "pageSize", defaults.maxPageSize);
    if (!pageSize.ok) return pageSize;
    return { ok: true, value: { page: page.value, pageSize: pageSize.value } };
}

export function parseOptionalFeedbackFilter<T extends string>(
    raw: string | null,
    allowed: readonly T[],
    field: string
): ParseResult<T | undefined> {
    if (raw === null || raw === "") return { ok: true, value: undefined };
    if (!allowed.includes(raw as T)) return { ok: false, message: `${field} ไม่ถูกต้อง` };
    return { ok: true, value: raw as T };
}

function parseBangkokDateKey(raw: string): Date | null {
    if (!DATE_KEY_PATTERN.test(raw)) return null;
    const [year, month, day] = raw.split("-").map(Number);
    const utc = new Date(Date.UTC(year, month - 1, day) - BANGKOK_OFFSET_MS);
    const roundTrip = new Date(utc.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
    return roundTrip === raw ? utc : null;
}

export function parseFeedbackDateRange(
    fromValue: string | null,
    toValue: string | null
): ParseResult<{ from?: Date; toExclusive?: Date }> {
    const from = fromValue ? parseBangkokDateKey(fromValue) : null;
    if (fromValue && !from) return { ok: false, message: "from ต้องเป็นวันที่จริงในรูปแบบ YYYY-MM-DD" };
    const to = toValue ? parseBangkokDateKey(toValue) : null;
    if (toValue && !to) return { ok: false, message: "to ต้องเป็นวันที่จริงในรูปแบบ YYYY-MM-DD" };
    const toExclusive = to ? new Date(to.getTime() + 24 * 60 * 60 * 1000) : undefined;
    if (from && toExclusive && from.getTime() >= toExclusive.getTime()) {
        return { ok: false, message: "from ต้องไม่อยู่หลัง to" };
    }
    return { ok: true, value: { from: from ?? undefined, toExclusive } };
}

/** รับทั้ง YYYY-MM-DD และ ISO จาก input type=date รุ่นเดิม แล้วเก็บเป็นต้นวัน Bangkok */
export function parseReviewPeriodDate(value: unknown, field: string): ParseResult<{ dateKey: string; dayStart: Date }> {
    if (typeof value !== "string" || value.length < 10) {
        return { ok: false, message: `${field} ไม่ถูกต้อง` };
    }
    const dateKey = value.slice(0, 10);
    const dayStart = parseBangkokDateKey(dateKey);
    if (!dayStart) return { ok: false, message: `${field} ต้องเป็นวันที่จริง` };
    return { ok: true, value: { dateKey, dayStart } };
}

/** รองรับข้อมูลเก่าที่บันทึก UTC midnight และข้อมูลใหม่ที่บันทึก Bangkok midnight */
export function reviewPeriodDayBounds(storedDate: Date): { dateKey: string; dayStart: Date; nextDayStart: Date } {
    const dateKey = new Date(storedDate.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
    const dayStart = parseBangkokDateKey(dateKey)!;
    return { dateKey, dayStart, nextDayStart: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000) };
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

export async function canViewFeedbackIncident(ctx: FeedbackAccessContext): Promise<boolean> {
    return ctx.role === "ADMIN" || hasPermission(ctx.role, "customer_feedback.view_incident");
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
