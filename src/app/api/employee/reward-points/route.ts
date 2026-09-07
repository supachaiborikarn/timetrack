import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFuelCashier } from "@/lib/cashier-employee-scope";
import { getBangkokWeekBounds } from "@/lib/competition/league";
import { rewardPointsForLeagueScore } from "@/lib/competition/reward-policy";
import { calculateFuelCashierStationScoreForRange } from "@/lib/cashier-score-server";
import { getRewardCatalog, getRewardWalletForUser } from "@/lib/competition/reward-wallet";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true, role: true, employeeId: true, stationId: true, isActive: true, employeeStatus: true,
            station: { select: { code: true } },
        },
    });
    if (!user?.isActive || user.employeeStatus !== "ACTIVE" || !user.stationId || !isFuelCashier(user)) {
        return NextResponse.json({ enabled: false, reason: "NOT_FUEL_CASHIER" });
    }

    const now = new Date();
    const week = getBangkokWeekBounds(now);
    const rangeTo = now < week.to ? now : week.to;
    const [wallet, catalog, weeklyCashierScore] = await Promise.all([
        getRewardWalletForUser(user.id),
        getRewardCatalog(week.key),
        calculateFuelCashierStationScoreForRange({
            qualityWeekKey: week.key,
            stationId: user.stationId,
            stationCode: user.station?.code,
            feedbackFrom: week.from,
            feedbackToExclusive: rangeTo,
            workFrom: week.from,
            workToExclusive: rangeTo,
            referenceTime: now,
        }),
    ]);
    const weeklyScore = weeklyCashierScore.score;
    const rewardPointsPreview = weeklyScore.score === null ? 0 : rewardPointsForLeagueScore(weeklyScore.score);

    const response = NextResponse.json({
        enabled: true,
        wallet,
        featured: catalog.featured,
        catalogCount: catalog.items.length,
        canRedeem: true,
        weekly: {
            periodKey: week.key,
            score: weeklyScore.score,
            forecastScore: weeklyScore.forecastScore,
            knownWeight: weeklyScore.knownWeight,
            rewardPointsPreview,
            ready: weeklyScore.score !== null,
        },
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}
