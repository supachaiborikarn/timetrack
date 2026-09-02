import { prisma } from "@/lib/prisma";

export async function getRewardWalletForUser(userId: string) {
    const [earnings, redemptions] = await Promise.all([
        prisma.competitionStanding.findMany({
            where: {
                userId,
                rewardPoints: { gt: 0 },
                period: { type: "WEEKLY_STATION", status: "FINALIZED" },
            },
            select: {
                rewardPoints: true,
                totalScore: true,
                period: { select: { periodKey: true, finalizedAt: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
        prisma.rewardRedemption.findMany({
            where: { userId },
            select: {
                id: true,
                pointsCost: true,
                rewardTitleSnapshot: true,
                status: true,
                createdAt: true,
                fulfilledAt: true,
                rewardItem: { select: { imageUrl: true } },
            },
            orderBy: { createdAt: "desc" },
        }),
    ]);

    const earnedPoints = earnings.reduce((sum, row) => sum + row.rewardPoints, 0);
    const spentPoints = redemptions
        .filter((row) => row.status === "PENDING" || row.status === "FULFILLED")
        .reduce((sum, row) => sum + row.pointsCost, 0);

    return {
        earnedPoints,
        spentPoints,
        balance: Math.max(0, earnedPoints - spentPoints),
        recentEarnings: earnings.slice(0, 8).map((row) => ({
            periodKey: row.period.periodKey,
            points: row.rewardPoints,
            totalScore: Number(row.totalScore),
            finalizedAt: row.period.finalizedAt?.toISOString() ?? null,
        })),
        recentRedemptions: redemptions.slice(0, 8).map((row) => ({
            id: row.id,
            title: row.rewardTitleSnapshot,
            pointsCost: row.pointsCost,
            status: row.status,
            imageUrl: row.rewardItem.imageUrl,
            createdAt: row.createdAt.toISOString(),
            fulfilledAt: row.fulfilledAt?.toISOString() ?? null,
        })),
    };
}

export async function getRewardCatalog(weekKey: string) {
    const items = await prisma.rewardCatalogItem.findMany({
        where: { isActive: true },
        orderBy: [{ featuredWeekKey: "desc" }, { pointsCost: "asc" }, { createdAt: "desc" }],
        select: {
            id: true,
            code: true,
            title: true,
            description: true,
            imageUrl: true,
            pointsCost: true,
            stock: true,
            featuredWeekKey: true,
        },
    });

    return {
        featured: items.find((item) => item.featuredWeekKey === weekKey) ?? null,
        items,
    };
}
