import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";
import { getFeedbackAccessContext } from "@/lib/customer-feedback/access";
import { buildQrSecrets, buildFeedbackUrl, buildManualEntryUrl, revealQrToken, revealQrManualCode } from "@/lib/customer-feedback/token";
import { isStationFeedbackEnabled } from "@/lib/customer-feedback/station-context";
import { resolveEmployeePublicLabel } from "@/lib/customer-feedback/public-identity";

/**
 * PATCH /api/admin/customer-feedback/qr-codes/[id]
 * actions: activate | deactivate | rotate | approve-public-profile | update-label | MARK_PRINTED | reveal
 */

type Action = "activate" | "deactivate" | "rotate" | "approve-public-profile" | "update-label" | "MARK_PRINTED" | "reveal";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await auth();
        if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await hasPermission(access.ctx.role, "customer_feedback.manage");
        if (!perm) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 });

        const { id } = await params;
        const body = (await request.json()) as {
            action: Action;
            publicLabel?: string;
            publicPosition?: string;
        };
        const qr = await prisma.customerFeedbackQr.findUnique({
            where: { id },
            include: {
                employee: { select: { id: true, isActive: true } },
                station: { select: { id: true, isActive: true, publicEmergencyPhone: true } },
            },
        });
        if (!qr) return NextResponse.json({ error: "ไม่พบ QR" }, { status: 404 });

        const now = new Date();

        switch (body.action) {
            case "activate": {
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
                    if (qr.isPrimary && !enabled) {
                        // สถานียังไม่ผ่านเงื่อนไข (inactive หรือไม่มี emergency phone)
                        if (!qr.station?.isActive || !qr.station?.publicEmergencyPhone) {
                            return NextResponse.json({ error: "สถานีต้อง active และมีหมายเลขฉุกเฉินสาธารณะก่อนเปิด QR" }, { status: 400 });
                        }
                    }
                    if (!qr.station?.isActive || !qr.station?.publicEmergencyPhone) {
                        return NextResponse.json({ error: "สถานีต้อง active และมีหมายเลขฉุกเฉินสาธารณะก่อนเปิด QR" }, { status: 400 });
                    }
                }
                if (qr.needsReprint && qr.lastPrintedAt === null) {
                    // ยังไม่เคยพิมพ์ — อนุญาตให้ activate ได้เฉพาะโหมดทดสอบ
                    if (!qr.isTest) {
                        return NextResponse.json({ error: "ต้องพิมพ์ป้ายก่อนเปิดใช้งานจริง" }, { status: 400 });
                    }
                }
                await prisma.$transaction([
                    prisma.customerFeedbackQr.update({ where: { id }, data: { isActive: true, revokedAt: null } }),
                    prisma.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_ACTIVATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            userId: session.user.id,
                        },
                    }),
                ]);
                return NextResponse.json({ message: "เปิดใช้งานแล้ว" });
            }

            case "deactivate": {
                // QR ที่มีคำตอบห้าม hard delete — ใช้การปิดใช้งาน (ไม่มี hard delete API เลย)
                await prisma.$transaction([
                    prisma.customerFeedbackQr.update({ where: { id }, data: { isActive: false, revokedAt: now } }),
                    prisma.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_DEACTIVATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            userId: session.user.id,
                        },
                    }),
                ]);
                return NextResponse.json({ message: "ปิดใช้งานแล้ว" });
            }

            case "rotate": {
                const secrets = buildQrSecrets();
                await prisma.$transaction(async (tx) => {
                    await tx.customerFeedbackQr.update({
                        where: { id },
                        data: {
                            ...secrets.columns,
                            version: { increment: 1 },
                            isActive: false,
                            needsReprint: true,
                            rotatedAt: now,
                            revokedAt: now,
                        },
                    });
                    await tx.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_ROTATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            userId: session.user.id,
                        },
                    });
                });
                return NextResponse.json({
                    message: "หมุนรหัสแล้ว ป้ายเก่าใช้ไม่ได้ กรุณาพิมพ์ป้ายใหม่",
                    token: secrets.token,
                    manualCode: secrets.manualCode,
                    qrUrl: buildFeedbackUrl(secrets.token),
                    manualEntryUrl: buildManualEntryUrl(),
                });
            }

            case "approve-public-profile": {
                if (qr.targetType !== "EMPLOYEE") {
                    return NextResponse.json({ error: "ใช้กับ QR พนักงานเท่านั้น" }, { status: 400 });
                }
                await prisma.$transaction([
                    prisma.customerFeedbackQr.update({
                        where: { id },
                        data: { publicProfileApprovedAt: now, publicProfileApprovedById: session.user.id },
                    }),
                    prisma.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_PUBLIC_PROFILE_APPROVED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({ publicLabel: qr.publicLabel, publicPosition: qr.publicPosition }),
                            userId: session.user.id,
                        },
                    }),
                ]);
                return NextResponse.json({ message: "บันทึกการรับทราบข้อมูลสาธารณะแล้ว" });
            }

            case "update-label": {
                if (!body.publicLabel || !body.publicLabel.trim()) {
                    return NextResponse.json({ error: "ต้องระบุชื่อ" }, { status: 400 });
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
                        body.publicLabel
                    );
                    if (!labelResult.ok) {
                        return NextResponse.json(
                            { error: labelResult.message, reason: labelResult.reason },
                            { status: 400 }
                        );
                    }
                }
                // แก้ label ต้องปิด QR ล้าง approval และต้องพิมพ์ป้ายใหม่
                await prisma.$transaction([
                    prisma.customerFeedbackQr.update({
                        where: { id },
                        data: {
                            publicLabel: body.publicLabel.trim(),
                            publicPosition: body.publicPosition?.trim() || qr.publicPosition,
                            isActive: false,
                            revokedAt: qr.isActive ? now : qr.revokedAt,
                            publicProfileApprovedAt: null,
                            publicProfileApprovedById: null,
                            needsReprint: true,
                        },
                    }),
                    prisma.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_LABEL_UPDATED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            details: JSON.stringify({ publicLabel: body.publicLabel.trim() }),
                            userId: session.user.id,
                        },
                    }),
                ]);
                return NextResponse.json({ message: "แก้ข้อมูลสาธารณะแล้ว ต้องขอการรับทราบใหม่และพิมพ์ป้ายใหม่ก่อนเปิดใช้งาน" });
            }

            case "MARK_PRINTED": {
                await prisma.customerFeedbackQr.update({
                    where: { id },
                    data: { lastPrintedAt: now, lastPrintedById: session.user.id, needsReprint: false },
                });
                return NextResponse.json({ message: "บันทึกการพิมพ์แล้ว" });
            }

            case "reveal": {
                // ถอด token เพื่อพิมพ์ซ้ำ — บันทึก AuditLog ก่อนคืนค่า (fail closed)
                try {
                    await prisma.auditLog.create({
                        data: {
                            action: "CUSTOMER_FEEDBACK_QR_REVEALED",
                            entity: "CustomerFeedbackQr",
                            entityId: id,
                            userId: session.user.id,
                        },
                    });
                } catch {
                    return NextResponse.json({ error: "ไม่สามารถบันทึก audit log ได้" }, { status: 500 });
                }
                return NextResponse.json({
                    token: revealQrToken(qr.tokenCiphertext),
                    manualCode: revealQrManualCode(qr.manualCodeCiphertext),
                    qrUrl: buildFeedbackUrl(revealQrToken(qr.tokenCiphertext)),
                    manualEntryUrl: buildManualEntryUrl(),
                });
            }

            default:
                return NextResponse.json({ error: "action ไม่ถูกต้อง" }, { status: 400 });
        }
    } catch (error) {
        console.error("Error updating feedback QR:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
