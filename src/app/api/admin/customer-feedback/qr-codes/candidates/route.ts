import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    getFeedbackAccessContext,
    requireFeedbackPermission,
    getStationScope,
    parseOptionalFeedbackFilter,
} from "@/lib/customer-feedback/access";
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
        if (search.length > 100) {
            return NextResponse.json({ error: "search ยาวเกิน 100 ตัวอักษร" }, { status: 400 });
        }
        const targetType = parseOptionalFeedbackFilter(
            request.nextUrl.searchParams.get("targetType"),
            ["EMPLOYEE", "STATION"] as const,
            "targetType"
        );
        if (!targetType.ok) return NextResponse.json({ error: targetType.message }, { status: 400 });

        if (targetType.value === "STATION") {
            const stationQrKind = parseOptionalFeedbackFilter(
                request.nextUrl.searchParams.get("stationQrKind"),
                ["station", "restroom"] as const,
                "stationQrKind"
            );
            if (!stationQrKind.ok) return NextResponse.json({ error: stationQrKind.message }, { status: 400 });
            const requestedKind = stationQrKind.value ?? "station";

            const stations = await prisma.station.findMany({
                where: {
                    ...(scope.stationId ? { id: scope.stationId } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { name: { contains: search } },
                                  { code: { contains: search } },
                              ],
                          }
                        : {}),
                },
                select: {
                    id: true,
                    name: true,
                    isActive: true,
                    publicEmergencyPhone: true,
                    feedbackQrs: {
                        where: requestedKind === "restroom"
                            ? { targetType: "STATION", placement: "RESTROOM", placementKey: "RESTROOM_MAIN" }
                            : { targetType: "STATION", placement: "STATION_MAIN", isPrimary: true },
                        select: { id: true, isActive: true, publicLabel: true },
                        orderBy: { createdAt: "desc" },
                        take: 1,
                    },
                },
                orderBy: { name: "asc" },
                take: MAX_RESULTS + 1,
            });
            const visibleStations = stations.slice(0, MAX_RESULTS);
            return NextResponse.json({
                stations: visibleStations.map((station) => ({
                    id: station.id,
                    name: station.name,
                    isActive: station.isActive,
                    publicEmergencyPhone: station.publicEmergencyPhone,
                    existingQr: station.feedbackQrs[0] ?? null,
                })),
                truncated: stations.length > MAX_RESULTS,
            });
        }

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
            take: MAX_RESULTS + 1,
        });
        const visibleEmployees = employees.slice(0, MAX_RESULTS);

        return NextResponse.json({
            candidates: visibleEmployees.map((e) => {
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
            truncated: employees.length > MAX_RESULTS,
        });
    } catch (error) {
        console.error("Error listing QR candidates:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
