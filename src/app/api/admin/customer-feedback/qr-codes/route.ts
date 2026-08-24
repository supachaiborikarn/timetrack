import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    getFeedbackAccessContext,
    getStationScope,
    parseOptionalFeedbackFilter,
    requireFeedbackPermission,
    resolveFeedbackStationId,
} from "@/lib/customer-feedback/access";
import { buildQrSecrets, buildFeedbackUrl, buildManualEntryUrl } from "@/lib/customer-feedback/token";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import { resolveEmployeePublicLabel, duplicateLabelWarning } from "@/lib/customer-feedback/public-identity";
import { isValidServiceArea } from "@/lib/customer-feedback/questions";

/**
 * GET  /api/admin/customer-feedback/qr-codes — รายการ QR
 * POST /api/admin/customer-feedback/qr-codes — สร้าง QR (พนักงานหรือสถานี)
 *
 * กติกาสำคัญ: EMPLOYEE QR สร้าง/เปิดไม่ได้ก่อน public profile approval,
 * STATION QR เปิดไม่ได้ถ้าสถานียังไม่มี publicEmergencyPhone
 */

export async function GET(request: NextRequest) {
    if (!isCustomerFeedbackEnabled()) {
        return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
    }
    const access = await getFeedbackAccessContext();
    if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
    const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.manage");
    if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });

    // MANAGER ต้องเห็นเฉพาะสถานีตัวเอง — เดิมไม่ได้ scope ทำให้เห็น QR ทุกสถานี
    const scope = await getStationScope(access.ctx);
    if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

    const url = request.nextUrl;
    const targetType = parseOptionalFeedbackFilter(url.searchParams.get("targetType"), ["EMPLOYEE", "STATION"] as const, "targetType");
    if (!targetType.ok) return NextResponse.json({ error: targetType.message }, { status: 400 });
    const stationId = resolveFeedbackStationId(scope.stationId, url.searchParams.get("stationId"));
    const search = url.searchParams.get("search")?.trim() || undefined;
    if (search && search.length > 100) {
        return NextResponse.json({ error: "search ยาวเกิน 100 ตัวอักษร" }, { status: 400 });
    }

    // เงื่อนไขสถานีกับเงื่อนไขค้นหาต่างก็เป็น OR ต้องรวมด้วย AND
    // ไม่งั้นคีย์ OR ตัวหลังทับตัวหน้า แล้ว scope ของ MANAGER จะหายไปเงียบ ๆ ตอนมีคำค้น
    const conditions: import("@prisma/client").Prisma.CustomerFeedbackQrWhereInput[] = [];
    if (stationId) {
        // QR พนักงานผูกกับคน ไม่ใช่สถานี จึงกรองผ่านสถานีของพนักงานด้วย
        conditions.push({ OR: [{ stationId }, { employee: { stationId } }] });
    }
    if (search) {
        conditions.push({
            OR: [
                { publicLabel: { contains: search } },
                { employee: { name: { contains: search } } },
                { employee: { employeeId: { contains: search } } },
                { station: { name: { contains: search } } },
            ],
        });
    }

    const where: import("@prisma/client").Prisma.CustomerFeedbackQrWhereInput = {
        ...(targetType.value ? { targetType: targetType.value } : {}),
        ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    const qrs = await prisma.customerFeedbackQr.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
            employee: { select: { id: true, name: true, employeeId: true, isActive: true, nickName: true, station: { select: { name: true } } } },
            station: { select: { id: true, name: true, isActive: true, publicEmergencyPhone: true } },
        },
    });

    return NextResponse.json({
        qrCodes: qrs.map((q) => ({
            id: q.id,
            targetType: q.targetType,
            employee: q.employee ? { id: q.employee.id, name: q.employee.name, employeeCode: q.employee.employeeId, isActive: q.employee.isActive, stationName: q.employee.station?.name ?? null } : null,
            station: q.station ? { id: q.station.id, name: q.station.name, isActive: q.station.isActive, publicEmergencyPhone: q.station.publicEmergencyPhone } : null,
            publicLabel: q.publicLabel,
            publicPosition: q.publicPosition,
            publicProfileApprovedAt: q.publicProfileApprovedAt,
            placement: q.placement,
            placementKey: q.placementKey,
            isPrimary: q.isPrimary,
            isActive: q.isActive,
            isTest: q.isTest,
            needsReprint: q.needsReprint,
            version: q.version,
            tokenHint: q.tokenHint,
            manualCodeHint: q.manualCodeHint,
            lastResolvedAt: q.lastResolvedAt,
            lastPrintedAt: q.lastPrintedAt,
            rotatedAt: q.rotatedAt,
            revokedAt: q.revokedAt,
            createdAt: q.createdAt,
        })),
    });
}

interface CreateBody {
    targetType: "EMPLOYEE" | "STATION";
    employeeId?: string;
    employeeCode?: string;
    stationName?: string;
    stationId?: string;
    publicLabel?: string;
    publicPosition?: string;
    approvePublicProfile?: boolean;
    placement?: "STATION_MAIN" | "CASHIER" | "PUMP" | "RESTROOM" | "SHOP" | "OTHER";
    placementKey?: string;
    serviceAreaKey?: string;
    isTest?: boolean;
}

export async function POST(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.manage");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });

        const body = (await request.json()) as CreateBody;
        if (body.targetType !== "EMPLOYEE" && body.targetType !== "STATION") {
            return NextResponse.json({ error: "targetType ไม่ถูกต้อง" }, { status: 400 });
        }
        const stringFields: Array<[string, unknown, number]> = [
            ["employeeId", body.employeeId, 100],
            ["employeeCode", body.employeeCode, 100],
            ["stationId", body.stationId, 100],
            ["stationName", body.stationName, 200],
            ["publicLabel", body.publicLabel, 100],
            ["publicPosition", body.publicPosition, 100],
        ];
        for (const [field, value, maxLength] of stringFields) {
            if (
                value !== undefined &&
                (typeof value !== "string" || !value.trim() || value.trim().length > maxLength)
            ) {
                return NextResponse.json({ error: `${field} ต้องเป็นข้อความยาว 1–${maxLength} ตัวอักษร` }, { status: 400 });
            }
        }
        if (body.approvePublicProfile !== undefined && typeof body.approvePublicProfile !== "boolean") {
            return NextResponse.json({ error: "approvePublicProfile ต้องเป็น true หรือ false" }, { status: 400 });
        }
        if (body.isTest !== undefined && typeof body.isTest !== "boolean") {
            return NextResponse.json({ error: "isTest ต้องเป็น true หรือ false" }, { status: 400 });
        }
        if (
            body.targetType === "EMPLOYEE" &&
            (body.placement !== undefined || body.placementKey !== undefined || body.serviceAreaKey !== undefined)
        ) {
            return NextResponse.json({ error: "ข้อมูลจุดติดตั้งใช้กับ QR สถานีเท่านั้น" }, { status: 400 });
        }
        const stationPlacements = ["STATION_MAIN", "CASHIER", "PUMP", "RESTROOM", "SHOP", "OTHER"] as const;
        if (
            body.targetType === "STATION" &&
            body.placement !== undefined &&
            !stationPlacements.includes(body.placement)
        ) {
            return NextResponse.json({ error: "placement ไม่ถูกต้อง" }, { status: 400 });
        }
        if (
            body.targetType === "STATION" &&
            body.placementKey !== undefined &&
            (typeof body.placementKey !== "string" || !body.placementKey.trim() || body.placementKey.trim().length > 100)
        ) {
            return NextResponse.json({ error: "placementKey ต้องยาว 1–100 ตัวอักษร" }, { status: 400 });
        }
        if (
            body.targetType === "STATION" &&
            body.serviceAreaKey !== undefined &&
            (typeof body.serviceAreaKey !== "string" || !isValidServiceArea(body.serviceAreaKey))
        ) {
            return NextResponse.json({ error: "serviceAreaKey ไม่ถูกต้อง" }, { status: 400 });
        }

        const secrets = buildQrSecrets();
        const now = new Date();

        if (body.targetType === "EMPLOYEE") {
            if (body.employeeId && body.employeeCode) {
                return NextResponse.json({ error: "ระบุ employeeId หรือ employeeCode อย่างใดอย่างหนึ่ง" }, { status: 400 });
            }
            let employee;
            if (body.employeeCode) {
                employee = await prisma.user.findUnique({ where: { employeeId: body.employeeCode.trim() } });
            } else if (body.employeeId) {
                employee = await prisma.user.findUnique({ where: { id: body.employeeId.trim() } });
            }
            if (!body.employeeId && !body.employeeCode) return NextResponse.json({ error: "ต้องระบุ employeeId หรือ employeeCode" }, { status: 400 });
            if (!employee) return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 });
            if (!employee.isActive) return NextResponse.json({ error: "พนักงานไม่อยู่ในสถานะทำงาน" }, { status: 400 });

            // ห้ามมี EMPLOYEE QR active ซ้อน (partial unique index เป็นด่านสุดท้าย)
            const existingActive = await prisma.customerFeedbackQr.findFirst({
                where: { employeeId: employee.id, targetType: "EMPLOYEE", isActive: true },
            });
            if (existingActive) {
                return NextResponse.json({ error: "พนักงานคนนี้มี QR ที่ยังใช้งานอยู่แล้ว" }, { status: 409 });
            }

            // ป้ายพนักงานใช้ชื่อเล่นเท่านั้น ไม่มี fallback ไปชื่อจริง
            const labelResult = resolveEmployeePublicLabel(employee.nickName, employee.name, body.publicLabel);
            if (!labelResult.ok) {
                return NextResponse.json({ error: labelResult.message, reason: labelResult.reason }, { status: 400 });
            }
            const draftLabel = labelResult.label;

            // ชื่อเล่นซ้ำในสถานีเดียวกัน = ลูกค้าแยกไม่ออกว่าให้คะแนนใคร
            // สิทธิ์จัดการ QR ยึดสถานีหลักของพนักงานให้ตรงกันทั้งหน้าเลือก รายการ และหน้าแก้ไข
            const employeeStationId = employee.stationId;
            if (scope.stationId && employeeStationId !== scope.stationId) {
                return NextResponse.json({ error: "ไม่มีสิทธิ์สร้าง QR ให้พนักงานของสถานีอื่น" }, { status: 403 });
            }
            const stationPeers = employeeStationId
                ? await prisma.customerFeedbackQr.findMany({
                    where: {
                        targetType: "EMPLOYEE",
                        isActive: true,
                        employeeId: { not: employee.id },
                        employee: { isActive: true, stationId: employeeStationId },
                    },
                    select: { publicLabel: true },
                })
                : [];
            const labelWarning = duplicateLabelWarning(draftLabel, stationPeers.map((p) => p.publicLabel));

            const approved = body.approvePublicProfile === true;

            const creation = await prisma.$transaction(async (tx) => {
                // ล็อก User ก่อน QR ให้เรียงลำดับเดียวกับ deactivate/submit และอ่านสิทธิ์ซ้ำหลังได้ lock
                await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${employee.id} FOR UPDATE`);
                const currentEmployee = await tx.user.findUnique({
                    where: { id: employee.id },
                    select: { isActive: true, stationId: true },
                });
                if (!currentEmployee?.isActive) return { status: "TARGET_INACTIVE" as const };
                if (scope.stationId && currentEmployee.stationId !== scope.stationId) {
                    return { status: "OUT_OF_SCOPE" as const };
                }
                if (body.isTest !== true) {
                    const existingProduction = await tx.customerFeedbackQr.findFirst({
                        where: { targetType: "EMPLOYEE", employeeId: employee.id, isTest: false },
                        select: { id: true },
                    });
                    if (existingProduction) return { status: "PRODUCTION_EXISTS" as const };
                }
                const currentActive = await tx.customerFeedbackQr.findFirst({
                    where: { employeeId: employee.id, targetType: "EMPLOYEE", isActive: true },
                    select: { id: true },
                });
                if (currentActive) return { status: "ACTIVE_EXISTS" as const };
                const created = await tx.customerFeedbackQr.create({
                    data: {
                        ...secrets.columns,
                        targetType: "EMPLOYEE",
                        employeeId: employee.id,
                        stationId: null,
                        publicLabel: draftLabel,
                        publicPosition: body.publicPosition?.trim() ?? "พนักงานบริการ",
                        publicProfileApprovedAt: approved ? now : null,
                        publicProfileApprovedById: approved ? session.user!.id : null,
                        placement: "EMPLOYEE_BADGE",
                        placementKey: "EMPLOYEE_PRIMARY",
                        isPrimary: true,
                        isActive: false,
                        isTest: body.isTest ?? false,
                        needsReprint: true,
                        createdById: session.user!.id,
                    },
                });
                await tx.auditLog.create({
                    data: {
                        action: "CUSTOMER_FEEDBACK_QR_CREATED",
                        entity: "CustomerFeedbackQr",
                        entityId: created.id,
                        details: JSON.stringify({ targetType: "EMPLOYEE", employeeId: employee.id, isTest: body.isTest ?? false }),
                        userId: session.user!.id,
                    },
                });
                return { status: "CREATED" as const, qr: created };
            });
            if (creation.status === "TARGET_INACTIVE") {
                return NextResponse.json({ error: "พนักงานไม่อยู่ในสถานะทำงาน" }, { status: 400 });
            }
            if (creation.status === "OUT_OF_SCOPE") {
                return NextResponse.json({ error: "ไม่มีสิทธิ์สร้าง QR ให้พนักงานของสถานีอื่น" }, { status: 403 });
            }
            if (creation.status === "ACTIVE_EXISTS") {
                return NextResponse.json({ error: "พนักงานคนนี้มี QR ที่ยังใช้งานอยู่แล้ว" }, { status: 409 });
            }
            if (creation.status === "PRODUCTION_EXISTS") {
                return NextResponse.json(
                    { error: "เป้าหมายนี้มี QR ใช้งานจริงอยู่แล้ว กรุณาใช้รายการเดิม" },
                    { status: 409 }
                );
            }
            const qr = creation.qr;

            return NextResponse.json({
                qrCode: { id: qr.id, publicLabel: qr.publicLabel, needsApproval: !approved },
                warning: labelWarning,
                // ส่งกลับเฉพาะตอนสร้างเพื่อพิมพ์ป้ายแรก
                token: secrets.token,
                manualCode: secrets.manualCode,
                qrUrl: buildFeedbackUrl(secrets.token),
                manualEntryUrl: buildManualEntryUrl(),
            });
        }

        // STATION
        if (body.stationId && body.stationName) {
            return NextResponse.json({ error: "ระบุ stationId หรือ stationName อย่างใดอย่างหนึ่ง" }, { status: 400 });
        }
        let station;
        if (body.stationName) {
            station = await prisma.station.findFirst({ where: { name: body.stationName.trim() }, orderBy: { name: "asc" } });
        } else if (body.stationId) {
            station = await prisma.station.findUnique({ where: { id: body.stationId.trim() } });
        }
        if (!body.stationId && !body.stationName) return NextResponse.json({ error: "ต้องระบุ stationId หรือ stationName" }, { status: 400 });
        if (!station) return NextResponse.json({ error: "ไม่พบสถานี" }, { status: 404 });
        if (scope.stationId && station.id !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์สร้าง QR ให้สถานีอื่น" }, { status: 403 });
        }
        if (!station.isActive) return NextResponse.json({ error: "สถานีนี้ปิดใช้งานอยู่" }, { status: 400 });
        if (!station.publicEmergencyPhone) {
            return NextResponse.json(
                { error: "สถานีนี้ยังไม่มีหมายเลขฉุกเฉินสาธารณะ กรุณาตั้งค่าก่อนสร้าง QR ประเมินสถานี" },
                { status: 400 }
            );
        }

        const placement = body.placement ?? "STATION_MAIN";
        const placementKey = body.placementKey?.trim() ?? "MAIN";
        const isPrimary = placement === "STATION_MAIN";

        const creation = await prisma.$transaction(async (tx) => {
            // ล็อก Station ก่อน QR ให้สถานะสถานีกับการสร้างรหัสเป็นเหตุการณ์เดียวกัน
            await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${station.id} FOR UPDATE`);
            const currentStation = await tx.station.findUnique({
                where: { id: station.id },
                select: { name: true, isActive: true, publicEmergencyPhone: true },
            });
            if (!currentStation?.isActive) return { status: "STATION_INACTIVE" as const };
            if (!currentStation.publicEmergencyPhone) return { status: "PHONE_MISSING" as const };
            if (scope.stationId && station.id !== scope.stationId) return { status: "OUT_OF_SCOPE" as const };
            if (body.isTest !== true) {
                const existingProduction = await tx.customerFeedbackQr.findFirst({
                    where: {
                        targetType: "STATION",
                        stationId: station.id,
                        placement,
                        placementKey,
                        isTest: false,
                    },
                    select: { id: true },
                });
                if (existingProduction) return { status: "PRODUCTION_EXISTS" as const };
            }
            const created = await tx.customerFeedbackQr.create({
                data: {
                    ...secrets.columns,
                    targetType: "STATION",
                    employeeId: null,
                    stationId: station.id,
                    publicLabel: currentStation.name,
                    publicPosition: null,
                    placement,
                    placementKey,
                    serviceAreaKey: body.serviceAreaKey ?? null,
                    isPrimary,
                    isActive: false,
                    isTest: body.isTest ?? false,
                    needsReprint: true,
                    createdById: session.user!.id,
                },
            });
            await tx.auditLog.create({
                data: {
                    action: "CUSTOMER_FEEDBACK_QR_CREATED",
                    entity: "CustomerFeedbackQr",
                    entityId: created.id,
                    details: JSON.stringify({ targetType: "STATION", stationId: station.id, placement, isTest: body.isTest ?? false }),
                    userId: session.user!.id,
                },
            });
            return { status: "CREATED" as const, qr: created };
        });
        if (creation.status === "STATION_INACTIVE") {
            return NextResponse.json({ error: "สถานีนี้ปิดใช้งานอยู่" }, { status: 400 });
        }
        if (creation.status === "PHONE_MISSING") {
            return NextResponse.json(
                { error: "สถานีนี้ยังไม่มีหมายเลขฉุกเฉินสาธารณะ กรุณาตั้งค่าก่อนสร้าง QR ประเมินสถานี" },
                { status: 400 }
            );
        }
        if (creation.status === "OUT_OF_SCOPE") {
            return NextResponse.json({ error: "ไม่มีสิทธิ์สร้าง QR ให้สถานีอื่น" }, { status: 403 });
        }
        if (creation.status === "PRODUCTION_EXISTS") {
            return NextResponse.json(
                { error: "เป้าหมายนี้มี QR ใช้งานจริงอยู่แล้ว กรุณาใช้รายการเดิม" },
                { status: 409 }
            );
        }
        const qr = creation.qr;

        return NextResponse.json({
            qrCode: { id: qr.id },
            token: secrets.token,
            manualCode: secrets.manualCode,
            qrUrl: buildFeedbackUrl(secrets.token),
            manualEntryUrl: buildManualEntryUrl(),
        });
    } catch (error) {
        console.error("Error creating feedback QR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
