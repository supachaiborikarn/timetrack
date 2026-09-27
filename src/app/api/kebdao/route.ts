import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseKebdaoCode, kebdaoReviewAllowed } from "@/lib/kebdao-rules";
import { kebdaoActor, kebdaoError, KebdaoError, kebdaoInclude } from "@/lib/kebdao-server";
import { getKebdaoOutletId } from "@/lib/vgcloud-station-codes";

export async function GET(request: NextRequest) {
    try {
        const review = request.nextUrl.searchParams.get("review") === "1";
        const actor = await kebdaoActor(review ? "kebdao.review" : "kebdao.register");
        const global = ["ADMIN", "HR"].includes(actor.role);
        const scope = global ? {} : { stationId: actor.stationId ?? "__none__" };
        const stationWhere = review && global
            ? { isActive: true }
            : { id: actor.stationId ?? "__none__", isActive: true };
        const [registrations, outletStations] = await Promise.all([
            prisma.kebdaoRegistration.findMany({ where: review ? scope : { userId: actor.id }, include: kebdaoInclude, orderBy: { createdAt: "desc" } }),
            prisma.station.findMany({ where: stationWhere, select: { id: true, name: true, code: true } }),
        ]);
        const outlets = outletStations.flatMap((station) => {
            const outletCode = getKebdaoOutletId(station.code);
            return outletCode ? [{ stationId: station.id, outletCode, station: { name: station.name } }] : [];
        });
        const employees = review ? await prisma.user.findMany({ where: { isActive: true, employeeStatus: "ACTIVE", ...(global ? {} : { stationId: actor.stationId ?? "__none__" }) }, select: { id: true, name: true, employeeId: true, station: { select: { name: true } }, kebdaoRegistrations: { where: { status: { in: ["ACTIVE", "PENDING"] } }, select: { id: true } } }, orderBy: { name: "asc" } }) : [];
        return NextResponse.json({ registrations, outlets, unregistered: employees.filter(e => !e.kebdaoRegistrations.length).map(e => ({ id: e.id, name: e.name, employeeId: e.employeeId, station: e.station })), actorId: actor.id });
    } catch (error) { return kebdaoError(error); }
}

export async function POST(request: NextRequest) {
    try {
        const actor = await kebdaoActor("kebdao.register");
        if (!actor.stationId) throw new KebdaoError("ยังไม่มีสาขาประจำ กรุณาติดต่อผู้ดูแล");
        const body = await request.json();
        let csrId: string;
        try { csrId = parseKebdaoCode(body.csrId); } catch (e) { throw new KebdaoError((e as Error).message); }
        const reason = typeof body.reason === "string" ? body.reason.trim() : "";
        if (!reason || reason.length > 500) throw new KebdaoError("กรุณาระบุว่าเป็นการลงทะเบียนครั้งแรกหรือเหตุผลที่ขอเปลี่ยน ไม่เกิน 500 ตัวอักษร");
        if (body.confirmed !== true) throw new KebdaoError("กรุณายืนยันว่าเป็นบัตรที่ได้รับ");
        if (!Array.isArray(body.assetIds) || body.assetIds.length < 1 || body.assetIds.length > 2 || body.assetIds.some((id: unknown) => typeof id !== "string") || new Set(body.assetIds).size !== body.assetIds.length) throw new KebdaoError("กรุณาแนบรูปบัตร 1–2 รูป");
        await prisma.$transaction(async tx => {
            const station = await tx.station.findUnique({ where: { id: actor.stationId! }, select: { code: true, name: true } });
            const outletCode = getKebdaoOutletId(station?.code);
            if (!station || !outletCode) throw new KebdaoError("สาขานี้ยังไม่มีรหัสสถานี VGCloud สำหรับ Kebdao กรุณาติดต่อผู้ดูแล");
            if (body.outletCode !== outletCode) throw new KebdaoError("ID สถานีเปลี่ยนแปลง กรุณาโหลดใหม่");
            const owner = await tx.kebdaoCodeOwner.findUnique({ where: { csrId } });
            const duplicate = await tx.kebdaoRegistration.findFirst({ where: { csrId, status: { in: ["PENDING", "ACTIVE"] } } });
            if ((owner && owner.userId !== actor.id) || duplicate) throw new KebdaoError("รหัสนี้ถูกลงทะเบียนแล้ว กรุณาตรวจสอบบัตรหรือติดต่อผู้ดูแล", 409);
            const assets = await tx.storedAsset.findMany({ where: { id: { in: body.assetIds }, kind: "KEBDAO_CARD", ownerUserId: actor.id, uploadedById: actor.id, kebdaoRegistrationId: null, storageDriver: { in: ["db", "cloudinary"] } } });
            if (assets.length !== body.assetIds.length) throw new KebdaoError("รูปบัตรไม่ถูกต้องหรือถูกใช้แล้ว กรุณาแนบใหม่");
            const row = await tx.kebdaoRegistration.create({ data: { userId: actor.id, stationId: actor.stationId!, outletCode, csrId, reason, pendingUserId: actor.id, pendingCsrId: csrId } });
            await tx.auditLog.create({ data: { userId: actor.id, action: "KEBDAO_SUBMIT", entity: "KebdaoRegistration", entityId: row.id, details: `ส่งรหัส ${csrId}` } });
            await tx.storedAsset.updateMany({ where: { id: { in: body.assetIds } }, data: { kebdaoRegistrationId: row.id, purgeAfter: null } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        return NextResponse.json({ success: true });
    } catch (error) { return kebdaoError(error); }
}

export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const action = body.action;
        if (!["withdraw", "approve", "reject"].includes(action)) throw new KebdaoError("คำสั่งไม่ถูกต้อง");
        const actor = await kebdaoActor(action === "withdraw" ? "kebdao.register" : "kebdao.review");
        {
            if (typeof body.id !== "string") throw new KebdaoError("ไม่พบรายการ");
            const note = typeof body.note === "string" ? body.note.trim() : "";
            if (note.length > 500 || (action === "reject" && !note)) throw new KebdaoError("กรุณาระบุเหตุผลที่ส่งกลับ ไม่เกิน 500 ตัวอักษร");
            await prisma.$transaction(async tx => {
                const row = await tx.kebdaoRegistration.findUnique({ where: { id: body.id } });
                if (!row || row.status !== "PENDING") throw new KebdaoError("รายการเปลี่ยนแปลงแล้ว กรุณาโหลดใหม่", 409);
                if (action === "withdraw") {
                    if (row.userId !== actor.id) throw new KebdaoError("ไม่มีสิทธิ์แก้รายการนี้", 403);
                    await tx.kebdaoRegistration.update({ where: { id: row.id }, data: { status: "WITHDRAWN", pendingUserId: null, pendingCsrId: null, reviewNote: "พนักงานยกเลิกเพื่อแก้ไข", reviewedById: actor.id, reviewedAt: new Date() } });
                    await tx.auditLog.create({ data: { userId: actor.id, action: "KEBDAO_WITHDRAW", entity: "KebdaoRegistration", entityId: row.id, details: "ยกเลิกคำขอ" } });
                    return;
                }
                if (!kebdaoReviewAllowed(actor, row)) throw new KebdaoError("ตรวจได้เฉพาะสาขาที่ดูแลและห้ามอนุมัติรายการตนเอง", 403);
                if (action === "approve") {
                    const owner = await tx.kebdaoCodeOwner.findUnique({ where: { csrId: row.csrId } });
                    if (owner && owner.userId !== row.userId) throw new KebdaoError("รหัสนี้มีเจ้าของแล้ว", 409);
                    if (!owner) await tx.kebdaoCodeOwner.create({ data: { csrId: row.csrId, userId: row.userId } });
                    await tx.kebdaoRegistration.updateMany({ where: { activeUserId: row.userId }, data: { activeUserId: null, status: "REPLACED" } });
                }
                await tx.auditLog.create({ data: { userId: actor.id, action: action === "approve" ? "KEBDAO_APPROVE" : "KEBDAO_REJECT", entity: "KebdaoRegistration", entityId: row.id, details: note || "ยืนยันเจ้าของบัตร" } });
                await tx.kebdaoRegistration.update({ where: { id: row.id }, data: { status: action === "approve" ? "ACTIVE" : "REJECTED", pendingUserId: null, pendingCsrId: null, activeUserId: action === "approve" ? row.userId : null, reviewedById: actor.id, reviewedAt: new Date(), reviewNote: note || null } });
            }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
        }
        return NextResponse.json({ success: true });
    } catch (error) { return kebdaoError(error); }
}
