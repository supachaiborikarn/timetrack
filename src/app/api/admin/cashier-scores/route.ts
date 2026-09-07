import { NextRequest, NextResponse } from "next/server";
import { getFeedbackAccessContext } from "@/lib/customer-feedback/access";
import { getBangkokWeekBounds, getPreviousBangkokWeekBounds } from "@/lib/competition/league";
import { cashierOverrideKey, getCashierWeeklyReport } from "@/lib/cashier-weekly-report";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const access = await getFeedbackAccessContext();
    if (!access.ok) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { ctx } = access;
    const canEdit = ctx.role === "ADMIN" || ctx.role === "HR";
    if (!canEdit && ctx.role !== "CASHIER" && ctx.role !== "MANAGER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const stationId = canEdit ? request.nextUrl.searchParams.get("stationId") : ctx.stationId;
    if (!stationId) return NextResponse.json({ error: "กรุณาเลือกปั๊ม" }, { status: 400 });
    const station = await prisma.station.findUnique({ where: { id: stationId }, select: { id: true } });
    if (!station) return NextResponse.json({ error: "ไม่พบปั๊ม" }, { status: 404 });
    const week = request.nextUrl.searchParams.get("week") === "current" ? getBangkokWeekBounds() : getPreviousBangkokWeekBounds();
    return NextResponse.json({ canEdit, report: await getCashierWeeklyReport(stationId, week.key) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PUT(request: NextRequest) {
    const access = await getFeedbackAccessContext();
    if (!access.ok || !["ADMIN", "HR"].includes(access.ctx.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await request.json().catch(() => null);
    const validScore = (value: unknown) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100);
    if (!body || typeof body.stationId !== "string" || ![getBangkokWeekBounds().key, getPreviousBangkokWeekBounds().key].includes(body.periodKey) || !validScore(body.station) || !validScore(body.restroom)) {
        return NextResponse.json({ error: "ระบุรอบสัปดาห์และคะแนน 0–100 ให้ถูกต้อง" }, { status: 400 });
    }
    const station = await prisma.station.findUnique({ where: { id: body.stationId }, select: { id: true } });
    if (!station) return NextResponse.json({ error: "ไม่พบปั๊ม" }, { status: 404 });
    const report = await getCashierWeeklyReport(body.stationId, body.periodKey);
    if (body.periodKey !== "2026-08-31" && ((body.station !== null && report.station.responseCount > 0) || (body.restroom !== null && report.restroom.responseCount > 0))) {
        return NextResponse.json({ error: "ลงคะแนนแทนได้เฉพาะส่วนที่ไม่มีลูกค้าประเมิน" }, { status: 409 });
    }
    const key = cashierOverrideKey(body.stationId, body.periodKey);
    const value = JSON.stringify({ station: body.station, restroom: body.restroom, updatedBy: access.ctx.userId });
    await prisma.$transaction(async (tx) => {
        const before = await tx.systemConfig.findUnique({ where: { key } });
        await tx.systemConfig.upsert({ where: { key }, create: { key, value }, update: { value } });
        await tx.auditLog.create({ data: { userId: access.ctx.userId, action: "CASHIER_QUALITY_SCORE_UPDATED", entity: "SystemConfig", entityId: key, details: JSON.stringify({ before: before?.value ?? null, after: JSON.parse(value) }) } });
    });
    return NextResponse.json({ ok: true });
}
