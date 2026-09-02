import { prisma } from "@/lib/prisma";
import type { CompetitionFairPlayStatus } from "@prisma/client";
import { calculateEmployeePerformance } from "@/lib/employee-performance";
import { summarizeEmployeeRubric, type EmployeeScoreResponseInput } from "@/lib/customer-feedback/employee-score";
import { EMPLOYEE_SCORE_QUESTION_KEYS, EMPLOYEE_SCORE_TOTAL } from "@/lib/customer-feedback/questions";
import { EMPLOYEE_DAILY_EVALUATION_TARGET } from "@/lib/customer-feedback/evaluation-target";
import { ABUSE_SUSPECT_THRESHOLD } from "@/lib/customer-feedback/anti-abuse";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";
import { REWARD_CUSTOMER_QUALITY_MIN_POINTS, rewardPointsForLeagueScore, resolveRewardEligibility, type RewardEligibilityReason } from "@/lib/competition/reward-policy";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const LEAGUE_WEIGHTS = {
    work: 60,
    customer: 25,
    mission: 15,
} as const;

export const WEEKLY_REWARD_OPTIONS = [
    { code: "CHAMPION_MEAL", label: "Champion Meal", description: "เลือกชุดอาหารพิเศษมูลค่าไม่เกิน 300 บาท", valueBaht: 300 },
    { code: "MYSTERY_REWARD", label: "Mystery Reward", description: "ของรางวัลพิเศษประจำสัปดาห์ มูลค่าประมาณ 300 บาท", valueBaht: 300 },
] as const;

export const MONTHLY_REWARD_OPTIONS = [
    { code: "VOUCHER_700", label: "Voucher 700 บาท", description: "Voucher ร้านอาหารหรือร้านค้าที่บริษัทกำหนด", valueBaht: 700 },
    { code: "FAMILY_MEAL_700", label: "Family Meal", description: "งบอาหารสำหรับพนักงาน/ครอบครัวไม่เกิน 700 บาท", valueBaht: 700 },
] as const;

export const GRAND_REWARD_OPTIONS = [
    { code: "GRAND_VOUCHER_1500", label: "Grand Voucher 1,500 บาท", description: "Voucher รางวัลใหญ่ประจำเดือน", valueBaht: 1500 },
    { code: "PREMIUM_REWARD", label: "Premium Reward", description: "เลือกของรางวัลพิเศษมูลค่าไม่เกิน 1,500 บาท", valueBaht: 1500 },
] as const;

export type LeagueFairPlayStatus = "CLEAR" | "REVIEW" | "APPROVED" | "DISQUALIFIED" | "INELIGIBLE";

export type LeagueStandingResult = {
    userId: string;
    employeeId: string;
    name: string;
    nickName: string | null;
    label: string;
    totalScore: number;
    workPoints: number;
    customerPoints: number;
    missionPoints: number;
    eligibleCustomerCount: number;
    excludedRepeatCustomerCount: number;
    suspiciousCustomerCount: number;
    requiredDays: number;
    presentDays: number;
    missionCompletedDays: number;
    customerMinimumSample: number;
    customerScore64: number | null;
    isEligible: boolean;
    isRewardEligible: boolean;
    rewardEligibilityReason: RewardEligibilityReason;
    rewardPointsPreview: number;
    isProvisional: boolean;
    fairPlayStatus: LeagueFairPlayStatus;
    fairPlayReasons: string[];
    rank: number;
};


export type CompetitionFeedbackSignal = {
    id: string;
    validity: "VALID" | "SUSPECTED" | "HIDDEN" | "TEST";
    abuseScore: number;
    clientHashWeekly: string | null;
};

export function classifyCompetitionFeedback(signals: CompetitionFeedbackSignal[]) {
    const seenClients = new Set<string>();
    const eligibleIds: string[] = [];
    let excludedRepeatCustomerCount = 0;
    let suspiciousCustomerCount = 0;
    let missingClientSignalCount = 0;

    for (const signal of signals) {
        if (signal.validity !== "VALID" || signal.abuseScore >= ABUSE_SUSPECT_THRESHOLD) {
            suspiciousCustomerCount++;
            continue;
        }
        if (!signal.clientHashWeekly) {
            missingClientSignalCount++;
            continue;
        }
        if (seenClients.has(signal.clientHashWeekly)) {
            excludedRepeatCustomerCount++;
            continue;
        }
        seenClients.add(signal.clientHashWeekly);
        eligibleIds.push(signal.id);
    }

    const fairPlayReasons: string[] = [];
    const repeatBase = eligibleIds.length + excludedRepeatCustomerCount;
    const repeatRatio = repeatBase > 0 ? excludedRepeatCustomerCount / repeatBase : 0;
    if (repeatBase >= 5 && repeatRatio >= 0.4) fairPlayReasons.push("high-repeat-customer-ratio");
    if (suspiciousCustomerCount >= 2) fairPlayReasons.push("multiple-suspected-feedback");
    if (missingClientSignalCount >= 2) fairPlayReasons.push("missing-competition-client-signal");

    return {
        eligibleIds,
        excludedRepeatCustomerCount,
        suspiciousCustomerCount,
        missingClientSignalCount,
        repeatRatio,
        fairPlayReasons,
    };
}

export function getBangkokWeekBounds(now: Date = new Date()) {
    const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const dayFromMonday = (shifted.getUTCDay() + 6) % 7;
    const mondayUtcAsBangkok = Date.UTC(
        shifted.getUTCFullYear(),
        shifted.getUTCMonth(),
        shifted.getUTCDate() - dayFromMonday,
        0, 0, 0, 0
    );
    const from = new Date(mondayUtcAsBangkok - BANGKOK_OFFSET_MS);
    const to = new Date(from.getTime() + 7 * DAY_MS);
    return { from, to, key: bangkokDateKey(from) };
}

export function getPreviousBangkokWeekBounds(now: Date = new Date()) {
    const current = getBangkokWeekBounds(now);
    const from = new Date(current.from.getTime() - 7 * DAY_MS);
    return { from, to: current.from, key: bangkokDateKey(from) };
}

export function getBangkokMonthBounds(now: Date = new Date(), monthOffset = 0) {
    const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const startAsBangkok = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + monthOffset, 1);
    const nextAsBangkok = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth() + monthOffset + 1, 1);
    const from = new Date(startAsBangkok - BANGKOK_OFFSET_MS);
    const to = new Date(nextAsBangkok - BANGKOK_OFFSET_MS);
    return { from, to, key: bangkokDateKey(from).slice(0, 7) };
}

function bangkokDateKey(date: Date): string {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

function round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function labelOf(user: { name: string; nickName: string | null }) {
    return user.nickName?.trim() || user.name;
}

function championshipPointsForRank(rank: number): number {
    if (rank === 1) return 10;
    if (rank === 2) return 6;
    if (rank === 3) return 4;
    if (rank === 4 || rank === 5) return 2;
    return 0;
}

export async function calculateStationWeeklyLeague(params: {
    stationId: string;
    from: Date;
    to: Date;
    referenceTime?: Date;
}): Promise<{ station: { id: string; code: string; name: string }; standings: LeagueStandingResult[] }> {
    const referenceTime = params.referenceTime ?? new Date();
    const employees = await prisma.user.findMany({
        where: {
            stationId: params.stationId,
            isActive: true,
            employeeStatus: "ACTIVE",
            department: { is: { isFrontYard: true } },
        },
        select: {
            id: true,
            employeeId: true,
            name: true,
            nickName: true,
            station: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ name: "asc" }, { employeeId: "asc" }],
    });

    const station = employees[0]?.station ?? await prisma.station.findUnique({
        where: { id: params.stationId },
        select: { id: true, code: true, name: true },
    });
    if (!station) throw new Error("Station not found");
    if (employees.length === 0) return { station, standings: [] };

    const userIds = employees.map((employee) => employee.id);
    const [assignments, attendances, leaves, feedbackResponses] = await Promise.all([
        prisma.shiftAssignment.findMany({
            where: { userId: { in: userIds }, date: { gte: params.from, lt: params.to } },
            select: {
                userId: true,
                date: true,
                isDayOff: true,
                shift: { select: { startTime: true, endTime: true, breakMinutes: true, isNightShift: true } },
            },
        }),
        prisma.attendance.findMany({
            where: { userId: { in: userIds }, date: { gte: params.from, lt: params.to } },
            select: {
                userId: true,
                date: true,
                checkInTime: true,
                checkOutTime: true,
                lateMinutes: true,
                breakStartTime: true,
                breakEndTime: true,
                breakDurationMin: true,
            },
        }),
        prisma.leave.findMany({
            where: {
                userId: { in: userIds },
                status: { in: ["APPROVED", "PENDING"] },
                startDate: { lt: params.to },
                endDate: { gte: params.from },
            },
            select: { userId: true, startDate: true, endDate: true, status: true },
        }),
        prisma.customerFeedbackResponse.findMany({
            where: {
                kind: "STANDARD",
                targetType: "EMPLOYEE",
                employeeId: { in: userIds },
                surveyVersion: { in: ["employee-v3", "employee-v4"] },
                validity: { in: ["VALID", "SUSPECTED"] },
                submittedAt: { gte: params.from, lt: params.to },
            },
            select: {
                id: true,
                employeeId: true,
                validity: true,
                abuseScore: true,
                abuseReasons: true,
                submittedAt: true,
                visit: { select: { clientHashWeekly: true } },
                answers: {
                    where: { questionKey: { in: [...EMPLOYEE_SCORE_QUESTION_KEYS] } },
                    select: { questionKey: true, choiceValues: true },
                },
            },
            orderBy: [{ submittedAt: "asc" }, { id: "asc" }],
        }),
    ]);

    const standings: LeagueStandingResult[] = [];
    for (const employee of employees) {
        const employeeAssignments = assignments.filter((row) => row.userId === employee.id);
        const employeeAttendances = attendances.filter((row) => row.userId === employee.id);
        const employeeLeaves = leaves.filter((row) => row.userId === employee.id);
        const employeeFeedback = feedbackResponses.filter((row) => row.employeeId === employee.id);

        const performance = calculateEmployeePerformance({
            assignments: employeeAssignments,
            attendances: employeeAttendances,
            leaves: employeeLeaves,
            customer: {
                applicable: false,
                score64: null,
                responseCount: 0,
                minimumSample: 0,
                meetsMinimumSample: false,
            },
            stationCode: station.code,
            referenceTime,
            attendanceGraceMinutes: DEFAULT_ATTENDANCE_GRACE_MINUTES,
        });

        const feedbackClassification = classifyCompetitionFeedback(employeeFeedback.map((response) => ({
            id: response.id,
            validity: response.validity,
            abuseScore: response.abuseScore,
            clientHashWeekly: response.visit?.clientHashWeekly ?? null,
        })));
        const eligibleIdSet = new Set(feedbackClassification.eligibleIds);
        const eligibleResponses = employeeFeedback.filter((response) => eligibleIdSet.has(response.id));
        const { excludedRepeatCustomerCount, suspiciousCustomerCount } = feedbackClassification;

        const rubricInput: EmployeeScoreResponseInput[] = eligibleResponses.map((response) => ({
            responseId: response.id,
            answers: response.answers.flatMap((answer) => {
                const value = answer.choiceValues[0];
                return value === "YES" || value === "NO" || value === "UNSURE"
                    ? [{ questionKey: answer.questionKey, answer: value }]
                    : [];
            }),
        }));
        const rubric = summarizeEmployeeRubric(rubricInput);
        const customerPoints = rubric.meetsMinimumSample && rubric.score64 != null
            ? round2((rubric.score64 / EMPLOYEE_SCORE_TOTAL) * LEAGUE_WEIGHTS.customer)
            : 0;

        const workedDayKeys = new Set(
            employeeAttendances
                .filter((attendance) => Boolean(attendance.checkInTime))
                .map((attendance) => bangkokDateKey(attendance.date))
        );
        const eligiblePerDay = new Map<string, number>();
        for (const response of eligibleResponses) {
            const key = bangkokDateKey(response.submittedAt);
            eligiblePerDay.set(key, (eligiblePerDay.get(key) ?? 0) + 1);
        }
        const missionCompletedDays = [...workedDayKeys].filter(
            (key) => (eligiblePerDay.get(key) ?? 0) >= EMPLOYEE_DAILY_EVALUATION_TARGET
        ).length;
        const missionPoints = performance.counts.presentDays > 0
            ? round2(LEAGUE_WEIGHTS.mission * Math.min(1, missionCompletedDays / performance.counts.presentDays))
            : 0;

        const fairPlayReasons = feedbackClassification.fairPlayReasons;

        const isEligible = performance.counts.requiredDays > 0 && rubric.meetsMinimumSample;
        const fairPlayStatus: LeagueFairPlayStatus = !isEligible
            ? "INELIGIBLE"
            : fairPlayReasons.length > 0
                ? "REVIEW"
                : "CLEAR";
        const totalScore = round2(Math.min(100, performance.workPoints + customerPoints + missionPoints));
        const rewardEligibility = resolveRewardEligibility({
            requiredDays: performance.counts.requiredDays,
            meetsMinimumCustomerSample: rubric.meetsMinimumSample,
            customerPoints,
            fairPlayNeedsReview: fairPlayReasons.length > 0,
        });
        const rewardPointsPreview = rewardEligibility.eligible ? rewardPointsForLeagueScore(totalScore) : 0;

        standings.push({
            userId: employee.id,
            employeeId: employee.employeeId,
            name: employee.name,
            nickName: employee.nickName,
            label: labelOf(employee),
            totalScore,
            workPoints: round2(performance.workPoints),
            customerPoints,
            missionPoints,
            eligibleCustomerCount: eligibleResponses.length,
            excludedRepeatCustomerCount,
            suspiciousCustomerCount,
            requiredDays: performance.counts.requiredDays,
            presentDays: performance.counts.presentDays,
            missionCompletedDays,
            customerMinimumSample: rubric.minimumSample,
            customerScore64: rubric.meetsMinimumSample ? rubric.score64 : null,
            isEligible,
            isRewardEligible: rewardEligibility.eligible,
            rewardEligibilityReason: rewardEligibility.reason,
            rewardPointsPreview,
            isProvisional: performance.isProvisional || referenceTime < params.to,
            fairPlayStatus,
            fairPlayReasons,
            rank: 0,
        });
    }

    standings.sort((a, b) =>
        Number(b.isEligible) - Number(a.isEligible)
        || b.totalScore - a.totalScore
        || b.eligibleCustomerCount - a.eligibleCustomerCount
        || a.employeeId.localeCompare(b.employeeId)
    );
    standings.forEach((standing, index) => { standing.rank = index + 1; });
    return { station, standings };
}

export async function finalizeCompetitionPeriodRanking(periodId: string) {
    const period = await prisma.competitionPeriod.findUnique({ where: { id: periodId } });
    if (!period) throw new Error("Competition period not found");

    const eligibleWhere = {
        periodId,
        isEligible: true,
        fairPlayStatus: { in: ["CLEAR", "APPROVED"] as CompetitionFairPlayStatus[] },
    };
    const standings = period.type === "MONTHLY_STATION"
        ? await prisma.competitionStanding.findMany({
            where: eligibleWhere,
            orderBy: [{ championshipPoints: "desc" }, { totalScore: "desc" }, { userId: "asc" }],
        })
        : await prisma.competitionStanding.findMany({
            where: eligibleWhere,
            orderBy: [{ totalScore: "desc" }, { eligibleCustomerCount: "desc" }, { userId: "asc" }],
        });

    await prisma.$transaction(async (tx) => {
        await tx.competitionStanding.updateMany({
            where: { periodId },
            data: period.type === "WEEKLY_STATION"
                ? { finalRank: null, championshipPoints: 0, rewardPoints: 0 }
                : { finalRank: null },
        });
        for (let index = 0; index < standings.length; index++) {
            const rank = index + 1;
            await tx.competitionStanding.update({
                where: { id: standings[index].id },
                data: period.type === "WEEKLY_STATION"
                    ? {
                        finalRank: rank,
                        championshipPoints: championshipPointsForRank(rank),
                        rewardPoints: Number(standings[index].customerPoints) >= REWARD_CUSTOMER_QUALITY_MIN_POINTS
                            ? rewardPointsForLeagueScore(Number(standings[index].totalScore))
                            : 0,
                    }
                    : { finalRank: rank },
            });
        }
        await tx.competitionPeriod.update({
            where: { id: periodId },
            data: { status: "FINALIZED", finalizedAt: new Date() },
        });
    });

    const winner = standings[0];
    if (!winner) return { winner: null, standings };

    const awardType = period.type === "WEEKLY_STATION"
        ? "WEEKLY_CHAMPION"
        : period.type === "MONTHLY_STATION"
            ? "MONTHLY_STATION_CHAMPION"
            : "GRAND_CHAMPION";
    const title = period.type === "WEEKLY_STATION"
        ? "Weekly Champion"
        : period.type === "MONTHLY_STATION"
            ? "Station Champion"
            : "Grand Champion";

    await prisma.competitionAward.upsert({
        where: { periodId_userId_awardType: { periodId, userId: winner.userId, awardType } },
        update: { title, rank: 1 },
        create: { periodId, userId: winner.userId, stationId: period.stationId, awardType, title, rank: 1 },
    });

    const eventKey = `competition:${period.type}:${period.periodKey}:${period.stationId ?? "GLOBAL"}`;
    const existingNotification = await prisma.notification.findFirst({
        where: { userId: winner.userId, type: "COMPETITION_AWARD", eventKey },
        select: { id: true },
    });
    if (!existingNotification) {
        await prisma.notification.create({
            data: {
                userId: winner.userId,
                type: "COMPETITION_AWARD",
                title: `🏆 ${title}`,
                message: "ผลการแข่งขันได้รับการยืนยันแล้ว คุณมีรางวัลให้เลือก",
                link: "/league",
                eventKey,
            },
        });
    }
    return { winner, standings };
}

export async function snapshotWeeklyStationLeague(params: { stationId: string; from: Date; to: Date; periodKey: string }) {
    const existing = await prisma.competitionPeriod.findUnique({
        where: { type_periodKey_stationId: { type: "WEEKLY_STATION", periodKey: params.periodKey, stationId: params.stationId } },
        select: { id: true, status: true },
    });
    if (existing?.status === "FINALIZED" || existing?.status === "PENDING_REVIEW") {
        const reviewCount = existing.status === "PENDING_REVIEW"
            ? await prisma.competitionStanding.count({ where: { periodId: existing.id, isEligible: true, fairPlayStatus: "REVIEW" } })
            : 0;
        return { periodId: existing.id, status: existing.status, reviewCount };
    }

    const live = await calculateStationWeeklyLeague({ ...params, referenceTime: params.to });
    const period = await prisma.competitionPeriod.upsert({
        where: {
            type_periodKey_stationId: {
                type: "WEEKLY_STATION",
                periodKey: params.periodKey,
                stationId: params.stationId,
            },
        },
        update: { startDate: params.from, endDate: params.to },
        create: {
            type: "WEEKLY_STATION",
            periodKey: params.periodKey,
            stationId: params.stationId,
            startDate: params.from,
            endDate: params.to,
        },
    });

    for (const standing of live.standings) {
        await prisma.competitionStanding.upsert({
            where: { periodId_userId: { periodId: period.id, userId: standing.userId } },
            update: {
                employeeLabelSnapshot: standing.label,
                totalScore: standing.totalScore,
                workPoints: standing.workPoints,
                customerPoints: standing.customerPoints,
                missionPoints: standing.missionPoints,
                eligibleCustomerCount: standing.eligibleCustomerCount,
                excludedRepeatCustomerCount: standing.excludedRepeatCustomerCount,
                suspiciousCustomerCount: standing.suspiciousCustomerCount,
                requiredDays: standing.requiredDays,
                missionCompletedDays: standing.missionCompletedDays,
                isEligible: standing.isEligible,
                fairPlayStatus: standing.fairPlayStatus,
                fairPlayReasons: standing.fairPlayReasons,
            },
            create: {
                periodId: period.id,
                userId: standing.userId,
                employeeLabelSnapshot: standing.label,
                totalScore: standing.totalScore,
                workPoints: standing.workPoints,
                customerPoints: standing.customerPoints,
                missionPoints: standing.missionPoints,
                eligibleCustomerCount: standing.eligibleCustomerCount,
                excludedRepeatCustomerCount: standing.excludedRepeatCustomerCount,
                suspiciousCustomerCount: standing.suspiciousCustomerCount,
                requiredDays: standing.requiredDays,
                missionCompletedDays: standing.missionCompletedDays,
                isEligible: standing.isEligible,
                fairPlayStatus: standing.fairPlayStatus,
                fairPlayReasons: standing.fairPlayReasons,
            },
        });
    }

    const reviewCount = live.standings.filter((standing) => standing.isEligible && standing.fairPlayStatus === "REVIEW").length;
    if (reviewCount > 0) {
        await prisma.competitionPeriod.update({ where: { id: period.id }, data: { status: "PENDING_REVIEW", finalizedAt: null } });
        return { periodId: period.id, status: "PENDING_REVIEW" as const, reviewCount };
    }
    await finalizeCompetitionPeriodRanking(period.id);
    return { periodId: period.id, status: "FINALIZED" as const, reviewCount: 0 };
}

export async function getMonthlyStationLeaderboard(stationId: string, monthKey: string) {
    const [year, month] = monthKey.split("-").map(Number);
    const from = new Date(Date.UTC(year, month - 1, 1) - BANGKOK_OFFSET_MS);
    const to = new Date(Date.UTC(year, month, 1) - BANGKOK_OFFSET_MS);
    const weeklyPeriods = await prisma.competitionPeriod.findMany({
        where: {
            type: "WEEKLY_STATION",
            stationId,
            status: "FINALIZED",
            endDate: { gt: from, lte: to },
        },
        include: { standings: { where: { finalRank: { not: null } } } },
        orderBy: { startDate: "asc" },
    });
    const totals = new Map<string, { userId: string; label: string; championshipPoints: number; scoreSum: number; weeks: number }>();
    for (const period of weeklyPeriods) {
        for (const standing of period.standings) {
            const current = totals.get(standing.userId) ?? {
                userId: standing.userId,
                label: standing.employeeLabelSnapshot,
                championshipPoints: 0,
                scoreSum: 0,
                weeks: 0,
            };
            current.championshipPoints += standing.championshipPoints;
            current.scoreSum += Number(standing.totalScore);
            current.weeks++;
            totals.set(standing.userId, current);
        }
    }
    return [...totals.values()]
        .map((row) => ({ ...row, averageScore: row.weeks ? round2(row.scoreSum / row.weeks) : 0 }))
        .sort((a, b) => b.championshipPoints - a.championshipPoints || b.averageScore - a.averageScore || a.userId.localeCompare(b.userId))
        .map((row, index) => ({ ...row, rank: index + 1 }));
}

export async function finalizeMonthlyCompetitions(params: { from: Date; to: Date; periodKey: string }) {
    const unresolvedWeekly = await prisma.competitionPeriod.count({
        where: {
            type: "WEEKLY_STATION",
            endDate: { gt: params.from, lte: params.to },
            status: { not: "FINALIZED" },
        },
    });
    if (unresolvedWeekly > 0) {
        return { stationPeriods: 0, grandPeriodId: null, pendingWeeklyReviews: unresolvedWeekly };
    }

    const weeklyPeriods = await prisma.competitionPeriod.findMany({
        where: {
            type: "WEEKLY_STATION",
            status: "FINALIZED",
            stationId: { not: null },
            endDate: { gt: params.from, lte: params.to },
        },
        include: { standings: { where: { finalRank: { not: null } } } },
    });
    const byStation = new Map<string, typeof weeklyPeriods>();
    for (const period of weeklyPeriods) {
        if (!period.stationId) continue;
        const rows = byStation.get(period.stationId) ?? [];
        rows.push(period);
        byStation.set(period.stationId, rows);
    }

    const monthlyPeriodIds: string[] = [];
    for (const [stationId, periods] of byStation) {
        const existingMonthly = await prisma.competitionPeriod.findUnique({
            where: { type_periodKey_stationId: { type: "MONTHLY_STATION", periodKey: params.periodKey, stationId } },
        });
        if (existingMonthly?.status === "FINALIZED") {
            monthlyPeriodIds.push(existingMonthly.id);
            continue;
        }
        const period = existingMonthly ?? await prisma.competitionPeriod.create({
            data: { type: "MONTHLY_STATION", periodKey: params.periodKey, stationId, startDate: params.from, endDate: params.to },
        });
        monthlyPeriodIds.push(period.id);
        const rows = new Map<string, { userId: string; label: string; championshipPoints: number; total: number; work: number; customer: number; mission: number; weeks: number; eligibleCustomers: number }>();
        for (const weekly of periods) {
            for (const standing of weekly.standings) {
                const row = rows.get(standing.userId) ?? { userId: standing.userId, label: standing.employeeLabelSnapshot, championshipPoints: 0, total: 0, work: 0, customer: 0, mission: 0, weeks: 0, eligibleCustomers: 0 };
                row.championshipPoints += standing.championshipPoints;
                row.total += Number(standing.totalScore);
                row.work += Number(standing.workPoints);
                row.customer += Number(standing.customerPoints);
                row.mission += Number(standing.missionPoints);
                row.eligibleCustomers += standing.eligibleCustomerCount;
                row.weeks++;
                rows.set(standing.userId, row);
            }
        }
        for (const row of rows.values()) {
            await prisma.competitionStanding.upsert({
                where: { periodId_userId: { periodId: period.id, userId: row.userId } },
                update: {
                    employeeLabelSnapshot: row.label,
                    totalScore: round2(row.total / row.weeks),
                    workPoints: round2(row.work / row.weeks),
                    customerPoints: round2(row.customer / row.weeks),
                    missionPoints: round2(row.mission / row.weeks),
                    eligibleCustomerCount: row.eligibleCustomers,
                    championshipPoints: row.championshipPoints,
                    isEligible: true,
                    fairPlayStatus: "APPROVED",
                    fairPlayReasons: [],
                },
                create: {
                    periodId: period.id, userId: row.userId, employeeLabelSnapshot: row.label,
                    totalScore: round2(row.total / row.weeks), workPoints: round2(row.work / row.weeks),
                    customerPoints: round2(row.customer / row.weeks), missionPoints: round2(row.mission / row.weeks),
                    eligibleCustomerCount: row.eligibleCustomers, championshipPoints: row.championshipPoints,
                    isEligible: true, fairPlayStatus: "APPROVED", fairPlayReasons: [],
                },
            });
        }
        if (rows.size > 0) {
            await finalizeCompetitionPeriodRanking(period.id);
        } else {
            await prisma.competitionPeriod.update({
                where: { id: period.id },
                data: { status: "FINALIZED", finalizedAt: new Date() },
            });
        }
    }

    const monthlyPeriods = monthlyPeriodIds.length > 0
        ? await prisma.competitionPeriod.findMany({
            where: { id: { in: monthlyPeriodIds }, status: "FINALIZED" },
            include: { standings: { where: { finalRank: 1 }, take: 1 } },
        })
        : [];
    const stationChampions = monthlyPeriods.flatMap((period) => period.standings.map((standing) => ({ period, standing })));
    if (stationChampions.length === 0) return { stationPeriods: monthlyPeriodIds.length, grandPeriodId: null };

    let grandPeriod = await prisma.competitionPeriod.findFirst({
        where: { type: "MONTHLY_GRAND", periodKey: params.periodKey, stationId: null },
    });
    if (grandPeriod?.status === "FINALIZED") {
        return { stationPeriods: monthlyPeriodIds.length, grandPeriodId: grandPeriod.id };
    }
    if (!grandPeriod) {
        grandPeriod = await prisma.competitionPeriod.create({
            data: { type: "MONTHLY_GRAND", periodKey: params.periodKey, startDate: params.from, endDate: params.to },
        });
    }
    for (const { standing } of stationChampions) {
        await prisma.competitionStanding.upsert({
            where: { periodId_userId: { periodId: grandPeriod.id, userId: standing.userId } },
            update: {
                employeeLabelSnapshot: standing.employeeLabelSnapshot, totalScore: standing.totalScore, workPoints: standing.workPoints,
                customerPoints: standing.customerPoints, missionPoints: standing.missionPoints, eligibleCustomerCount: standing.eligibleCustomerCount,
                championshipPoints: standing.championshipPoints, isEligible: true, fairPlayStatus: "APPROVED", fairPlayReasons: [],
            },
            create: {
                periodId: grandPeriod.id, userId: standing.userId, employeeLabelSnapshot: standing.employeeLabelSnapshot,
                totalScore: standing.totalScore, workPoints: standing.workPoints, customerPoints: standing.customerPoints, missionPoints: standing.missionPoints,
                eligibleCustomerCount: standing.eligibleCustomerCount, championshipPoints: standing.championshipPoints, isEligible: true, fairPlayStatus: "APPROVED", fairPlayReasons: [],
            },
        });
    }
    await finalizeCompetitionPeriodRanking(grandPeriod.id);
    return { stationPeriods: monthlyPeriodIds.length, grandPeriodId: grandPeriod.id };
}

export function rewardOptionsForAwardType(type: "WEEKLY_CHAMPION" | "MONTHLY_STATION_CHAMPION" | "GRAND_CHAMPION") {
    if (type === "MONTHLY_STATION_CHAMPION") return MONTHLY_REWARD_OPTIONS;
    if (type === "GRAND_CHAMPION") return GRAND_REWARD_OPTIONS;
    return WEEKLY_REWARD_OPTIONS;
}
