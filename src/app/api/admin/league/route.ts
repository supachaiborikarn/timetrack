import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateStationWeeklyLeague, finalizeCompetitionPeriodRanking, getBangkokWeekBounds } from "@/lib/competition/league";
import { getFeedbackAccessContext, getStationScope } from "@/lib/customer-feedback/access";

async function requireLeagueAdmin() {
    const access = await getFeedbackAccessContext();
    if (!access.ok) return null;
    const scope = await getStationScope(access.ctx);
    if (!scope.ok) return null;
    return { userId: access.ctx.userId, stationId: scope.stationId, role: access.ctx.role };
}

async function requireLeagueViewer() {
    const access = await getFeedbackAccessContext();
    if (!access.ok) return null;
    if (access.ctx.role === "ADMIN" || access.ctx.role === "HR") {
        return { userId: access.ctx.userId, role: access.ctx.role, stationId: null, canSelectStation: true, canManageFairPlay: true };
    }
    if (access.ctx.role === "MANAGER" || access.ctx.role === "CASHIER") {
        if (!access.ctx.stationId) return null;
        return {
            userId: access.ctx.userId,
            role: access.ctx.role,
            stationId: access.ctx.stationId,
            canSelectStation: false,
            canManageFairPlay: access.ctx.role === "MANAGER",
        };
    }
    return null;
}

export async function GET(request: NextRequest) {
    const viewer = await requireLeagueViewer();
    if (!viewer) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const requestedStationId = request.nextUrl.searchParams.get("stationId");
    const stations = await prisma.station.findMany({
        where: {
            isActive: true,
            departments: { some: { isFrontYard: true } },
            ...(viewer.stationId ? { id: viewer.stationId } : {}),
        },
        select: { id: true, code: true, name: true },
        orderBy: [{ name: "asc" }],
    });
    const selectedStation = viewer.stationId
        ? stations.find((station) => station.id === viewer.stationId) ?? null
        : stations.find((station) => station.id === requestedStationId) ?? stations[0] ?? null;

    const now = new Date();
    const week = getBangkokWeekBounds(now);
    const liveLeague = selectedStation
        ? await calculateStationWeeklyLeague({ stationId: selectedStation.id, from: week.from, to: week.to, referenceTime: now })
        : null;

    const admin = { userId: viewer.userId, stationId: viewer.stationId, role: viewer.role };

    const [pendingPeriods, selectedAwards] = await Promise.all([
        prisma.competitionPeriod.findMany({
            where: { status: "PENDING_REVIEW", ...(admin.stationId ? { stationId: admin.stationId } : {}) },
            include: {
                station: { select: { id: true, code: true, name: true } },
                standings: {
                    orderBy: [{ totalScore: "desc" }, { eligibleCustomerCount: "desc" }],
                    include: { user: { select: { employeeId: true, name: true, nickName: true } } },
                },
            },
            orderBy: { endDate: "desc" },
            take: 20,
        }),
        prisma.competitionAward.findMany({
            where: { status: "SELECTED", ...(admin.stationId ? { stationId: admin.stationId } : {}) },
            include: {
                user: { select: { employeeId: true, name: true, nickName: true } },
                station: { select: { name: true, code: true } },
                period: { select: { type: true, periodKey: true } },
            },
            orderBy: { selectedAt: "asc" },
            take: 50,
        }),
    ]);

    return NextResponse.json({
        stations,
        selectedStationId: selectedStation?.id ?? null,
        canSelectStation: viewer.canSelectStation,
        canManageFairPlay: viewer.canManageFairPlay,
        liveLeague: liveLeague ? {
            periodKey: week.key,
            station: liveLeague.station,
            standings: liveLeague.standings.map((standing) => ({
                rank: standing.rank,
                employeeId: standing.employeeId,
                label: standing.label,
                totalScore: standing.totalScore,
                workPoints: standing.workPoints,
                customerPoints: standing.customerPoints,
                missionPoints: standing.missionPoints,
                eligibleCustomerCount: standing.eligibleCustomerCount,
                isEligible: standing.isEligible,
                isProvisional: standing.isProvisional,
                fairPlayStatus: standing.fairPlayStatus,
            })),
        } : null,
        pendingPeriods: viewer.canManageFairPlay ? pendingPeriods.map((period) => ({
            ...period,
            standings: period.standings.map((standing) => ({
                ...standing,
                totalScore: Number(standing.totalScore),
                workPoints: Number(standing.workPoints),
                customerPoints: Number(standing.customerPoints),
                missionPoints: Number(standing.missionPoints),
            })),
        })) : [],
        selectedAwards: viewer.canManageFairPlay ? selectedAwards : [],
        canManageRewards: admin.role === "ADMIN" || admin.role === "HR",
    });
}

export async function PATCH(request: NextRequest) {
    const admin = await requireLeagueAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => null) as {
        standingId?: string;
        awardId?: string;
        action?: "APPROVE" | "DISQUALIFY" | "FULFILL_REWARD";
    } | null;
    if (!body?.action || !["APPROVE", "DISQUALIFY", "FULFILL_REWARD"].includes(body.action)) {
        return NextResponse.json({ error: "invalid action" }, { status: 400 });
    }

    if (body.action === "FULFILL_REWARD") {
        if (!body.awardId) return NextResponse.json({ error: "awardId is required" }, { status: 400 });
        const award = await prisma.competitionAward.findUnique({ where: { id: body.awardId }, include: { period: { select: { stationId: true } } } });
        if (!award || award.status !== "SELECTED" || (admin.stationId && award.period.stationId !== admin.stationId)) return NextResponse.json({ error: "Selected award not found" }, { status: 404 });
        const fulfilled = await prisma.$transaction(async (tx) => {
            const claimed = await tx.competitionAward.updateMany({
                where: { id: award.id, status: "SELECTED" },
                data: { status: "FULFILLED", fulfilledAt: new Date() },
            });
            if (claimed.count !== 1) return false;
            await tx.auditLog.create({
                data: {
                    userId: admin.userId,
                    action: "COMPETITION_REWARD_FULFILLED",
                    entity: "CompetitionAward",
                    entityId: award.id,
                    details: JSON.stringify({ rewardCode: award.rewardCode, rewardLabel: award.rewardLabel }),
                },
            });
            return true;
        });
        if (!fulfilled) return NextResponse.json({ error: "Reward was already fulfilled" }, { status: 409 });
        return NextResponse.json({ ok: true });
    }

    if (!body.standingId) return NextResponse.json({ error: "standingId is required" }, { status: 400 });
    const standing = await prisma.competitionStanding.findUnique({ where: { id: body.standingId }, include: { period: { select: { stationId: true } } } });
    if (!standing || (admin.stationId && standing.period.stationId !== admin.stationId)) return NextResponse.json({ error: "Standing not found" }, { status: 404 });
    if (standing.fairPlayStatus !== "REVIEW") {
        return NextResponse.json({ error: "Standing is not awaiting review" }, { status: 409 });
    }

    const nextStatus = body.action === "APPROVE" ? "APPROVED" : "DISQUALIFIED";
    const reviewed = await prisma.$transaction(async (tx) => {
        const claimed = await tx.competitionStanding.updateMany({
            where: { id: standing.id, fairPlayStatus: "REVIEW" },
            data: { fairPlayStatus: nextStatus, isEligible: body.action === "APPROVE" },
        });
        if (claimed.count !== 1) return false;
        await tx.auditLog.create({
            data: {
                userId: admin.userId,
                action: `COMPETITION_FAIR_PLAY_${body.action}`,
                entity: "CompetitionStanding",
                entityId: standing.id,
                details: JSON.stringify({ periodId: standing.periodId, reasons: standing.fairPlayReasons }),
            },
        });
        return true;
    });
    if (!reviewed) return NextResponse.json({ error: "Standing was already reviewed" }, { status: 409 });

    const remaining = await prisma.competitionStanding.count({
        where: { periodId: standing.periodId, isEligible: true, fairPlayStatus: "REVIEW" },
    });
    if (remaining === 0) await finalizeCompetitionPeriodRanking(standing.periodId);

    return NextResponse.json({ ok: true, finalized: remaining === 0 });
}
