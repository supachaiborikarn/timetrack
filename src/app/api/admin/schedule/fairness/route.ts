import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, parseDateStringToBangkokMidnight } from "@/lib/date-utils";
import {
    fetchFuelLaborAnalytics,
    findFuelStationMatch,
    type FuelLaborAnalytics,
    type FuelStationTrend,
    type FuelTodayStation,
} from "@/lib/fuel-station-demand";

export const dynamic = "force-dynamic";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"];

interface ShiftLike {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    isNightShift: boolean;
}

interface DemandInfo {
    shiftId: string;
    requiredWorkers: number;
    source: "fuel-hourly" | "fuel-trend" | "current-schedule";
    isPeak: boolean;
    coveredHours: number[];
}

interface CoverageRow {
    date: string;
    dayName: string;
    shiftId: string;
    shiftCode: string;
    shiftName: string;
    requiredWorkers: number;
    assignedWorkers: number;
    gap: number;
    status: "under" | "ok" | "over";
    isPeak: boolean;
}

interface EmployeeStats {
    userId: string;
    employeeId: string;
    name: string;
    nickName: string | null;
    department: string;
    workDays: number;
    dayOffs: number;
    weekendWorkDays: number;
    peakShiftCount: number;
    unavailableAssigned: number;
    preferredOffAssigned: number;
    maxConsecutiveWorkDays: number;
    assignedHours: number;
}

function toBangkokDateKey(date: Date): string {
    const bkk = new Date(date.getTime() + BANGKOK_OFFSET_MS);
    const year = bkk.getUTCFullYear();
    const month = String(bkk.getUTCMonth() + 1).padStart(2, "0");
    const day = String(bkk.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getDayOfWeek(dateKey: string): number {
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0)).getUTCDay();
}

function parseTimeMinutes(time: string): number {
    const [hourText, minuteText = "0"] = time.split(":");
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return 0;
    return hour * 60 + minute;
}

function getShiftDurationHours(shift: ShiftLike): number {
    const start = parseTimeMinutes(shift.startTime);
    const rawEnd = parseTimeMinutes(shift.endTime);
    const end = rawEnd <= start ? rawEnd + 24 * 60 : rawEnd;
    return Math.max(1, (end - start) / 60);
}

function getCoveredHours(shift: ShiftLike): number[] {
    const start = parseTimeMinutes(shift.startTime);
    const rawEnd = parseTimeMinutes(shift.endTime);
    const end = rawEnd <= start ? rawEnd + 24 * 60 : rawEnd;
    const hours: number[] = [];

    for (let minute = start; minute < end; minute += 60) {
        const hour = Math.floor(minute / 60) % 24;
        if (!hours.includes(hour)) hours.push(hour);
    }

    return hours.length > 0 ? hours : [Math.floor(start / 60) % 24];
}

function buildDateKeys(year: number, month: number): string[] {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, index) => {
        const day = String(index + 1).padStart(2, "0");
        return `${year}-${String(month).padStart(2, "0")}-${day}`;
    });
}

function average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clampScore(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function getCoverageStatus(gap: number): CoverageRow["status"] {
    if (gap < 0) return "under";
    if (gap > 0) return "over";
    return "ok";
}

function makeAssignmentKey(dateKey: string, shiftId: string): string {
    return `${dateKey}:${shiftId}`;
}

function buildFallbackDemand(
    shifts: ShiftLike[],
    dateKeys: string[],
    assignmentCounts: Map<string, number>,
): Map<string, DemandInfo> {
    const demand = new Map<string, DemandInfo>();

    for (const shift of shifts) {
        const dailyCounts = dateKeys.map((dateKey) => assignmentCounts.get(makeAssignmentKey(dateKey, shift.id)) ?? 0);
        const positiveCounts = dailyCounts.filter((count) => count > 0);
        const requiredWorkers = Math.max(1, Math.round(average(positiveCounts.length > 0 ? positiveCounts : dailyCounts)));

        demand.set(shift.id, {
            shiftId: shift.id,
            requiredWorkers,
            source: "current-schedule",
            isPeak: false,
            coveredHours: getCoveredHours(shift),
        });
    }

    return demand;
}

function markPeakShifts(demand: Map<string, DemandInfo>): Map<string, DemandInfo> {
    const values = Array.from(demand.values());
    const maxRequired = Math.max(...values.map((item) => item.requiredWorkers), 1);
    const peakThreshold = Math.max(2, Math.ceil(maxRequired * 0.75));

    return new Map(values.map((item) => [
        item.shiftId,
        {
            ...item,
            isPeak: item.requiredWorkers >= peakThreshold && maxRequired > 1,
        },
    ]));
}

function buildDemandByShift(params: {
    shifts: ShiftLike[];
    dateKeys: string[];
    assignmentCounts: Map<string, number>;
    todayStation: FuelTodayStation | null;
    stationTrend: FuelStationTrend | null;
    fuelData: FuelLaborAnalytics | null;
}): Map<string, DemandInfo> {
    const fallback = buildFallbackDemand(params.shifts, params.dateKeys, params.assignmentCounts);
    const hourlyRows = params.todayStation?.hourlyProductivity ?? [];

    if (hourlyRows.length > 0) {
        const hourlyMap = new Map(hourlyRows.map((row) => [row.hour_block, row]));
        const hourlyTxPerWorker = hourlyRows
            .map((row) => row.txPerWorker)
            .filter((value) => value > 0);
        const dailyTxPerWorker = params.stationTrend?.avgTxPerWorker
            || params.fuelData?.today.crossBranch?.avgTxPerWorker
            || 0;
        const targetTxPerWorkerHour = Math.max(4, Math.round(average(hourlyTxPerWorker) || dailyTxPerWorker / 8 || 6));
        const demand = new Map<string, DemandInfo>();

        for (const shift of params.shifts) {
            const coveredHours = getCoveredHours(shift);
            const requiredByHour = coveredHours.flatMap((hour) => {
                const row = hourlyMap.get(hour);
                if (!row) return [];
                if (row.txCount > 0) return [Math.max(1, Math.ceil(row.txCount / targetTxPerWorkerHour))];
                if (row.workers > 0) return [row.workers];
                return [];
            });
            const fallbackRequired = fallback.get(shift.id)?.requiredWorkers ?? 1;
            const requiredWorkers = requiredByHour.length > 0
                ? Math.max(fallbackRequired, ...requiredByHour)
                : fallbackRequired;

            demand.set(shift.id, {
                shiftId: shift.id,
                requiredWorkers,
                source: "fuel-hourly",
                isPeak: false,
                coveredHours,
            });
        }

        return markPeakShifts(demand);
    }

    if (params.stationTrend && params.stationTrend.avgWorkers > 0) {
        const demand = new Map<string, DemandInfo>();
        const estimatedShiftWorkers = Math.max(1, Math.round(params.stationTrend.avgWorkers / Math.max(1, Math.min(2, params.shifts.length))));

        for (const shift of params.shifts) {
            const fallbackRequired = fallback.get(shift.id)?.requiredWorkers ?? 1;
            demand.set(shift.id, {
                shiftId: shift.id,
                requiredWorkers: Math.max(fallbackRequired, Math.min(fallbackRequired + 1, estimatedShiftWorkers)),
                source: "fuel-trend",
                isPeak: false,
                coveredHours: getCoveredHours(shift),
            });
        }

        return markPeakShifts(demand);
    }

    return markPeakShifts(fallback);
}

function buildRecommendations(params: {
    score: number;
    demandSource: string;
    coverageRows: CoverageRow[];
    unavailableAssigned: number;
    preferredOffAssigned: number;
    workDaySpread: number;
    peakSpread: number;
    fuelError: string | null;
}): string[] {
    const recommendations: string[] = [];
    const underRows = params.coverageRows
        .filter((row) => row.status === "under")
        .sort((a, b) => a.gap - b.gap)
        .slice(0, 3);

    for (const row of underRows) {
        recommendations.push(`${row.date} ${row.shiftCode} ขาด ${Math.abs(row.gap)} คน`);
    }

    if (params.unavailableAssigned > 0) {
        recommendations.push(`มี ${params.unavailableAssigned} กะที่ชนวันที่พนักงานแจ้งไม่ว่าง`);
    }

    if (params.preferredOffAssigned > 0) {
        recommendations.push(`มี ${params.preferredOffAssigned} กะที่ชนวันที่พนักงานอยากหยุด`);
    }

    if (params.workDaySpread > 2) {
        recommendations.push(`จำนวนวันทำงานต่างกัน ${params.workDaySpread} วัน ควรกระจายกะเพิ่ม`);
    }

    if (params.peakSpread > 2) {
        recommendations.push(`กะช่วงคนเยอะกระจุกต่างกัน ${params.peakSpread} กะ`);
    }

    if (params.demandSource === "current-schedule" && params.fuelError) {
        recommendations.push(`ยังใช้ demand จากตารางกะเดิม เพราะ ${params.fuelError}`);
    }

    if (recommendations.length === 0 && params.score >= 85) {
        recommendations.push("ตารางนี้กระจายงานได้ดีแล้ว");
    }

    return recommendations;
}

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");
        const month = Number(searchParams.get("month"));
        const year = Number(searchParams.get("year"));
        const days = Number(searchParams.get("days") || "90");

        if (!stationId || !month || !year) {
            return NextResponse.json(
                { error: "stationId, month, and year are required" },
                { status: 400 },
            );
        }

        const station = await prisma.station.findUnique({
            where: { id: stationId },
            select: { id: true, name: true, code: true },
        });

        if (!station) {
            return NextResponse.json({ error: "Station not found" }, { status: 404 });
        }

        const dateKeys = buildDateKeys(year, month);
        const startDate = parseDateStringToBangkokMidnight(dateKeys[0]);
        const endExclusive = addDays(parseDateStringToBangkokMidnight(dateKeys[dateKeys.length - 1]), 1);

        const employees = await prisma.user.findMany({
            where: { stationId, isActive: true },
            select: {
                id: true,
                employeeId: true,
                name: true,
                nickName: true,
                department: {
                    select: {
                        name: true,
                        code: true,
                        isFrontYard: true,
                    },
                },
            },
            orderBy: [{ departmentId: "asc" }, { name: "asc" }],
        });

        const frontyardEmployees = employees.filter((employee) => employee.department?.isFrontYard);
        const analysisEmployees = frontyardEmployees.length > 0 ? frontyardEmployees : employees;
        const analysisUserIds = new Set(analysisEmployees.map((employee) => employee.id));

        const shifts = await prisma.shift.findMany({
            where: {
                isActive: true,
                OR: [{ stationId }, { stationId: null }],
            },
            select: {
                id: true,
                code: true,
                name: true,
                startTime: true,
                endTime: true,
                isNightShift: true,
                sortOrder: true,
            },
            orderBy: { sortOrder: "asc" },
        });

        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: { in: analysisEmployees.map((employee) => employee.id) },
                date: { gte: startDate, lt: endExclusive },
            },
            select: {
                userId: true,
                shiftId: true,
                date: true,
                isDayOff: true,
            },
        });

        const usedShiftIds = new Set(assignments.map((assignment) => assignment.shiftId));
        const analysisShifts = (usedShiftIds.size > 0
            ? shifts.filter((shift) => usedShiftIds.has(shift.id))
            : shifts).map((shift) => ({
                id: shift.id,
                code: shift.code,
                name: shift.name,
                startTime: shift.startTime,
                endTime: shift.endTime,
                isNightShift: shift.isNightShift,
            }));

        const availability = await prisma.employeeAvailability.findMany({
            where: {
                userId: { in: analysisEmployees.map((employee) => employee.id) },
                date: { gte: startDate, lt: endExclusive },
            },
            select: {
                userId: true,
                date: true,
                status: true,
            },
        });

        const assignmentCounts = new Map<string, number>();
        const assignmentsByDateShift = new Map<string, Set<string>>();
        const workedDatesByUser = new Map<string, Set<string>>();

        for (const assignment of assignments) {
            const dateKey = toBangkokDateKey(assignment.date);
            if (assignment.isDayOff) continue;

            const key = makeAssignmentKey(dateKey, assignment.shiftId);
            assignmentCounts.set(key, (assignmentCounts.get(key) ?? 0) + 1);

            if (!assignmentsByDateShift.has(key)) assignmentsByDateShift.set(key, new Set());
            assignmentsByDateShift.get(key)?.add(assignment.userId);

            if (!workedDatesByUser.has(assignment.userId)) workedDatesByUser.set(assignment.userId, new Set());
            workedDatesByUser.get(assignment.userId)?.add(dateKey);
        }

        const fuelResult = await fetchFuelLaborAnalytics(Number.isFinite(days) && days > 0 ? days : 90);
        const fuelData = fuelResult.ok ? fuelResult.data : null;
        const matchedFuelStation = fuelData ? findFuelStationMatch(station, fuelData) : null;
        const matchedFuelStationId = matchedFuelStation?.stationId ?? null;
        const todayStation = matchedFuelStationId && fuelData
            ? fuelData.today.stations.find((item) => item.stationId === matchedFuelStationId) ?? null
            : null;
        const stationTrend = matchedFuelStationId && fuelData
            ? fuelData.trends.byStation.find((item) => item.stationId === matchedFuelStationId) ?? null
            : null;

        const demandByShift = buildDemandByShift({
            shifts: analysisShifts,
            dateKeys,
            assignmentCounts,
            todayStation,
            stationTrend,
            fuelData,
        });

        const coverageRows: CoverageRow[] = [];
        for (const dateKey of dateKeys) {
            const dayName = DAY_NAMES[getDayOfWeek(dateKey)];

            for (const shift of analysisShifts) {
                const demand = demandByShift.get(shift.id);
                const requiredWorkers = demand?.requiredWorkers ?? 1;
                const assignedWorkers = assignmentsByDateShift.get(makeAssignmentKey(dateKey, shift.id))?.size ?? 0;
                const gap = assignedWorkers - requiredWorkers;

                coverageRows.push({
                    date: dateKey,
                    dayName,
                    shiftId: shift.id,
                    shiftCode: shift.code,
                    shiftName: shift.name,
                    requiredWorkers,
                    assignedWorkers,
                    gap,
                    status: getCoverageStatus(gap),
                    isPeak: demand?.isPeak ?? false,
                });
            }
        }

        const availabilityMap = new Map<string, "AVAILABLE" | "UNAVAILABLE" | "PREFERRED_OFF">();
        for (const item of availability) {
            availabilityMap.set(`${item.userId}:${toBangkokDateKey(item.date)}`, item.status);
        }

        const employeeStats = new Map<string, EmployeeStats>();
        for (const employee of analysisEmployees) {
            employeeStats.set(employee.id, {
                userId: employee.id,
                employeeId: employee.employeeId,
                name: employee.name,
                nickName: employee.nickName,
                department: employee.department?.name ?? "-",
                workDays: 0,
                dayOffs: 0,
                weekendWorkDays: 0,
                peakShiftCount: 0,
                unavailableAssigned: 0,
                preferredOffAssigned: 0,
                maxConsecutiveWorkDays: 0,
                assignedHours: 0,
            });
        }

        for (const assignment of assignments) {
            if (!analysisUserIds.has(assignment.userId)) continue;

            const stat = employeeStats.get(assignment.userId);
            const shift = analysisShifts.find((item) => item.id === assignment.shiftId);
            if (!stat || !shift) continue;

            const dateKey = toBangkokDateKey(assignment.date);
            if (assignment.isDayOff) {
                stat.dayOffs += 1;
                continue;
            }

            stat.workDays += 1;
            stat.assignedHours += getShiftDurationHours(shift);

            if ([0, 6].includes(getDayOfWeek(dateKey))) {
                stat.weekendWorkDays += 1;
            }

            if (demandByShift.get(assignment.shiftId)?.isPeak) {
                stat.peakShiftCount += 1;
            }

            const availabilityStatus = availabilityMap.get(`${assignment.userId}:${dateKey}`);
            if (availabilityStatus === "UNAVAILABLE") {
                stat.unavailableAssigned += 1;
            } else if (availabilityStatus === "PREFERRED_OFF") {
                stat.preferredOffAssigned += 1;
            }
        }

        for (const stat of employeeStats.values()) {
            const workedDates = workedDatesByUser.get(stat.userId) ?? new Set<string>();
            let consecutive = 0;
            let maxConsecutive = 0;

            for (const dateKey of dateKeys) {
                if (workedDates.has(dateKey)) {
                    consecutive += 1;
                    maxConsecutive = Math.max(maxConsecutive, consecutive);
                } else {
                    consecutive = 0;
                }
            }

            stat.maxConsecutiveWorkDays = maxConsecutive;
        }

        const employeeRows = Array.from(employeeStats.values()).sort((a, b) => b.workDays - a.workDays);
        const workDays = employeeRows.map((item) => item.workDays);
        const peakCounts = employeeRows.map((item) => item.peakShiftCount);
        const workDaySpread = workDays.length > 0 ? Math.max(...workDays) - Math.min(...workDays) : 0;
        const peakSpread = peakCounts.length > 0 ? Math.max(...peakCounts) - Math.min(...peakCounts) : 0;
        const understaffedSlots = coverageRows.filter((row) => row.status === "under").reduce((sum, row) => sum + Math.abs(row.gap), 0);
        const overstaffedSlots = coverageRows.filter((row) => row.status === "over").reduce((sum, row) => sum + row.gap, 0);
        const unavailableAssigned = employeeRows.reduce((sum, item) => sum + item.unavailableAssigned, 0);
        const preferredOffAssigned = employeeRows.reduce((sum, item) => sum + item.preferredOffAssigned, 0);
        const consecutivePenalty = employeeRows.reduce((sum, item) => sum + Math.max(0, item.maxConsecutiveWorkDays - 6), 0);
        const penalty =
            understaffedSlots * 3 +
            overstaffedSlots * 0.5 +
            unavailableAssigned * 12 +
            preferredOffAssigned * 4 +
            workDaySpread * 2 +
            peakSpread * 2 +
            consecutivePenalty * 4;
        const score = clampScore(100 - penalty);
        const demandSources = Array.from(new Set(Array.from(demandByShift.values()).map((item) => item.source)));
        const demandSource = demandSources.includes("fuel-hourly")
            ? "fuel-hourly"
            : demandSources.includes("fuel-trend")
                ? "fuel-trend"
                : "current-schedule";
        const recommendations = buildRecommendations({
            score,
            demandSource,
            coverageRows,
            unavailableAssigned,
            preferredOffAssigned,
            workDaySpread,
            peakSpread,
            fuelError: fuelResult.ok ? null : fuelResult.error,
        });

        return NextResponse.json({
            station,
            month,
            year,
            scope: frontyardEmployees.length > 0 ? "frontyard" : "all",
            score,
            statusLabel: score >= 85 ? "ดี" : score >= 70 ? "พอใช้" : "ต้องปรับ",
            summary: {
                employeeCount: employeeRows.length,
                shiftCount: analysisShifts.length,
                understaffedSlots,
                overstaffedSlots,
                unavailableAssigned,
                preferredOffAssigned,
                workDaySpread,
                peakSpread,
                maxConsecutiveWorkDays: employeeRows.length > 0
                    ? Math.max(...employeeRows.map((item) => item.maxConsecutiveWorkDays))
                    : 0,
            },
            demandSource: {
                type: demandSource,
                label: demandSource === "fuel-hourly"
                    ? "fuel-station รายชั่วโมง"
                    : demandSource === "fuel-trend"
                        ? "fuel-station ย้อนหลัง"
                        : "ตารางกะเดิม",
                fuelStationId: matchedFuelStationId,
                fuelStationName: matchedFuelStation?.name ?? null,
                fuelDate: fuelData?.date ?? null,
                days: fuelData?.trends.days ?? days,
                error: fuelResult.ok ? null : fuelResult.error,
            },
            shifts: analysisShifts.map((shift) => {
                const demand = demandByShift.get(shift.id);
                return {
                    ...shift,
                    requiredWorkers: demand?.requiredWorkers ?? 1,
                    demandSource: demand?.source ?? "current-schedule",
                    isPeak: demand?.isPeak ?? false,
                    coveredHours: demand?.coveredHours ?? [],
                };
            }),
            coverageRows,
            employeeRows,
            recommendations,
        });
    } catch (error) {
        console.error("Error fetching shift fairness:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
