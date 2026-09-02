import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFeedbackAccessContext } from "@/lib/customer-feedback/access";
import { getBangkokWeekBounds } from "@/lib/competition/league";

export const dynamic = "force-dynamic";

async function requireRewardsAdmin() {
    const access = await getFeedbackAccessContext();
    if (!access.ok || !["ADMIN", "HR"].includes(access.ctx.role)) return null;
    return { userId: access.ctx.userId, role: access.ctx.role };
}

function parsePointsCost(value: unknown): number | null {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 && parsed <= 100000 ? parsed : null;
}

function parseStock(value: unknown): number | null | "INVALID" {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 100000 ? parsed : "INVALID";
}

function parseImageUrl(value: unknown): string | null | "INVALID" {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string" || value.length > 800_000) return "INVALID";
    const trimmed = value.trim();
    const isDataImage = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(trimmed);
    const isHttps = /^https:\/\//i.test(trimmed);
    return isDataImage || isHttps ? trimmed : "INVALID";
}

function newRewardCode() {
    return `RP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

export async function GET() {
    const admin = await requireRewardsAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const weekKey = getBangkokWeekBounds(new Date()).key;
    const [items, redemptions] = await Promise.all([
        prisma.rewardCatalogItem.findMany({
            orderBy: [{ isActive: "desc" }, { featuredWeekKey: "desc" }, { pointsCost: "asc" }, { createdAt: "desc" }],
        }),
        prisma.rewardRedemption.findMany({
            where: { status: "PENDING" },
            include: {
                user: { select: { employeeId: true, name: true, nickName: true } },
                station: { select: { code: true, name: true } },
                rewardItem: { select: { id: true, title: true, imageUrl: true } },
            },
            orderBy: { createdAt: "asc" },
            take: 100,
        }),
    ]);

    return NextResponse.json({ weekKey, items, redemptions });
}

export async function POST(request: NextRequest) {
    const admin = await requireRewardsAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => null) as {
        title?: unknown;
        description?: unknown;
        imageUrl?: unknown;
        pointsCost?: unknown;
        stock?: unknown;
        featuredThisWeek?: unknown;
    } | null;
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim().slice(0, 2000) : null;
    const pointsCost = parsePointsCost(body?.pointsCost);
    const stock = parseStock(body?.stock);
    const imageUrl = parseImageUrl(body?.imageUrl);
    const featuredThisWeek = body?.featuredThisWeek === true;
    if (!title || title.length > 160 || pointsCost === null || stock === "INVALID" || imageUrl === "INVALID") {
        return NextResponse.json({ error: "ข้อมูลของรางวัลไม่ถูกต้อง" }, { status: 400 });
    }

    const weekKey = getBangkokWeekBounds(new Date()).key;
    const created = await prisma.$transaction(async (tx) => {
        if (featuredThisWeek) {
            await tx.rewardCatalogItem.updateMany({ where: { featuredWeekKey: weekKey }, data: { featuredWeekKey: null } });
        }
        const item = await tx.rewardCatalogItem.create({
            data: {
                code: newRewardCode(),
                title,
                description: description || null,
                imageUrl,
                pointsCost,
                stock,
                featuredWeekKey: featuredThisWeek ? weekKey : null,
            },
        });
        await tx.auditLog.create({
            data: {
                userId: admin.userId,
                action: "REWARD_CATALOG_CREATED",
                entity: "RewardCatalogItem",
                entityId: item.id,
                details: JSON.stringify({ title: item.title, pointsCost: item.pointsCost, stock: item.stock, featuredWeekKey: item.featuredWeekKey }),
            },
        });
        return item;
    });
    return NextResponse.json({ ok: true, item: created }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
    const admin = await requireRewardsAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => null) as {
        action?: "UPDATE_ITEM" | "FULFILL_REDEMPTION" | "CANCEL_REDEMPTION";
        itemId?: string;
        redemptionId?: string;
        title?: unknown;
        description?: unknown;
        imageUrl?: unknown;
        pointsCost?: unknown;
        stock?: unknown;
        isActive?: unknown;
        featuredThisWeek?: unknown;
    } | null;

    if (body?.action === "FULFILL_REDEMPTION" || body?.action === "CANCEL_REDEMPTION") {
        if (!body.redemptionId) return NextResponse.json({ error: "redemptionId is required" }, { status: 400 });
        const cancelled = body.action === "CANCEL_REDEMPTION";
        const result = await prisma.$transaction(async (tx) => {
            const redemption = await tx.rewardRedemption.findUnique({
                where: { id: body.redemptionId },
                include: { rewardItem: { select: { id: true, stock: true } } },
            });
            if (!redemption || redemption.status !== "PENDING") return null;

            const updated = await tx.rewardRedemption.update({
                where: { id: redemption.id },
                data: cancelled
                    ? { status: "CANCELLED" }
                    : { status: "FULFILLED", fulfilledAt: new Date(), fulfilledById: admin.userId },
            });
            if (cancelled && redemption.rewardItem.stock !== null) {
                await tx.rewardCatalogItem.update({
                    where: { id: redemption.rewardItem.id },
                    data: { stock: { increment: 1 } },
                });
            }
            await tx.auditLog.create({
                data: {
                    userId: admin.userId,
                    action: cancelled ? "REWARD_POINTS_REDEMPTION_CANCELLED" : "REWARD_POINTS_REDEMPTION_FULFILLED",
                    entity: "RewardRedemption",
                    entityId: redemption.id,
                    details: JSON.stringify({ pointsCost: redemption.pointsCost, rewardTitle: redemption.rewardTitleSnapshot }),
                },
            });
            return updated;
        });
        if (!result) return NextResponse.json({ error: "รายการนี้ไม่ได้อยู่ในสถานะรอดำเนินการ" }, { status: 409 });
        return NextResponse.json({ ok: true });
    }

    if (body?.action !== "UPDATE_ITEM" || !body.itemId) {
        return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }
    const existing = await prisma.rewardCatalogItem.findUnique({ where: { id: body.itemId } });
    if (!existing) return NextResponse.json({ error: "ไม่พบของรางวัล" }, { status: 404 });

    const pointsCost = body.pointsCost === undefined ? existing.pointsCost : parsePointsCost(body.pointsCost);
    const stock = body.stock === undefined ? existing.stock : parseStock(body.stock);
    const imageUrl = body.imageUrl === undefined ? existing.imageUrl : parseImageUrl(body.imageUrl);
    const title = body.title === undefined ? existing.title : typeof body.title === "string" ? body.title.trim() : "";
    const description = body.description === undefined
        ? existing.description
        : typeof body.description === "string" ? body.description.trim().slice(0, 2000) || null : null;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : existing.isActive;
    if (!title || title.length > 160 || pointsCost === null || stock === "INVALID" || imageUrl === "INVALID") {
        return NextResponse.json({ error: "ข้อมูลของรางวัลไม่ถูกต้อง" }, { status: 400 });
    }

    const weekKey = getBangkokWeekBounds(new Date()).key;
    const featuredThisWeek = typeof body.featuredThisWeek === "boolean"
        ? body.featuredThisWeek
        : existing.featuredWeekKey === weekKey;
    const updated = await prisma.$transaction(async (tx) => {
        if (featuredThisWeek) {
            await tx.rewardCatalogItem.updateMany({
                where: { featuredWeekKey: weekKey, id: { not: existing.id } },
                data: { featuredWeekKey: null },
            });
        }
        const item = await tx.rewardCatalogItem.update({
            where: { id: existing.id },
            data: {
                title,
                description,
                imageUrl,
                pointsCost,
                stock,
                isActive,
                featuredWeekKey: isActive && featuredThisWeek ? weekKey : null,
            },
        });
        await tx.auditLog.create({
            data: {
                userId: admin.userId,
                action: "REWARD_CATALOG_UPDATED",
                entity: "RewardCatalogItem",
                entityId: item.id,
                details: JSON.stringify({ title: item.title, pointsCost: item.pointsCost, stock: item.stock, isActive: item.isActive, featuredWeekKey: item.featuredWeekKey }),
            },
        });
        return item;
    });
    return NextResponse.json({ ok: true, item: updated });
}
