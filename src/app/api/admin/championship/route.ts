import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBangkokMonthBounds, getMonthlyStationLeaderboard } from "@/lib/competition/league";
import {
    getChampionshipRewardOptions,
    normalizeChampionshipRewardOptions,
    saveChampionshipRewardOptions,
    type ConfigurableChampionshipAwardType,
} from "@/lib/competition/championship-rewards";

export const dynamic = "force-dynamic";

async function requireChampionshipAdmin() {
    const session = await auth();
    if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role ?? "")) return null;
    return { userId: session.user.id, role: session.user.role };
}

function validPeriodKey(value: string | null): value is string {
    return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

export async function GET(request: NextRequest) {
    const admin = await requireChampionshipAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const currentPeriodKey = getBangkokMonthBounds(new Date()).key;
    const requestedPeriodKey = request.nextUrl.searchParams.get("periodKey");
    if (requestedPeriodKey && !validPeriodKey(requestedPeriodKey)) {
        return NextResponse.json({ error: "Invalid periodKey" }, { status: 400 });
    }
    const periodKey = requestedPeriodKey ?? currentPeriodKey;

    const stations = await prisma.station.findMany({
        where: {
            isActive: true,
            departments: { some: { isFrontYard: true } },
        },
        select: { id: true, code: true, name: true },
        orderBy: [{ name: "asc" }],
    });

    const [stationRewardOptions, grandRewardOptions, stationRows, awards] = await Promise.all([
        getChampionshipRewardOptions("MONTHLY_STATION_CHAMPION", periodKey),
        getChampionshipRewardOptions("GRAND_CHAMPION", periodKey),
        Promise.all(stations.map(async (station) => ({
            station,
            standings: await getMonthlyStationLeaderboard(station.id, periodKey),
        }))),
        prisma.competitionAward.findMany({
            where: {
                awardType: { in: ["MONTHLY_STATION_CHAMPION", "GRAND_CHAMPION"] },
                period: { periodKey },
            },
            include: {
                user: { select: { employeeId: true, name: true, nickName: true } },
                station: { select: { code: true, name: true } },
                period: { select: { type: true, periodKey: true, status: true } },
            },
            orderBy: [{ awardType: "asc" }, { createdAt: "asc" }],
        }),
    ]);

    const stationChampions = stationRows
        .map((row) => {
            const winner = row.standings[0] ?? null;
            return winner ? { station: row.station, ...winner } : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
        .sort((a, b) => b.averageScore - a.averageScore || b.championshipPoints - a.championshipPoints || a.station.code.localeCompare(b.station.code));

    const response = NextResponse.json({
        periodKey,
        currentPeriodKey,
        stationCompetitions: stationRows,
        grandPreview: stationChampions.map((row, index) => ({ ...row, grandRank: index + 1 })),
        rewards: {
            stationChampion: stationRewardOptions,
            grandChampion: grandRewardOptions,
        },
        awards: awards.map((award) => ({
            id: award.id,
            awardType: award.awardType,
            title: award.title,
            status: award.status,
            rewardLabel: award.rewardLabel,
            rewardValueBaht: award.rewardValueBaht,
            user: award.user,
            station: award.station,
            period: award.period,
        })),
    });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
}

export async function PATCH(request: NextRequest) {
    const admin = await requireChampionshipAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => null) as {
        periodKey?: string;
        awardType?: ConfigurableChampionshipAwardType;
        options?: unknown;
    } | null;
    if (!body?.periodKey || !validPeriodKey(body.periodKey)) {
        return NextResponse.json({ error: "Invalid periodKey" }, { status: 400 });
    }
    if (!body.awardType || !["MONTHLY_STATION_CHAMPION", "GRAND_CHAMPION"].includes(body.awardType)) {
        return NextResponse.json({ error: "Invalid awardType" }, { status: 400 });
    }
    const options = normalizeChampionshipRewardOptions(body.options);
    if (!options) {
        return NextResponse.json({ error: "กรุณาระบุรางวัล 1-3 ตัวเลือก พร้อมชื่อและมูลค่าที่ถูกต้อง" }, { status: 400 });
    }

    await saveChampionshipRewardOptions({
        type: body.awardType,
        periodKey: body.periodKey,
        options,
    });
    await prisma.auditLog.create({
        data: {
            userId: admin.userId,
            action: "CHAMPIONSHIP_REWARD_CONFIG_UPDATED",
            entity: "SystemConfig",
            entityId: `${body.periodKey}:${body.awardType}`,
            details: JSON.stringify({ periodKey: body.periodKey, awardType: body.awardType, options }),
        },
    });

    return NextResponse.json({ ok: true, periodKey: body.periodKey, awardType: body.awardType, options });
}
