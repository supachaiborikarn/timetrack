import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    canViewFeedbackIncident,
    getFeedbackAccessContext,
    getStationScope,
    parseFeedbackDateRange,
    parseOptionalFeedbackFilter,
    requireFeedbackPermission,
    resolveFeedbackStationId,
} from "@/lib/customer-feedback/access";
import { isCustomerFeedbackEnabled } from "@/lib/customer-feedback/feature-flags";
import {
    summarizeRatingDistribution,
    summarizeRatings,
    MIN_EMPLOYEE_SAMPLE,
    MIN_STATION_COMPARE_SAMPLE,
    type RatingSummary,
} from "@/lib/customer-feedback/metrics";
import { getReasonOwner } from "@/lib/customer-feedback/questions";
import { startOfDayBangkok } from "@/lib/date-utils";
import { monthsBefore, RESPONSE_RETENTION_MONTHS } from "@/lib/customer-feedback/retention";

const DAY_MS = 24 * 60 * 60 * 1000;

function aggregateReportDate(date: Date): Date {
    const dateKey = new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return new Date(`${dateKey}T00:00:00.000Z`);
}

function emptyRatingDistribution(): RatingSummary["distribution"] {
    return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
}

function addRating(distribution: RatingSummary["distribution"], rating: number) {
    if (Number.isInteger(rating) && rating >= 1 && rating <= 5) {
        distribution[rating as 1 | 2 | 3 | 4 | 5]++;
    }
}

function addAggregateRatings(
    distribution: RatingSummary["distribution"],
    sums: { rating1Count: number | null; rating2Count: number | null; rating3Count: number | null; rating4Count: number | null; rating5Count: number | null }
) {
    distribution[1] += sums.rating1Count ?? 0;
    distribution[2] += sums.rating2Count ?? 0;
    distribution[3] += sums.rating3Count ?? 0;
    distribution[4] += sums.rating4Count ?? 0;
    distribution[5] += sums.rating5Count ?? 0;
}

/**
 * GET /api/admin/customer-feedback/summary
 * KPI และกราฟตาม filter — MANAGER จำกัด stationId ฝั่ง server
 * ตัดข้อมูล incident ออกเมื่อไม่มี customer_feedback.view_incident
 */

export async function GET(request: NextRequest) {
    try {
        if (!isCustomerFeedbackEnabled()) {
            return NextResponse.json({ error: "ระบบเสียงลูกค้ายังไม่เปิดใช้งาน" }, { status: 404 });
        }
        const access = await getFeedbackAccessContext();
        if (!access.ok) return NextResponse.json({ error: access.message }, { status: access.status });
        const perm = await requireFeedbackPermission(access.ctx, "customer_feedback.view_dashboard");
        if (!perm.ok) return NextResponse.json({ error: perm.message }, { status: perm.status });
        const scope = await getStationScope(access.ctx);
        if (!scope.ok) return NextResponse.json({ error: scope.message }, { status: scope.status });
        const canViewIncident = await canViewFeedbackIncident(access.ctx);

        const url = request.nextUrl;
        const dateRange = parseFeedbackDateRange(url.searchParams.get("from"), url.searchParams.get("to"));
        if (!dateRange.ok) return NextResponse.json({ error: dateRange.message }, { status: 400 });
        const targetType = parseOptionalFeedbackFilter(url.searchParams.get("targetType"), ["STATION", "EMPLOYEE"] as const, "targetType");
        if (!targetType.ok) return NextResponse.json({ error: targetType.message }, { status: 400 });
        const stationId = resolveFeedbackStationId(scope.stationId, url.searchParams.get("stationId"));

        const now = new Date();
        const dateFrom = dateRange.value.from ?? new Date(now.getTime() - 30 * 86400 * 1000);
        const dateToExclusive = dateRange.value.toExclusive ?? now;
        const aggregateDateFrom = aggregateReportDate(dateFrom);
        const aggregateDateToExclusive = dateRange.value.toExclusive
            ? aggregateReportDate(dateToExclusive)
            : new Date(aggregateReportDate(dateToExclusive).getTime() + DAY_MS);

        // วันที่ซึ่งแตะเส้นหมดอายุใช้ aggregate ทั้งวัน แล้วเริ่มอ่านข้อมูลดิบในวันถัดไป
        // จึงไม่เกิดทั้งยอดหายและการนับซ้ำเมื่อข้อมูลบางส่วนของวันถูกลบแล้ว
        const retentionCutoffReportDate = aggregateReportDate(monthsBefore(now, RESPONSE_RETENTION_MONTHS));
        const historicalAggregateToExclusive = new Date(retentionCutoffReportDate.getTime() + DAY_MS);
        const historicalToExclusive = aggregateDateToExclusive < historicalAggregateToExclusive
            ? aggregateDateToExclusive
            : historicalAggregateToExclusive;
        const hasHistoricalRange = aggregateDateFrom < historicalToExclusive;
        const rawCoverageFrom = new Date(historicalAggregateToExclusive.getTime() - 7 * 60 * 60 * 1000);
        const rawDateFrom = dateFrom > rawCoverageFrom ? dateFrom : rawCoverageFrom;
        const hasRawRange = rawDateFrom < dateToExclusive;

        const rawBaseWhere: import("@prisma/client").Prisma.CustomerFeedbackResponseWhereInput = {
            kind: "STANDARD",
            submittedAt: { gte: rawDateFrom, lt: dateToExclusive },
            ...(stationId ? { stationId } : {}),
            ...(targetType.value ? { targetType: targetType.value } : {}),
        };
        const where: import("@prisma/client").Prisma.CustomerFeedbackResponseWhereInput = {
            ...rawBaseWhere,
            validity: "VALID" as const,
            overallRating: { not: null },
        };

        const responses = hasRawRange
            ? await prisma.customerFeedbackResponse.findMany({
                  where,
                  select: {
                      id: true,
                      stationId: true,
                      employeeId: true,
                      targetType: true,
                      overallRating: true,
                      reasonKeys: true,
                      submittedAt: true,
                      stationLabelSnapshot: true,
                      employeeLabelSnapshot: true,
                  },
              })
            : [];

        const aggregateFilters = {
            reportDate: { gte: aggregateDateFrom, lt: historicalToExclusive },
            isTest: false,
            surveyVersion: { in: ["employee-v1", "station-v1"] },
            ...(stationId ? { stationKey: stationId } : {}),
            ...(targetType.value ? { targetType: targetType.value } : {}),
        };
        const [historicalRatingRows, historicalReasonRows] = hasHistoricalRange
            ? await Promise.all([
                  prisma.customerFeedbackDailyAggregate.groupBy({
                      by: ["reportDate", "stationKey", "targetType"],
                      where: aggregateFilters,
                      _sum: {
                          validCount: true,
                          suspectedCount: true,
                          ratingSum: true,
                          ratingCount: true,
                          rating1Count: true,
                          rating2Count: true,
                          rating3Count: true,
                          rating4Count: true,
                          rating5Count: true,
                      },
                  }),
                  prisma.customerFeedbackDailyReasonAggregate.groupBy({
                      by: ["reasonKey"],
                      where: {
                          reportDate: { gte: aggregateDateFrom, lt: historicalToExclusive },
                          isTest: false,
                          surveyVersion: { in: ["employee-v1", "station-v1"] },
                          ...(stationId ? { stationKey: stationId } : {}),
                          ...(targetType.value ? { targetType: targetType.value } : {}),
                      },
                      _sum: { validCount: true },
                  }),
              ])
            : [[], []];

        const funnel = {
            opened: 0,
            started: 0,
            confirmed: 0,
            rejected: 0,
            submitted: 0,
            abandoned: 0,
            blocked: 0,
            expired: 0,
        };
        const todayReportDate = aggregateReportDate(now);
        const closedAggregateTo = aggregateDateToExclusive < todayReportDate
            ? aggregateDateToExclusive
            : todayReportDate;
        if (aggregateDateFrom < closedAggregateTo) {
            const aggregateFunnel = await prisma.customerFeedbackDailyAggregate.aggregate({
                where: {
                    reportDate: { gte: aggregateDateFrom, lt: closedAggregateTo },
                    isTest: false,
                    surveyVersion: { in: ["employee-v1", "station-v1"] },
                    ...(stationId ? { stationKey: stationId } : {}),
                    ...(targetType.value ? { targetType: targetType.value } : {}),
                },
                _sum: {
                    openedCount: true,
                    startedCount: true,
                    confirmedCount: true,
                    targetRejectedCount: true,
                    submittedCount: true,
                    abandonedCount: true,
                    botBlockedCount: true,
                    expiredCount: true,
                },
            });
            funnel.opened += aggregateFunnel._sum.openedCount ?? 0;
            funnel.started += aggregateFunnel._sum.startedCount ?? 0;
            funnel.confirmed += aggregateFunnel._sum.confirmedCount ?? 0;
            funnel.rejected += aggregateFunnel._sum.targetRejectedCount ?? 0;
            funnel.submitted += aggregateFunnel._sum.submittedCount ?? 0;
            funnel.abandoned += aggregateFunnel._sum.abandonedCount ?? 0;
            funnel.blocked += aggregateFunnel._sum.botBlockedCount ?? 0;
            funnel.expired += aggregateFunnel._sum.expiredCount ?? 0;
        }

        // Cron สรุปเฉพาะวันที่ปิดแล้ว จึงอ่าน Visit ของวันนี้สดและตัดวันนี้ออกจาก aggregate ด้านบน
        const todayStart = startOfDayBangkok(now);
        const liveFrom = dateFrom > todayStart ? dateFrom : todayStart;
        const liveTo = dateToExclusive < now ? dateToExclusive : now;
        if (liveFrom < liveTo) {
            const liveVisits = await prisma.customerFeedbackVisit.findMany({
                where: {
                    openedAt: { gte: liveFrom, lt: liveTo },
                    isTestAtOpen: false,
                    surveyVersion: { in: ["employee-v1", "station-v1"] },
                    ...(targetType.value ? { targetType: targetType.value } : {}),
                    ...(stationId
                        ? {
                              OR: [
                                  { stationIdSelected: stationId },
                                  { stationIdSelected: null, stationIdAtOpen: stationId },
                                  {
                                      stationIdSelected: null,
                                      stationIdAtOpen: null,
                                      qrCode: { stationId },
                                  },
                              ],
                          }
                        : {}),
                },
                select: {
                    stationIdSelected: true,
                    stationIdAtOpen: true,
                    targetType: true,
                    surveyVersion: true,
                    isTestAtOpen: true,
                    disposition: true,
                    formExpiresAt: true,
                    startedAt: true,
                    targetConfirmation: true,
                    qrCode: { select: { stationId: true } },
                },
            });
            for (const visit of liveVisits) {
                const visitStation = visit.stationIdSelected ?? visit.stationIdAtOpen ?? visit.qrCode?.stationId ?? "NO_QR";
                if (visit.isTestAtOpen || !["employee-v1", "station-v1"].includes(visit.surveyVersion)) continue;
                if (stationId && visitStation !== stationId) continue;
                if (targetType.value && visit.targetType !== targetType.value) continue;
                const disposition = visit.disposition === "OPEN" && visit.formExpiresAt < now
                    ? (visit.startedAt ? "ABANDONED" : "EXPIRED")
                    : visit.disposition;
                funnel.opened++;
                if (visit.startedAt) funnel.started++;
                if (visit.targetConfirmation === "YES") funnel.confirmed++;
                if (disposition === "TARGET_REJECTED") funnel.rejected++;
                if (disposition === "SUBMITTED") funnel.submitted++;
                if (disposition === "ABANDONED") funnel.abandoned++;
                if (disposition === "BOT_BLOCKED") funnel.blocked++;
                if (disposition === "EXPIRED") funnel.expired++;
            }
        }

        const combinedDistribution = emptyRatingDistribution();
        for (const row of historicalRatingRows) addAggregateRatings(combinedDistribution, row._sum);
        for (const response of responses) addRating(combinedDistribution, response.overallRating!);
        const summary = summarizeRatingDistribution(combinedDistribution);

        // แนวโน้มรายวันรวม aggregate เก่ากับข้อมูลดิบที่ยังอยู่
        const daily = new Map<string, { sum: number; count: number }>();
        for (const row of historicalRatingRows) {
            const key = row.reportDate.toISOString().slice(0, 10);
            const entry = daily.get(key) ?? { sum: 0, count: 0 };
            entry.sum += row._sum.ratingSum ?? 0;
            entry.count += row._sum.ratingCount ?? 0;
            daily.set(key, entry);
        }
        for (const response of responses) {
            const key = new Date(response.submittedAt.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
            const entry = daily.get(key) ?? { sum: 0, count: 0 };
            entry.sum += response.overallRating!;
            entry.count++;
            daily.set(key, entry);
        }
        const trend = [...daily.entries()]
            .filter(([, value]) => value.count > 0)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .map(([date, value]) => ({ date, count: value.count, average: value.sum / value.count }));

        // สาเหตุ แยกเจ้าของปัญหา
        const reasonCounts = new Map<string, number>();
        for (const row of historicalReasonRows) {
            reasonCounts.set(row.reasonKey, (reasonCounts.get(row.reasonKey) ?? 0) + (row._sum.validCount ?? 0));
        }
        for (const r of responses) {
            for (const k of r.reasonKeys) reasonCounts.set(k, (reasonCounts.get(k) ?? 0) + 1);
        }
        const reasons = [...reasonCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([key, count]) => ({ key, count, owner: getReasonOwner(key) }));

        // ตารางสถานี
        const byStation = new Map<string, { name: string; distribution: RatingSummary["distribution"] }>();
        for (const row of historicalRatingRows) {
            if (row.targetType !== "STATION" || row.stationKey === "NO_QR") continue;
            const entry = byStation.get(row.stationKey) ?? {
                name: row.stationKey,
                distribution: emptyRatingDistribution(),
            };
            addAggregateRatings(entry.distribution, row._sum);
            byStation.set(row.stationKey, entry);
        }
        for (const r of responses) {
            if (r.targetType !== "STATION") continue;
            const key = r.stationId ?? "unknown";
            const entry = byStation.get(key) ?? { name: r.stationLabelSnapshot ?? key, distribution: emptyRatingDistribution() };
            if (r.stationLabelSnapshot) entry.name = r.stationLabelSnapshot;
            addRating(entry.distribution, r.overallRating!);
            byStation.set(key, entry);
        }
        const unresolvedStationIds = [...byStation.entries()]
            .filter(([id, value]) => value.name === id && id !== "unknown")
            .map(([id]) => id);
        if (unresolvedStationIds.length > 0) {
            const stationNames = await prisma.station.findMany({
                where: { id: { in: unresolvedStationIds } },
                select: { id: true, name: true },
            });
            for (const station of stationNames) {
                const entry = byStation.get(station.id);
                if (entry) entry.name = station.name;
            }
        }
        const stationsTable = [...byStation.entries()].map(([id, v]) => ({
            id,
            name: v.name,
            ...summarizeRatingDistribution(v.distribution),
        })).sort((a, b) => b.count - a.count);

        // ตารางพนักงาน — แสดงเฉพาะคนที่ถึง minimum sample และใช้ข้อมูลจาก QR พนักงานเท่านั้น
        const byEmployee = new Map<string, { name: string; ratings: number[] }>();
        for (const r of responses) {
            if (r.targetType !== "EMPLOYEE" || !r.employeeId) continue;
            const entry = byEmployee.get(r.employeeId) ?? { name: r.employeeLabelSnapshot ?? r.employeeId, ratings: [] };
            entry.ratings.push(r.overallRating!);
            byEmployee.set(r.employeeId, entry);
        }
        const employeesTable = [...byEmployee.entries()]
            .map(([id, v]) => ({ id, ...summarizeRatings(v.ratings), name: v.name }))
            .filter((e) => e.count >= MIN_EMPLOYEE_SAMPLE)
            .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

        // เคสค้าง
        const openCases = await prisma.customerFeedbackCase.count({
            where: {
                status: { in: ["OPEN", "IN_PROGRESS"] },
                ...(stationId ? { stationId } : {}),
                ...(!canViewIncident || targetType.value
                    ? {
                          response: {
                              validity: { not: "TEST" },
                              ...(!canViewIncident ? { kind: "STANDARD" as const } : {}),
                              ...(targetType.value ? { targetType: targetType.value } : {}),
                          },
                      }
                    : { response: { validity: { not: "TEST" } } }),
            },
        });

        // suspected rate
        const [rawValidCount, rawSuspectedCount] = hasRawRange
            ? await Promise.all([
                  prisma.customerFeedbackResponse.count({ where: { ...rawBaseWhere, validity: "VALID" } }),
                  prisma.customerFeedbackResponse.count({ where: { ...rawBaseWhere, validity: "SUSPECTED" } }),
              ])
            : [0, 0];
        const validCount = rawValidCount + historicalRatingRows.reduce((sum, row) => sum + (row._sum.validCount ?? 0), 0);
        const suspectedCount = rawSuspectedCount + historicalRatingRows.reduce((sum, row) => sum + (row._sum.suspectedCount ?? 0), 0);

        const payload: Record<string, unknown> = {
            summary: { ...summary, suspectedCount, validCount, openCases },
            funnel,
            trend,
            reasons,
            stations: stationsTable,
            employees: employeesTable,
            minimumEmployeeSample: MIN_EMPLOYEE_SAMPLE,
            minimumStationSample: MIN_STATION_COMPARE_SAMPLE,
            disclaimer: "แบบประเมิน QR เป็นข้อมูลจากลูกค้าที่เลือกตอบและไม่แทนลูกค้าทุกคน",
            coverage: {
                usesHistoricalAggregates: hasHistoricalRange,
                employeeDetailAvailableFrom: rawCoverageFrom,
            },
        };

        if (canViewIncident) {
            const incidentCount = await prisma.customerFeedbackResponse.count({
                where: {
                    kind: "INCIDENT",
                    submittedAt: { gte: dateFrom, lt: dateToExclusive },
                    ...(stationId ? { stationId } : {}),
                    ...(targetType.value ? { targetType: targetType.value } : {}),
                },
            });
            payload.incidentCount = incidentCount;
        }

        return NextResponse.json(payload);
    } catch (error) {
        console.error("Error building summary:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
