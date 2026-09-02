import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateStationWeeklyLeague, getBangkokWeekBounds } from "@/lib/competition/league";

export const dynamic = "force-dynamic";

class RedemptionError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
    }
}

export async function POST(request: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null) as { rewardItemId?: string } | null;
    if (!body?.rewardItemId) {
        return NextResponse.json({ error: "rewardItemId is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            stationId: true,
            isActive: true,
            employeeStatus: true,
            department: { select: { isFrontYard: true } },
        },
    });
    if (!user?.isActive || user.employeeStatus !== "ACTIVE" || !user.stationId || !user.department?.isFrontYard) {
        return NextResponse.json({ error: "ไม่มีสิทธิ์ใช้ Reward Points" }, { status: 403 });
    }

    const now = new Date();
    const week = getBangkokWeekBounds(now);
    const live = await calculateStationWeeklyLeague({
        stationId: user.stationId,
        from: week.from,
        to: week.to,
        referenceTime: now,
    });
    const myStanding = live.standings.find((standing) => standing.userId === user.id);
    if (!myStanding?.isRewardEligible) {
        return NextResponse.json({
            error: "สัปดาห์นี้ยังไม่มีสิทธิ์แลกรางวัล",
            reason: myStanding?.rewardEligibilityReason ?? "NO_REQUIRED_WORK_DAYS",
        }, { status: 403 });
    }

    try {
        const redemption = await prisma.$transaction(async (tx) => {
            const item = await tx.rewardCatalogItem.findUnique({ where: { id: body.rewardItemId } });
            if (!item || !item.isActive) throw new RedemptionError("ไม่พบของรางวัลนี้", 404);
            if (item.pointsCost <= 0) throw new RedemptionError("คะแนนของรางวัลไม่ถูกต้อง", 409);
            if (item.stock !== null && item.stock <= 0) throw new RedemptionError("ของรางวัลหมดแล้ว", 409);

            const [earnings, spent] = await Promise.all([
                tx.competitionStanding.findMany({
                    where: {
                        userId: user.id,
                        rewardPoints: { gt: 0 },
                        period: { type: "WEEKLY_STATION", status: "FINALIZED" },
                    },
                    select: { rewardPoints: true },
                }),
                tx.rewardRedemption.aggregate({
                    where: { userId: user.id, status: { in: ["PENDING", "FULFILLED"] } },
                    _sum: { pointsCost: true },
                }),
            ]);
            const earnedPoints = earnings.reduce((sum, row) => sum + row.rewardPoints, 0);
            const spentPoints = spent._sum.pointsCost ?? 0;
            const balance = Math.max(0, earnedPoints - spentPoints);
            if (balance < item.pointsCost) {
                throw new RedemptionError(`Reward Points ไม่พอ (มี ${balance} RP)`, 409);
            }

            if (item.stock !== null) {
                const stockClaim = await tx.rewardCatalogItem.updateMany({
                    where: { id: item.id, stock: { gt: 0 } },
                    data: { stock: { decrement: 1 } },
                });
                if (stockClaim.count !== 1) throw new RedemptionError("ของรางวัลหมดแล้ว", 409);
            }

            const created = await tx.rewardRedemption.create({
                data: {
                    userId: user.id,
                    stationId: user.stationId,
                    rewardItemId: item.id,
                    pointsCost: item.pointsCost,
                    rewardTitleSnapshot: item.title,
                },
                select: { id: true, pointsCost: true, rewardTitleSnapshot: true, status: true, createdAt: true },
            });
            await tx.auditLog.create({
                data: {
                    userId: user.id,
                    action: "REWARD_POINTS_REDEEMED",
                    entity: "RewardRedemption",
                    entityId: created.id,
                    details: JSON.stringify({ rewardItemId: item.id, title: item.title, pointsCost: item.pointsCost }),
                },
            });
            return created;
        }, { isolationLevel: "Serializable" });

        return NextResponse.json({ ok: true, redemption });
    } catch (error) {
        if (error instanceof RedemptionError) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }
        console.error("Reward redemption failed:", error);
        return NextResponse.json({ error: "แลกรางวัลไม่สำเร็จ กรุณาลองอีกครั้ง" }, { status: 409 });
    }
}
