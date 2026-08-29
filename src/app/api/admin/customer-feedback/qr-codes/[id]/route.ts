import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext, getStationScope, requireFeedbackPermission } from "@/lib/customer-feedback/access";
import { buildQrSecrets, buildFeedbackUrl, buildManualEntryUrl, revealQrToken, revealQrManualCode } from "@/lib/customer-feedback/token";
import { isStationFeedbackEnabled } from "@/lib/customer-feedback/station-context";
import { resolveEmployeePublicLabel } from "@/lib/customer-feedback/public-identity";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";

/**
 * PATCH /api/admin/customer-feedback/qr-codes/[id]
 * actions: activate | deactivate | rotate | promote-test | approve-public-profile | update-label | MARK_PRINTED | reveal
 */

type Action = "activate" | "deactivate" | "rotate" | "promote-test" | "approve-public-profile" | "update-label" | "MARK_PRINTED" | "reveal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { id } = await params;
        const body = (await request.json()) as {
            action: Action;
            publicLabel?: string;
            publicPosition?: string;
            expectedVersion?: number;
        };
        if (!["activate", "deactivate", "rotate", "promote-test", "approve-public-profile", "update-label", "MARK_PRINTED", "reveal"].includes(body.action)) {
            return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }
        const qr = await prisma.customerFeedbackQr.findUnique({
            where: { id },
            include: {
                employee: { select: { id: true, isActive: true, stationId: true } },
                station: { select: { id: true, isActive: true, publicEmergencyPhone: true } },
            },
        });
        if (!qr) return NextResponse.json({ error: "ไม่พบ QR" }, { status: 404 });
        // ใช้สถานีหลักของพนักงานเหมือนหน้าเลือกและ API สร้าง QR
        const qrStationId = qr.targetType === "STATION" ? qr.stationId : qr.employee?.stationId;
        if (scope.stationId && qrStationId !== scope.stationId) {
            return NextResponse.json({ error: "ไม่มีสิทธิ์จัดการ QR ของสถานีนี้" }, { status: 403 });
        }

        const now = new Date();

        switch (body.action) {
            case "activate": {
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของ QR ที่กำลังเปิด" }, { status: 400 });
                }
                if (body.expectedVersion !== qr.version) {
                    return NextResponse.json({ error: "QR ถูกแก้โดยผู้ใช้อื่นแล้ว กรุณาโหลดใหม่" }, { status: 409 });
                }
                if (qr.isActive) return NextResponse.json({ error: "QR นี้เปิดใช้งานอยู่แล้ว" }, { status: 409 });
                if (qr.targetType === "EMPLOYEE") {
                    if (!qr.publicProfileApprovedAt) {
                        return NextResponse.json({ error: "ต้องบันทึกว่าพนักงานรับทราบข้อมูลสาธารณะก่อนเปิดใช้งาน" }, { status: 400 });
                    }
                    if (!qr.publicLabel || !qr.publicPosition) {
                        return NextResponse.json({ error: "ต้องมีชื่อและตำแหน่งสาธารณะครบก่อนเปิดใช้งาน" }, { status: 400 });
                    }
                    if (!qr.employee?.isActive) {
                        return NextResponse.json({ error: "พนักงานไม่อยู่ในสถานะทำงาน" }, { status: 400 });
                    }
                    const activeOther = await prisma.customerFeedbackQr.findFirst({
                        where: { employeeId: qr.employeeId, targetType: "EMPLOYEE", isActive: true, id: { not: qr.id } },
                    });
                    if (activeOther) return NextResponse.json({ error: "พนักงานมี QR ที่ใช้งานอยู่แล้ว" }, { status: 409 });
                } else {
                    const enabled = await isStationFeedbackEnabled(qr.stationId!);
                    if (!qr.isPrimary && !enabled) {
                        return NextResponse.json({ error: "ต้องเปิด QR หลักของสถานีก่อนเปิด QR จุดย่อย" }, { status: 400 });
                    }
                    if (qr.isPrimary && !enabled) {
                        // สถานียังไม่ผ่านเงื่อนไข (inactive หรือไม่มี emergency phone)
                        if (!qr.station?.isActive || !qr.station?.publicEmergencyPhone) {
                            return NextResponse.json({ error: "สถานีต้อง active และมีหมายเลขฉุกเฉินสาธารณะก่อนเปิด QR" }, { status: 400 });
                        }
                    }
                    if (!qr.station?.isActive || !qr.station?.publicEmergencyPhone) {
                        return NextResponse.json({ error: "สถานีต้อง active และมีหมายเลขฉุกเฉินสาธารณะก่อนเปิด QR" }, { status: 400 });
                    }
                    if (qr.isPrimary) {
                        const activeOther = await prisma.customerFeedbackQr.findFirst({
                            where: {
                                stationId: qr.stationId,
                                targetType: "STATION",
                                isPrimary: true,
                                isActive: true,
                                id: { not: qr.id },
                            },
                            select: { id: true },
                        });
                        if (activeOther) {
                            return NextResponse.json({ error: "สถานีนี้มี QR หลักที่ใช้งานอยู่แล้ว" }, { status: 409 });
                        }
                    }
                }
                if (qr.needsReprint) {
                    return NextResponse.json({ error: "ต้องพิมพ์ป้าย QR เวอร์ชันปัจจุบันก่อนเปิดใช้งาน" }, { status: 400 });
                }
                const activated = await prisma.$transaction(async (tx) => {
                    if (qr.targetType === "EMPLOYEE") {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${qr.employeeId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackQr" WHERE "id" = ${id} FOR UPDATE`);
                        const employee = qr.employeeId ? await tx.user.findUnique({
                            where: { id: qr.employeeId },
                            select: { isActive: true },
                        }) : null;
                        if (!employee?.isActive) return { status: "TARGET_INACTIVE" as const };
                        const activeOther = await tx.customerFeedbackQr.findFirst({
                            where: { employeeId: qr.employeeId, targetType: "EMPLOYEE", isActive: true, id: { not: id } },
                            select: { id: true },
                        });
                        if (activeOther) return { status: "OTHER_ACTIVE" as const };
                    } else {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${qr.stationId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`
                            SELECT "id" FROM "CustomerFeedbackQr"
                            WHERE "stationId" = ${qr.stationId}
                              AND "targetType" = 'STATION'
                              AND ("id" = ${id} OR "isPrimary" = true)
                            ORDER BY "id"
                            FOR UPDATE
                        `);
                        const station = qr.stationId ? await tx.station.findUnique({
                            where: { id: qr.stationId },
                            select: { isActive: true, publicEmergencyPhone: true },
                        }) : null;
                        if (!station?.isActive || !station.publicEmergencyPhone) {
                            return { status: "STATION_INELIGIBLE" as const };
                        }
                        const activePrimary = await tx.customerFeedbackQr.findFirst({
                            where: {
                                stationId: qr.stationId,
                                targetType: "STATION",
                                isPrimary: true,
                                isActive: true,
                                ...(qr.isPrimary ? { id: { not: id } } : {}),
                            },
                            select: { id: true },
                        });
                        if (qr.isPrimary && activePrimary) return { status: "OTHER_ACTIVE" as const };
                        if (!qr.isPrimary && !activePrimary) return { status: "PRIMARY_REQUIRED" as const };
                    }
                    const updated = await tx.customerFeedbackQr.updateMany({
                        where: { id, version: body.expectedVersion, isActive: false, needsReprint: false },
                        data: { isActive: true, revokedAt: null },
                    });
                    if (updated.count !== 1) return { status: "STALE" as const };
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_ACTIVATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({ version: qr.version }),
                            userId: session.user.id,
                        },
                    });
                    return { status: "ACTIVATED" as const };
                });
                if (activated.status === "TARGET_INACTIVE") {
                    return NextResponse.json({ error: "พนักงานไม่อยู่ในสถานะทำงาน" }, { status: 400 });
                }
                if (activated.status === "STATION_INELIGIBLE") {
                    return NextResponse.json({ error: "สถานีต้อง active และมีหมายเลขฉุกเฉินสาธารณะก่อนเปิด QR" }, { status: 400 });
                }
                if (activated.status === "PRIMARY_REQUIRED") {
                    return NextResponse.json({ error: "ต้องเปิด QR หลักของสถานีก่อนเปิด QR จุดย่อย" }, { status: 400 });
                }
                if (activated.status === "OTHER_ACTIVE") {
                    return NextResponse.json({ error: "เป้าหมายนี้มี QR ที่ใช้งานอยู่แล้ว" }, { status: 409 });
                }
                if (activated.status === "STALE") {
                    return NextResponse.json({ error: "QR เปลี่ยนเวอร์ชันหรือสถานะระหว่างทำรายการ กรุณาโหลดใหม่" }, { status: 409 });
                }
                return NextResponse.json({ message: "เปิดใช้งานแล้ว" });
            }

            case "deactivate": {
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของ QR ที่กำลังปิด" }, { status: 400 });
                }
                if (body.expectedVersion !== qr.version) {
                    return NextResponse.json({ error: "QR ถูกแก้โดยผู้ใช้อื่นแล้ว กรุณาโหลดใหม่" }, { status: 409 });
                }
                // QR ที่มีคำตอบห้าม hard delete — ใช้การปิดใช้งาน (ไม่มี hard delete API เลย)
                const deactivated = await prisma.$transaction(async (tx) => {
                    if (qr.targetType === "EMPLOYEE") {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${qr.employeeId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackQr" WHERE "id" = ${id} FOR UPDATE`);
                    } else {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${qr.stationId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`
                            SELECT "id" FROM "CustomerFeedbackQr"
                            WHERE "stationId" = ${qr.stationId} AND "targetType" = 'STATION'
                            ORDER BY "id"
                            FOR UPDATE
                        `);
                    }
                    const current = await tx.customerFeedbackQr.findUnique({
                        where: { id },
                        select: { version: true, isActive: true },
                    });
                    if (!current?.isActive || current.version !== body.expectedVersion) return false;
                    const updated = await tx.customerFeedbackQr.updateMany({
                        where: qr.targetType === "STATION" && qr.isPrimary
                            ? { stationId: qr.stationId, targetType: "STATION", isActive: true }
                            : { id, version: body.expectedVersion, isActive: true },
                        data: { isActive: false, revokedAt: now },
                    });
                    if (updated.count < 1) return false;
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_DEACTIVATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({ version: body.expectedVersion, closedQrCount: updated.count }),
                            userId: session.user.id,
                        },
                    });
                    return true;
                });
                if (!deactivated) {
                    return NextResponse.json({ error: "QR เปลี่ยนเวอร์ชันหรือสถานะระหว่างทำรายการ กรุณาโหลดใหม่" }, { status: 409 });
                }
                return NextResponse.json({ message: "ปิดใช้งานแล้ว" });
            }

            case "rotate": {
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของ QR ที่กำลังหมุนรหัส" }, { status: 400 });
                }
                if (body.expectedVersion !== qr.version) {
                    return NextResponse.json({ error: "QR ถูกแก้โดยผู้ใช้อื่นแล้ว กรุณาโหลดใหม่" }, { status: 409 });
                }
                const secrets = buildQrSecrets();
                const rotated = await prisma.$transaction(async (tx) => {
                    if (qr.targetType === "STATION" && qr.isPrimary && qr.stationId) {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${qr.stationId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`
                            SELECT "id" FROM "CustomerFeedbackQr"
                            WHERE "stationId" = ${qr.stationId} AND "targetType" = 'STATION'
                            ORDER BY "id"
                            FOR UPDATE
                        `);
                    }
                    const updated = await tx.customerFeedbackQr.updateMany({
                        where: { id, version: body.expectedVersion },
                        data: {
                            ...secrets.columns,
                            version: { increment: 1 },
                            isActive: false,
                            needsReprint: true,
                            lastPrintedAt: null,
                            lastPrintedById: null,
                            rotatedAt: now,
                            revokedAt: now,
                        },
                    });
                    if (updated.count !== 1) return false;
                    const closedSecondaries = qr.targetType === "STATION" && qr.isPrimary && qr.stationId
                        ? await tx.customerFeedbackQr.updateMany({
                            where: {
                                stationId: qr.stationId,
                                targetType: "STATION",
                                id: { not: id },
                                isActive: true,
                            },
                            data: { isActive: false, revokedAt: now },
                        })
                        : { count: 0 };
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_ROTATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({
                                previousVersion: qr.version,
                                nextVersion: qr.version + 1,
                                closedSecondaryCount: closedSecondaries.count,
                            }),
                            userId: session.user.id,
                        },
                    });
                    return true;
                });
                if (!rotated) {
                    return NextResponse.json({ error: "QR เปลี่ยนเวอร์ชันระหว่างทำรายการ กรุณาโหลดใหม่" }, { status: 409 });
                }
                return NextResponse.json({
                    message: "หมุนรหัสแล้ว ป้ายเก่าใช้ไม่ได้ กรุณาพิมพ์ป้ายใหม่",
                    version: qr.version + 1,
                    token: secrets.token,
                    manualCode: secrets.manualCode,
                    qrUrl: buildFeedbackUrl(secrets.token),
                    manualEntryUrl: buildManualEntryUrl(),
                    publicLabel: qr.publicLabel,
                    publicPosition: qr.publicPosition,
                });
            }

            case "promote-test": {
                if (!qr.isTest) {
                    return NextResponse.json({ error: "QR นี้เป็นแบบใช้งานจริงอยู่แล้ว" }, { status: 409 });
                }
                if (qr.isActive) {
                    return NextResponse.json({ error: "ต้องปิด QR ทดสอบก่อนเปลี่ยนเป็นใช้งานจริง" }, { status: 400 });
                }
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของ QR ทดสอบ" }, { status: 400 });
                }
                const archivedTestSecrets = buildQrSecrets();
                const productionSecrets = buildQrSecrets();
                const promoted = await prisma.$transaction(async (tx) => {
                    const targetLockId = qr.targetType === "EMPLOYEE" ? qr.employeeId : qr.stationId;
                    if (!targetLockId) return { status: "STALE" as const };
                    // ใช้ลำดับ lock กลาง User/Station -> QR เพื่อไม่ชนเป็นวงกับ feedback submit
                    if (qr.targetType === "EMPLOYEE") {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${targetLockId} FOR UPDATE`);
                    } else {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${targetLockId} FOR UPDATE`);
                    }

                    const existingProduction = await tx.customerFeedbackQr.findFirst({
                        where: qr.targetType === "EMPLOYEE"
                            ? { targetType: "EMPLOYEE", employeeId: qr.employeeId, isTest: false }
                            : {
                                targetType: "STATION",
                                stationId: qr.stationId,
                                placement: qr.placement,
                                placementKey: qr.placementKey,
                                isTest: false,
                            },
                        select: { id: true },
                    });
                    if (existingProduction) return { status: "EXISTS" as const };

                    // ปิดและเพิ่ม version ให้แถว TEST เดิม แล้วสร้าง production เป็นคนละแถว
                    // เพื่อไม่ปน Visit, Response และสัญญาณ abuse จากการทดสอบ
                    const sourceUpdated = await tx.customerFeedbackQr.updateMany({
                        where: { id, version: body.expectedVersion, isTest: true, isActive: false },
                        data: {
                            ...archivedTestSecrets.columns,
                            version: { increment: 1 },
                            needsReprint: true,
                            lastPrintedAt: null,
                            lastPrintedById: null,
                            rotatedAt: now,
                            revokedAt: now,
                        },
                    });
                    if (sourceUpdated.count !== 1) return { status: "STALE" as const };

                    const created = await tx.customerFeedbackQr.create({
                        data: {
                            ...productionSecrets.columns,
                            targetType: qr.targetType,
                            employeeId: qr.employeeId,
                            stationId: qr.stationId,
                            publicLabel: qr.publicLabel,
                            publicPosition: qr.publicPosition,
                            publicProfileApprovedAt: qr.publicProfileApprovedAt,
                            publicProfileApprovedById: qr.publicProfileApprovedById,
                            placement: qr.placement,
                            placementKey: qr.placementKey,
                            serviceAreaKey: qr.serviceAreaKey,
                            isPrimary: qr.isPrimary,
                            isActive: false,
                            isTest: false,
                            needsReprint: true,
                            createdById: session.user.id,
                        },
                    });
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_PROMOTED_FROM_TEST",
                            entity: "CustomerFeedbackQr",
                            entityId: created.id,
                            details: JSON.stringify({ sourceTestQrId: id, sourceVersion: qr.version }),
                            userId: session.user.id,
                        },
                    });
                    return { status: "CREATED" as const, qr: created };
                });
                if (promoted.status === "STALE") {
                    return NextResponse.json({ error: "QR ถูกแก้ระหว่างทำรายการ กรุณาโหลดใหม่" }, { status: 409 });
                }
                if (promoted.status === "EXISTS") {
                    return NextResponse.json({ error: "เป้าหมายนี้มี QR ใช้งานจริงอยู่แล้ว กรุณาใช้รายการเดิม" }, { status: 409 });
                }
                return NextResponse.json({
                    message: "สร้าง QR ใช้งานจริงแยกจาก QR ทดสอบแล้ว กรุณาพิมพ์ป้ายใหม่ก่อนเปิดใช้งาน",
                    qrCode: { id: promoted.qr.id },
                    sourceQrId: id,
                    version: promoted.qr.version,
                    token: productionSecrets.token,
                    manualCode: productionSecrets.manualCode,
                    qrUrl: buildFeedbackUrl(productionSecrets.token),
                    manualEntryUrl: buildManualEntryUrl(),
                    publicLabel: qr.publicLabel,
                    publicPosition: qr.publicPosition,
                });
            }

            case "approve-public-profile": {
                if (qr.targetType !== "EMPLOYEE") {
                    return NextResponse.json({ error: "ใช้กับ QR พนักงานเท่านั้น" }, { status: 400 });
                }
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของข้อมูลที่พนักงานรับทราบ" }, { status: 400 });
                }
                if (!qr.publicLabel || !qr.publicPosition) {
                    return NextResponse.json({ error: "ชื่อและตำแหน่งสาธารณะยังไม่ครบ" }, { status: 400 });
                }
                const approved = await prisma.$transaction(async (tx) => {
                    const updated = await tx.customerFeedbackQr.updateMany({
                        where: { id, version: body.expectedVersion, targetType: "EMPLOYEE" },
                        data: { publicProfileApprovedAt: now, publicProfileApprovedById: session.user.id },
                    });
                    if (updated.count !== 1) return false;
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_PUBLIC_PROFILE_APPROVED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({ publicLabel: qr.publicLabel, publicPosition: qr.publicPosition }),
                            userId: session.user.id,
                        },
                    });
                    return true;
                });
                if (!approved) {
                    return NextResponse.json({ error: "ข้อมูลบนป้ายถูกแก้ระหว่างรับทราบ กรุณาโหลดใหม่" }, { status: 409 });
                }
                return NextResponse.json({ message: "บันทึกการรับทราบข้อมูลสาธารณะแล้ว" });
            }

            case "update-label": {
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของข้อมูลที่กำลังแก้" }, { status: 400 });
                }
                if (typeof body.publicLabel !== "string" || !body.publicLabel.trim()) {
                    return NextResponse.json({ error: "ต้องระบุชื่อ" }, { status: 400 });
                }
                const publicLabel = body.publicLabel.trim();
                if (publicLabel.length > 100) {
                    return NextResponse.json({ error: "ชื่อบนป้ายยาวไม่เกิน 100 ตัวอักษร" }, { status: 400 });
                }
                if (body.publicPosition !== undefined && typeof body.publicPosition !== "string") {
                    return NextResponse.json({ error: "ตำแหน่งบนป้ายไม่ถูกต้อง" }, { status: 400 });
                }
                const requestedPosition = body.publicPosition?.trim();
                if (requestedPosition && requestedPosition.length > 100) {
                    return NextResponse.json({ error: "ตำแหน่งบนป้ายยาวไม่เกิน 100 ตัวอักษร" }, { status: 400 });
                }
                // ป้ายพนักงานต้องเป็นชื่อเล่นเสมอ แก้ทีหลังก็เปลี่ยนกลับไปเป็นชื่อจริงไม่ได้
                if (qr.targetType === "EMPLOYEE") {
                    const owner = qr.employeeId
                        ? await prisma.user.findUnique({
                            where: { id: qr.employeeId },
                            select: { nickName: true, name: true },
                        })
                        : null;
                    const labelResult = resolveEmployeePublicLabel(
                        owner?.nickName ?? null,
                        owner?.name ?? "",
                        publicLabel
                    );
                    if (!labelResult.ok) {
                        return NextResponse.json(
                            { error: labelResult.message, reason: labelResult.reason },
                            { status: 400 }
                        );
                    }
                }
                const nextPosition = requestedPosition || qr.publicPosition;
                if (publicLabel === qr.publicLabel && nextPosition === qr.publicPosition) {
                    return NextResponse.json({ message: "ข้อมูลบนป้ายไม่มีการเปลี่ยนแปลง", version: qr.version });
                }
                // แก้ label ต้องเพิ่ม version เพื่อให้หน้าพิมพ์เก่าบันทึกว่าพิมพ์สำเร็จไม่ได้
                const labelSecrets = buildQrSecrets();
                const updatedLabel = await prisma.$transaction(async (tx) => {
                    if (qr.targetType === "STATION" && qr.isPrimary && qr.stationId) {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Station" WHERE "id" = ${qr.stationId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`
                            SELECT "id" FROM "CustomerFeedbackQr"
                            WHERE "stationId" = ${qr.stationId} AND "targetType" = 'STATION'
                            ORDER BY "id"
                            FOR UPDATE
                        `);
                    }
                    const updated = await tx.customerFeedbackQr.updateMany({
                        where: { id, version: body.expectedVersion },
                        data: {
                            ...labelSecrets.columns,
                            publicLabel,
                            publicPosition: nextPosition,
                            version: { increment: 1 },
                            isActive: false,
                            revokedAt: qr.isActive ? now : qr.revokedAt,
                            publicProfileApprovedAt: null,
                            publicProfileApprovedById: null,
                            needsReprint: true,
                            lastPrintedAt: null,
                            lastPrintedById: null,
                            rotatedAt: now,
                        },
                    });
                    if (updated.count !== 1) return false;
                    const closedSecondaries = qr.targetType === "STATION" && qr.isPrimary && qr.stationId
                        ? await tx.customerFeedbackQr.updateMany({
                            where: {
                                stationId: qr.stationId,
                                targetType: "STATION",
                                id: { not: id },
                                isActive: true,
                            },
                            data: { isActive: false, revokedAt: now },
                        })
                        : { count: 0 };
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_LABEL_UPDATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({
                                publicLabel,
                                previousVersion: qr.version,
                                nextVersion: qr.version + 1,
                                closedSecondaryCount: closedSecondaries.count,
                            }),
                            userId: session.user.id,
                        },
                    });
                    return true;
                });
                if (!updatedLabel) {
                    return NextResponse.json({ error: "ข้อมูลบนป้ายถูกแก้โดยผู้ใช้อื่นแล้ว กรุณาโหลดใหม่" }, { status: 409 });
                }
                return NextResponse.json({
                    message: "แก้ข้อมูลสาธารณะแล้ว ต้องขอการรับทราบใหม่และพิมพ์ป้ายใหม่ก่อนเปิดใช้งาน",
                    version: qr.version + 1,
                    token: labelSecrets.token,
                    manualCode: labelSecrets.manualCode,
                    qrUrl: buildFeedbackUrl(labelSecrets.token),
                    manualEntryUrl: buildManualEntryUrl(),
                    publicLabel,
                    publicPosition: nextPosition,
                });
            }

            case "MARK_PRINTED": {
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของป้ายที่พิมพ์" }, { status: 400 });
                }
                if (body.expectedVersion !== qr.version) {
                    return NextResponse.json({ error: "QR เปลี่ยนเวอร์ชันระหว่างพิมพ์ กรุณาพิมพ์ป้ายเวอร์ชันใหม่" }, { status: 409 });
                }
                if (qr.targetType === "EMPLOYEE") {
                    if (!qr.publicProfileApprovedAt) {
                        return NextResponse.json({ error: "ต้องบันทึกว่าพนักงานรับทราบข้อมูลสาธารณะก่อนพิมพ์" }, { status: 400 });
                    }
                    if (!qr.publicLabel || !qr.publicPosition) {
                        return NextResponse.json({ error: "ต้องมีชื่อและตำแหน่งสาธารณะครบก่อนพิมพ์" }, { status: 400 });
                    }
                    if (!qr.employee?.isActive) {
                        return NextResponse.json({ error: "พนักงานไม่อยู่ในสถานะทำงาน" }, { status: 400 });
                    }
                }

                const marked = await prisma.$transaction(async (tx) => {
                    if (qr.targetType === "EMPLOYEE") {
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${qr.employeeId} FOR UPDATE`);
                        await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackQr" WHERE "id" = ${id} FOR UPDATE`);
                        const current = await tx.customerFeedbackQr.findUnique({
                            where: { id },
                            select: {
                                version: true,
                                isActive: true,
                                employeeId: true,
                                publicProfileApprovedAt: true,
                                publicLabel: true,
                                publicPosition: true,
                            },
                        });
                        if (!current || current.version !== body.expectedVersion) return { status: "STALE" as const };
                        if (!current.publicProfileApprovedAt || !current.publicLabel || !current.publicPosition) {
                            return { status: "PROFILE_NOT_APPROVED" as const };
                        }
                        const employee = current.employeeId ? await tx.user.findUnique({
                            where: { id: current.employeeId },
                            select: { isActive: true },
                        }) : null;
                        if (!employee?.isActive) return { status: "TARGET_INACTIVE" as const };
                        const activeOther = await tx.customerFeedbackQr.findFirst({
                            where: {
                                employeeId: current.employeeId,
                                targetType: "EMPLOYEE",
                                isActive: true,
                                id: { not: id },
                            },
                            select: { id: true },
                        });
                        if (activeOther) return { status: "OTHER_ACTIVE" as const };

                        const autoActivated = !current.isActive;
                        const updated = await tx.customerFeedbackQr.updateMany({
                            where: { id, version: body.expectedVersion },
                            data: {
                                lastPrintedAt: now,
                                lastPrintedById: session.user.id,
                                needsReprint: false,
                                isActive: true,
                                revokedAt: null,
                            },
                        });
                        if (updated.count !== 1) return { status: "STALE" as const };
                        await tx.auditLog.create({
                            data: {
                                action: "CUSTOMER_FEEDBACK_QR_PRINTED",
                                entity: "CustomerFeedbackQr",
                                entityId: id,
                                details: JSON.stringify({ version: body.expectedVersion, autoActivated }),
                                userId: session.user.id,
                            },
                        });
                        if (autoActivated) {
                            await tx.auditLog.create({
                                data: {
                                    action: "CUSTOMER_FEEDBACK_QR_ACTIVATED",
                                    entity: "CustomerFeedbackQr",
                                    entityId: id,
                                    details: JSON.stringify({ version: body.expectedVersion, source: "MARK_PRINTED" }),
                                    userId: session.user.id,
                                },
                            });
                        }
                        return { status: "PRINTED" as const, autoActivated };
                    }

                    const updated = await tx.customerFeedbackQr.updateMany({
                        where: { id, version: body.expectedVersion },
                        data: { lastPrintedAt: now, lastPrintedById: session.user.id, needsReprint: false },
                    });
                    if (updated.count !== 1) return { status: "STALE" as const };
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_PRINTED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({ version: body.expectedVersion, autoActivated: false }),
                            userId: session.user.id,
                        },
                    });
                    return { status: "PRINTED" as const, autoActivated: false };
                });

                if (marked.status === "PROFILE_NOT_APPROVED") {
                    return NextResponse.json({ error: "ข้อมูลสาธารณะของพนักงานยังไม่ได้รับการรับทราบ" }, { status: 400 });
                }
                if (marked.status === "TARGET_INACTIVE") {
                    return NextResponse.json({ error: "พนักงานไม่อยู่ในสถานะทำงาน" }, { status: 400 });
                }
                if (marked.status === "OTHER_ACTIVE") {
                    return NextResponse.json({ error: "พนักงานมี QR ที่ใช้งานอยู่แล้ว" }, { status: 409 });
                }
                if (marked.status === "STALE") {
                    return NextResponse.json({ error: "QR เปลี่ยนเวอร์ชันระหว่างพิมพ์ กรุณาพิมพ์ป้ายเวอร์ชันใหม่" }, { status: 409 });
                }
                return NextResponse.json({
                    message: marked.autoActivated
                        ? "บันทึกการพิมพ์และเปิดใช้งาน QR พนักงานอัตโนมัติแล้ว"
                        : "บันทึกการพิมพ์แล้ว",
                    autoActivated: marked.autoActivated,
                });
            }

            case "reveal": {
                if (!Number.isSafeInteger(body.expectedVersion) || (body.expectedVersion ?? 0) < 1) {
                    return NextResponse.json({ error: "ต้องระบุ expectedVersion ของ QR ที่กำลังพิมพ์" }, { status: 400 });
                }
                // ล็อกแถวจนบันทึก audit สำเร็จ เพื่อให้ token, version และข้อความบนป้ายมาจากสถานะเดียวกัน
                const revealed = await prisma.$transaction(async (tx) => {
                    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "CustomerFeedbackQr" WHERE "id" = ${id} FOR UPDATE`);
                    const current = await tx.customerFeedbackQr.findUnique({
                        where: { id },
                        select: {
                            version: true,
                            tokenCiphertext: true,
                            manualCodeCiphertext: true,
                            publicLabel: true,
                            publicPosition: true,
                        },
                    });
                    if (!current || current.version !== body.expectedVersion) return null;
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_REVEALED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            userId: session.user.id,
                        },
                    });
                    return current;
                });
                if (!revealed) {
                    return NextResponse.json({ error: "QR เปลี่ยนเวอร์ชันระหว่างเปิดหน้าพิมพ์ กรุณาโหลดใหม่" }, { status: 409 });
                }
                const token = revealQrToken(revealed.tokenCiphertext);
                return NextResponse.json({
                    token,
                    manualCode: revealQrManualCode(revealed.manualCodeCiphertext),
                    qrUrl: buildFeedbackUrl(token),
                    manualEntryUrl: buildManualEntryUrl(),
                    version: revealed.version,
                    publicLabel: revealed.publicLabel,
                    publicPosition: revealed.publicPosition,
                });
            }

            default:
                return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }
    } catch (error) {
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
            return NextResponse.json(
                { error: "มี QR อื่นถูกเปิดใช้งานพร้อมกัน กรุณาโหลดข้อมูลใหม่" },
                { status: 409 }
            );
        }
        console.error("Error updating feedback QR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
