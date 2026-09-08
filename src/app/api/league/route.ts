import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isFuelCashier } from "@/lib/cashier-employee-scope";
import {
    calculateStationWeeklyLeague,
    getBangkokMonthBounds,
    getBangkokWeekBounds,
    getMonthlyStationLeaderboard,
} from "@/lib/competition/league";
import { getRewardCatalog, getRewardWalletForUser } from "@/lib/competition/reward-wallet";
import { getLatestWeeklyResult, getPreviousWeeklyResult } from "@/lib/competition/weekly-results";
import { getChampionshipRewardOptions } from "@/lib/competition/championship-rewards";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            role: true,
            employeeId: true,
            stationId: true,
            isActive: true,
            employeeStatus: true,
            station: { select: { id: true, code: true, name: true } },
            department: { select: { isFrontYard: true, code: true } },
        },
    });
    const isFrontYardEmployee = user?.role === "EMPLOYEE" && Boolean(user.department?.isFrontYard && user.department.code !== "GAS");
    const isEligibleFuelCashier = Boolean(user?.isActive && user.employeeStatus === "ACTIVE" && user.stationId && isFuelCashier(user));
    if (!user?.stationId || !user.station || (!isFrontYardEmployee && !isEligibleFuelCashier)) {
        return NextResponse.json({ eligible: false, reason: "NOT_ELIGIBLE" });
    }

    const now = new Date();
    const week = getBangkokWeekBounds(now);
    const month = getBangkokMonthBounds(now);
    const [weekly, monthly, latestWeekly, awards, latestGrand, rewardWallet, rewardCatalog, previousWeekly, stationChampionshipRewards, grandChampionshipRewards] = await Promise.all([
        calculateStationWeeklyLeague({ stationId: user.stationId, from: week.from, to: week.to, referenceTime: now }),
        getMonthlyStationLeaderboard(user.stationId, month.key),
        getLatestWeeklyResult(user.stationId),
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
        getPreviousWeeklyResult(user.stationId, now),
        getChampionshipRewardOptions("MONTHLY_STATION_CHAMPION", month.key),
        getChampionshipRewardOptions("GRAND_CHAMPION", month.key),
    ]);

    const publicWeeklyStandings = weekly.standings.map((standing) => ({
        label: standing.label,
        totalScore: standing.totalScore,
        workPoints: standing.workPoints,
        customerPoints: standing.customerPoints,
        missionPoints: standing.missionPoints,
        supportPoints: standing.supportPoints,
        supportDays: standing.supportDays,
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
    const publicAwards = await Promise.all(awards.map(async (award) => ({
        id: award.id,
        awardType: award.awardType,
        title: award.title,
        status: award.status,
        rewardCode: award.rewardCode,
        rewardLabel: award.rewardLabel,
        rewardValueBaht: award.rewardValueBaht,
        period: award.period,
        options: await getChampionshipRewardOptions(award.awardType, award.period.periodKey),
    })));
    const response = NextResponse.json({
        eligible: true,
        profile: isEligibleFuelCashier ? "FUEL_CASHIER" : "FRONT_YARD",
        station: weekly.station,
        previousWeekly,
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
        latestWeekly,
        championshipRewards: {
            periodKey: month.key,
            stationChampion: stationChampionshipRewards,
            grandChampion: grandChampionshipRewards,
        },
        latestGrand: latestGrand ? {
            periodKey: latestGrand.periodKey,
            standings: latestGrand.standings.map((standing) => ({ ...standing, totalScore: Number(standing.totalScore) })),
        } : null,
        rewardPoints: {
            wallet: rewardWallet,
            featured: rewardCatalog.featured,
            catalog: rewardCatalog.items,
            canRedeem: isEligibleFuelCashier || Boolean(me?.isRewardEligible),
            canRedeemReason: isEligibleFuelCashier ? "FUEL_CASHIER_WALLET" : me?.rewardEligibilityReason ?? "NO_REQUIRED_WORK_DAYS",
        },
        awards: publicAwards,
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}
