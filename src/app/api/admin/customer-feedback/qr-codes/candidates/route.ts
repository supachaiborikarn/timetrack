import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, requireFeedbackPermission, getStationScope } from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { resolveEmployeePublicLabel } from "@/lib/customer-feedback/public-identity";

/**
 * GET /api/admin/customer-feedback/qr-codes/candidates?search=
 *
 * รายชื่อพนักงานสำหรับเลือกตอนสร้าง QR — คืนเท่าที่จำเป็นต่อการเลือกคนเท่านั้น
 * (ตั้งใจไม่ใช้ /api/admin/employees ซึ่งคืนค่าแรงและเงินเดือนมาด้วย)
 *
 * บอกมาตั้งแต่ในรายการว่าคนไหนสร้างไม่ได้และเพราะอะไร จะได้ไม่ต้องกดแล้วโดนปฏิเสธทีหลัง
 */

const CUSTOMER_FACING_ROLES = ["EMPLOYEE", "CASHIER", "MANAGER"] as const;
const MAX_RESULTS = 50;

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }

        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });

        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });

        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

        const search = (request.nextUrl.searchParams.get("search") ?? "").trim();

        const employees = await prisma.user.findMany({
            where: {
                isActive: true,
                role: { in: [...CUSTOMER_FACING_ROLES] },
                ...(scope.stationId ? { stationId: scope.stationId } : {}),
                ...(search
                    ? {
                        OR: [
                            { name: { contains: search } },
                            { nickName: { contains: search } },
                            { employeeId: { contains: search } },
                        ],
                    }
                    : {}),
            },
            select: {
                employeeId: true,
                name: true,
                nickName: true,
                station: { select: { name: true } },
                feedbackQrs: {
                    where: { targetType: "EMPLOYEE" },
                    select: { id: true, isActive: true, publicLabel: true },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
            },
            orderBy: [{ nickName: "asc" }, { name: "asc" }],
            take: MAX_RESULTS,
        });

        return NextResponse.json({
            candidates: employees.map((e) => {
                const existing = e.feedbackQrs[0] ?? null;
                const label = resolveEmployeePublicLabel(e.nickName, e.name);
                return {
                    employeeCode: e.employeeId,
                    name: e.name,
                    nickName: e.nickName,
                    stationName: e.station?.name ?? null,
                    // ป้ายที่จะขึ้นจริงถ้ากดสร้างตอนนี้ — null เมื่อสร้างไม่ได้
                    previewLabel: label.ok ? label.label : null,
                    blockedReason: label.ok ? null : label.message,
                    existingQr: existing
                        ? { id: existing.id, isActive: existing.isActive, publicLabel: existing.publicLabel }
                        : null,
                };
            }),
            truncated: employees.length === MAX_RESULTS,
        });
    } catch (error) {
        console.error("Error listing QR candidates:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
