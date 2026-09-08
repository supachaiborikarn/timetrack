import { prisma } from "@/lib/prisma";
import { calculateStationWeeklyLeague, getPreviousBangkokWeekBounds } from "./league";

export type ChampionReward = {
    status: "AVAILABLE" | "SELECTED" | "FULFILLED" | "CANCELLED";
    rewardLabel: string | null;
    rewardValueBaht: number | null;
};

const championAwards = {
    where: { awardType: "WEEKLY_CHAMPION" as const, rank: 1 },
    select: { userId: true, status: true, rewardLabel: true, rewardValueBaht: true },
};

function rewardForWinner(standings: Array<{ userId: string; finalRank: number | null }>, awards: Array<ChampionReward & { userId: string }>): ChampionReward | null {
    const winner = standings.find((standing) => standing.finalRank === 1);
    const reward = winner ? awards.find((award) => award.userId === winner.userId) : null;
    return reward ? { status: reward.status, rewardLabel: reward.rewardLabel, rewardValueBaht: reward.rewardValueBaht } : null;
}

export async function getLatestWeeklyResult(stationId: string) {
    const period = await prisma.competitionPeriod.findFirst({
        where: { type: "WEEKLY_STATION", stationId, status: "FINALIZED", standings: { some: { finalRank: 1 } } },
        select: {
            periodKey: true,
            finalizedAt: true,
            awards: championAwards,
            standings: {
                where: { finalRank: { not: null }, user: { department: { is: { code: { not: "GAS" } } } } }, orderBy: { finalRank: "asc" }, take: 8,
                select: { userId: true, employeeLabelSnapshot: true, totalScore: true, finalRank: true },
            },
        },
        orderBy: { endDate: "desc" },
    });
    return period ? {
        periodKey: period.periodKey,
        finalizedAt: period.finalizedAt?.toISOString() ?? null,
        championReward: rewardForWinner(period.standings, period.awards),
        standings: period.standings.map((standing) => ({ employeeLabelSnapshot: standing.employeeLabelSnapshot, totalScore: Number(standing.totalScore), finalRank: standing.finalRank })),
    } : null;
}

export type PreviousWeeklyResult = {
    periodKey: string;
    from: string;
    to: string;
    announcementAt: string;
    finalizedAt: string | null;
    championReward: ChampionReward | null;
    status: "AWAITING_FINALIZATION" | "PENDING_REVIEW" | "FINALIZED";
    standings: Array<{
        employeeLabelSnapshot: string;
        totalScore: number;
        finalRank: number | null;
        isEligible: boolean;
        fairPlayStatus: string;
    }>;
};

// Reading a result never closes a period, approves Fair Play, or grants rewards.
export async function getPreviousWeeklyResult(stationId: string, now: Date): Promise<PreviousWeeklyResult> {
    const week = getPreviousBangkokWeekBounds(now);
    const period = await prisma.competitionPeriod.findUnique({
        where: { type_periodKey_stationId: { type: "WEEKLY_STATION", periodKey: week.key, stationId } },
        select: {
            status: true,
            finalizedAt: true,
            awards: championAwards,
            standings: {
                where: { user: { department: { is: { code: { not: "GAS" } } } } },
                orderBy: [{ finalRank: { sort: "asc", nulls: "last" } }, { totalScore: "desc" }, { userId: "asc" }],
                select: { userId: true, employeeLabelSnapshot: true, totalScore: true, finalRank: true, isEligible: true, fairPlayStatus: true },
            },
        },
    });
    const bounds = {
        periodKey: week.key,
        from: week.from.toISOString(),
        to: week.to.toISOString(),
        announcementAt: new Date(week.to.getTime() + (7 * 60 + 30) * 60_000).toISOString(),
    };

    // OPEN may be a partially written snapshot; use a complete source calculation until it closes.
    if (period && period.status !== "OPEN") {
        return {
            ...bounds,
            status: period.status,
            finalizedAt: period.finalizedAt?.toISOString() ?? null,
            championReward: period.status === "FINALIZED" ? rewardForWinner(period.standings, period.awards) : null,
            standings: period.standings.map((standing) => ({
                employeeLabelSnapshot: standing.employeeLabelSnapshot,
                totalScore: Number(standing.totalScore),
                finalRank: period.status === "FINALIZED" ? standing.finalRank : null,
                isEligible: standing.isEligible,
                fairPlayStatus: standing.fairPlayStatus,
            })),
        };
    }

    const previous = await calculateStationWeeklyLeague({ stationId, from: week.from, to: week.to, referenceTime: week.to });
    return {
        ...bounds,
        status: "AWAITING_FINALIZATION",
        finalizedAt: null,
        championReward: null,
        standings: previous.standings.map((standing) => ({
            employeeLabelSnapshot: standing.label,
            totalScore: standing.totalScore,
            finalRank: null,
            isEligible: standing.isEligible,
            fairPlayStatus: standing.fairPlayStatus,
        })),
    };
}
