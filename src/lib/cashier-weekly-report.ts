import { prisma } from "@/lib/prisma";
import { calculateFuelCashierScore } from "@/lib/cashier-score";
import { calculateFuelCashierStationScoreForRange } from "@/lib/cashier-score-server";
import { getBangkokWeekBounds } from "@/lib/competition/league";
import { isFuelCashier } from "@/lib/cashier-employee-scope";

import { cashierOverrideKey, resolveCashierQuality, type QualityOverride } from "@/lib/cashier-quality";
export { cashierOverrideKey } from "@/lib/cashier-quality";

export async function getCashierWeeklyReport(stationId: string, periodKey: string) {
    const week = getBangkokWeekBounds(new Date(`${periodKey}T12:00:00+07:00`));
    const [station, period, config, candidates] = await Promise.all([
        prisma.station.findUniqueOrThrow({ where: { id: stationId }, select: { code: true } }),
        prisma.competitionPeriod.findFirst({
            where: { stationId, type: "WEEKLY_STATION", periodKey, status: "FINALIZED" },
            include: { standings: { where: { requiredDays: { gt: 0 }, user: { role: "EMPLOYEE" } }, select: { totalScore: true } } },
        }),
        prisma.systemConfig.findUnique({ where: { key: cashierOverrideKey(stationId, periodKey) } }),
        prisma.user.findMany({ where: { stationId, role: "CASHIER", isActive: true, employeeStatus: "ACTIVE" }, select: { role: true, employeeId: true, name: true, nickName: true } }),
    ]);
    const rangeTo = new Date(Math.min(Date.now(), week.to.getTime()));
    const live = await calculateFuelCashierStationScoreForRange({ stationId, stationCode: station.code, feedbackFrom: week.from, feedbackToExclusive: rangeTo, workFrom: week.from, workToExclusive: rangeTo, referenceTime: rangeTo });
    const manual: QualityOverride = config ? JSON.parse(config.value) : { station: null, restroom: null };
    const initialWeek = periodKey === "2026-08-31";
    const stationQuality = resolveCashierQuality(live.stationSummary.score, live.stationSummary.responseCount, manual.station, initialWeek);
    const restroomQuality = resolveCashierQuality(live.restroomSummary.score, live.restroomSummary.responseCount, manual.restroom, initialWeek);
    const teamScore = !initialWeek ? live.teamPerformanceScore : period?.standings.length
        ? Math.round(period.standings.reduce((sum, row) => sum + Number(row.totalScore), 0) / period.standings.length * 10) / 10
        : null;
    return {
        periodKey, teamScore, teamCount: initialWeek ? period?.standings.length ?? 0 : live.relevantTeamMemberCount,
        teamSource: initialWeek ? "FINALIZED_EMPLOYEE_LEAGUE" : "EMPLOYEE_PERFORMANCE",
        station: { ...stationQuality, responseCount: live.stationSummary.responseCount, manual: manual.station },
        restroom: { ...restroomQuality, responseCount: live.restroomSummary.responseCount, manual: manual.restroom },
        result: calculateFuelCashierScore({ teamPerformanceScore: teamScore, stationScore: stationQuality.score, restroomScore: restroomQuality.score }),
        cashiers: candidates.filter(isFuelCashier).map((user) => ({ employeeId: user.employeeId, label: user.nickName || user.name })),
    };
}
