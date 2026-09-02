import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    finalizeMonthlyCompetitions,
    getBangkokMonthBounds,
    getPreviousBangkokWeekBounds,
    snapshotWeeklyStationLeague,
} from "@/lib/competition/league";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (!process.env.CRON_SECRET || request.headers.get("authorization") !== expected) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const previousWeek = getPreviousBangkokWeekBounds(now);
    const previousMonth = getBangkokMonthBounds(now, -1);
    const stations = await prisma.station.findMany({
        where: {
            isActive: true,
            employees: { some: { isActive: true, employeeStatus: "ACTIVE", department: { is: { isFrontYard: true } } } },
        },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
    });

    const weekly: Array<{ stationId: string; stationCode: string; status: string; reviewCount: number }> = [];
    for (const station of stations) {
        const result = await snapshotWeeklyStationLeague({
            stationId: station.id,
            from: previousWeek.from,
            to: previousWeek.to,
            periodKey: previousWeek.key,
        });
        weekly.push({ stationId: station.id, stationCode: station.code, status: result.status, reviewCount: result.reviewCount });
    }

    // Idempotent: every scheduled Monday run also tries the previous month. If all weekly station periods are finalized,
    // the monthly station champions and Grand Champion are rebuilt from immutable weekly snapshots.
    const monthly = await finalizeMonthlyCompetitions({ from: previousMonth.from, to: previousMonth.to, periodKey: previousMonth.key });

    return NextResponse.json({
        ok: true,
        weeklyPeriodKey: previousWeek.key,
        weekly,
        monthlyPeriodKey: previousMonth.key,
        monthly,
    });
}
