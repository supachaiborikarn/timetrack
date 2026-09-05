import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
    calculateStationWeeklyLeague,
    getBangkokMonthBounds,
    getBangkokWeekBounds,
    getMonthlyStationLeaderboard,
    rewardOptionsForAwardType,
} from "@/lib/competition/league";
import { getRewardCatalog, getRewardWalletForUser } from "@/lib/competition/reward-wallet";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            stationId: true,
            station: { select: { id: true, code: true, name: true } },
            department: { select: { isFrontYard: true } },
        },
    });
    if (!user?.stationId || !user.station || !user.department?.isFrontYard) {
        return NextResponse.json({ eligible: false, reason: "NOT_FRONT_YARD" });
    }

    const now = new Date();
    const week = getBangkokWeekBounds(now);
    const month = getBangkokMonthBounds(now);
    const [weekly, monthly, latestWeekly, awards, latestGrand, rewardWallet, rewardCatalog] = await Promise.all([
        calculateStationWeeklyLeague({ stationId: user.stationId, from: week.from, to: week.to, referenceTime: now }),
        getMonthlyStationLeaderboard(user.stationId, month.key),
        prisma.competitionPeriod.findFirst({
            where: { type: "WEEKLY_STATION", stationId: user.stationId, status: "FINALIZED" },
            include: {
                standings: {
                    where: { finalRank: { not: null } },
                    orderBy: { finalRank: "asc" },
                    take: 8,
                    select: { employeeLabelSnapshot: true, totalScore: true, finalRank: true },
                },
            },
            orderBy: { endDate: "desc" },
        }),
        prisma.competitionAward.findMany({
            where: { userId: user.id, status: { in: ["AVAILABLE", "SELECTED"] } },
            include: { period: { select: { type: true, periodKey: true, startDate: true, endDate: true } } },
            orderBy: { createdAt: "desc" },
            take: 5,
        }),
        prisma.competitionPeriod.findFirst({
            where: { type: "MONTHLY_GRAND", status: "FINALIZED" },
            include: {
                standings: {
                    where: { finalRank: { not: null } },
                    orderBy: { finalRank: "asc" },
                    take: 5,
                    select: { employeeLabelSnapshot: true, totalScore: true, finalRank: true },
                },
            },
            orderBy: { endDate: "desc" },
        }),
        getRewardWalletForUser(user.id),
        getRewardCatalog(week.key),
    ]);

    const publicWeeklyStandings = weekly.standings.map((standing) => ({
        label: standing.label,
        totalScore: standing.totalScore,
        workPoints: standing.workPoints,
        customerPoints: standing.customerPoints,
        missionPoints: standing.missionPoints,
        rank: standing.rank,
        isMe: standing.userId === user.id,
        isEligible: standing.isEligible,
        isRewardEligible: standing.isRewardEligible,
        rewardEligibilityReason: standing.rewardEligibilityReason,
        rewardPointsPreview: standing.rewardPointsPreview,
        isProvisional: standing.isProvisional,
        fairPlayStatus: standing.fairPlayStatus,
    }));
    const me = publicWeeklyStandings.find((standing) => standing.isMe) ?? null;
    const publicMonthlyStandings = monthly.map(({ userId, ...standing }) => ({ ...standing, isMe: userId === user.id }));
    const response = NextResponse.json({
        eligible: true,
        station: weekly.station,
        weekly: {
            periodKey: week.key,
            from: week.from.toISOString(),
            to: week.to.toISOString(),
            standings: publicWeeklyStandings,
            me,
        },
        monthly: {
            periodKey: month.key,
            standings: publicMonthlyStandings,
            me: publicMonthlyStandings.find((standing) => standing.isMe) ?? null,
        },
        latestWeekly: latestWeekly ? {
            periodKey: latestWeekly.periodKey,
            finalizedAt: latestWeekly.finalizedAt?.toISOString() ?? null,
            standings: latestWeekly.standings.map((standing) => ({ ...standing, totalScore: Number(standing.totalScore) })),
        } : null,
        latestGrand: latestGrand ? {
            periodKey: latestGrand.periodKey,
            standings: latestGrand.standings.map((standing) => ({ ...standing, totalScore: Number(standing.totalScore) })),
        } : null,
        rewardPoints: {
            wallet: rewardWallet,
            featured: rewardCatalog.featured,
            catalog: rewardCatalog.items,
        },
        awards: awards.map((award) => ({
            id: award.id,
            awardType: award.awardType,
            title: award.title,
            status: award.status,
            rewardCode: award.rewardCode,
            rewardLabel: award.rewardLabel,
            rewardValueBaht: award.rewardValueBaht,
            period: award.period,
            options: rewardOptionsForAwardType(award.awardType),
        })),
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}
