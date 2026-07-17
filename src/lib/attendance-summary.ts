import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DEFAULT_ATTENDANCE_GRACE_MINUTES = 15;

export type AttendancePersonStatus =
    | "PRESENT"
    | "APPROVED_LEAVE"
    | "PENDING_LEAVE"
    | "ABSENT_WITHOUT_LEAVE"
    | "UPCOMING";

export interface AttendancePersonSummary {
    userId: string;
    employeeId: string;
    name: string;
    nickName: string | null;
    departmentName: string;
    status: AttendancePersonStatus;
    checkInTime: string | null;
    lateMinutes: number;
}

export interface AttendanceGroupSummary {
    key: string;
    dateKey: string;
    stationId: string;
    stationCode: string;
    stationName: string;
    shiftId: string;
    shiftCode: string;
    shiftName: string;
    startTime: string;
    endTime: string;
    shiftStartAt: string;
    dueAt: string;
    isDue: boolean;
    scheduled: number;
    present: AttendancePersonSummary[];
    approvedLeave: AttendancePersonSummary[];
    pendingLeave: AttendancePersonSummary[];
    absentWithoutLeave: AttendancePersonSummary[];
    upcoming: AttendancePersonSummary[];
}

export interface AttendanceTotals {
    scheduled: number;
    present: number;
    approvedLeave: number;
    pendingLeave: number;
    absentWithoutLeave: number;
    upcoming: number;
}

export interface AttendanceDailySummary {
    dateKey: string;
    generatedAt: string;
    graceMinutes: number;
    groups: AttendanceGroupSummary[];
    totals: AttendanceTotals;
}

export interface AttendanceStationSummary extends AttendanceTotals {
    stationId: string;
    stationCode: string;
    stationName: string;
    groups: AttendanceGroupSummary[];
    absentPeople: AttendancePersonSummary[];
    pendingLeavePeople: AttendancePersonSummary[];
    approvedLeavePeople: AttendancePersonSummary[];
}

interface ResolveAttendanceStatusInput {
    hasCheckIn: boolean;
    leaveStatuses: Array<"PENDING" | "APPROVED" | "REJECTED">;
    dueAt: Date;
    referenceTime: Date;
}

export function toBangkokDateKey(date: Date): string {
    return new Date(date.getTime() + BANGKOK_OFFSET_MS).toISOString().slice(0, 10);
}

export function shiftStartOnBangkokDate(dateKey: string, startTime: string): Date {
    const [hour, minute] = startTime.split(":").map(Number);
    const startOfDate = parseDateStringToBangkokMidnight(dateKey);

    if (
        !Number.isInteger(hour)
        || !Number.isInteger(minute)
        || hour < 0
        || hour > 23
        || minute < 0
        || minute > 59
    ) {
        throw new Error(`Invalid shift start time: ${startTime}`);
    }

    return new Date(startOfDate.getTime() + (hour * 60 + minute) * 60_000);
}

export function resolveAttendanceStatus(input: ResolveAttendanceStatusInput): AttendancePersonStatus {
    if (input.hasCheckIn) return "PRESENT";
    if (input.leaveStatuses.includes("APPROVED")) return "APPROVED_LEAVE";
    if (input.leaveStatuses.includes("PENDING")) return "PENDING_LEAVE";
    if (input.referenceTime >= input.dueAt) return "ABSENT_WITHOUT_LEAVE";
    return "UPCOMING";
}

function emptyTotals(): AttendanceTotals {
    return {
        scheduled: 0,
        present: 0,
        approvedLeave: 0,
        pendingLeave: 0,
        absentWithoutLeave: 0,
        upcoming: 0,
    };
}

function addGroupToTotals(totals: AttendanceTotals, group: AttendanceGroupSummary): void {
    totals.scheduled += group.scheduled;
    totals.present += group.present.length;
    totals.approvedLeave += group.approvedLeave.length;
    totals.pendingLeave += group.pendingLeave.length;
    totals.absentWithoutLeave += group.absentWithoutLeave.length;
    totals.upcoming += group.upcoming.length;
}

function comparisonTimeForDate(dateKey: string, referenceTime: Date): Date {
    const todayKey = toBangkokDateKey(referenceTime);
    if (dateKey < todayKey) {
        return new Date(parseDateStringToBangkokMidnight(dateKey).getTime() + 48 * 60 * 60 * 1000);
    }
    if (dateKey > todayKey) {
        return parseDateStringToBangkokMidnight(dateKey);
    }
    return referenceTime;
}

export async function getAttendanceDailySummary(options: {
    dateKey?: string;
    stationCode?: string;
    referenceTime?: Date;
    graceMinutes?: number;
} = {}): Promise<AttendanceDailySummary> {
    const referenceTime = options.referenceTime ?? new Date();
    const dateKey = options.dateKey ?? toBangkokDateKey(referenceTime);
    const requestedGraceMinutes = options.graceMinutes
        ?? Number(process.env.ATTENDANCE_ALERT_GRACE_MINUTES || DEFAULT_ATTENDANCE_GRACE_MINUTES);
    const graceMinutes = Number.isFinite(requestedGraceMinutes)
        ? Math.max(0, Math.round(requestedGraceMinutes))
        : DEFAULT_ATTENDANCE_GRACE_MINUTES;
    const dateStart = parseDateStringToBangkokMidnight(dateKey);
    const dateEnd = new Date(dateStart.getTime() + 24 * 60 * 60 * 1000);
    const effectiveReferenceTime = comparisonTimeForDate(dateKey, referenceTime);

    const userWhere: Prisma.UserWhereInput = {
        isActive: true,
        employeeStatus: "ACTIVE",
    };

    if (options.stationCode) {
        userWhere.station = {
            is: {
                code: {
                    equals: options.stationCode.trim(),
                    mode: "insensitive",
                },
            },
        };
    }

    const assignments = await prisma.shiftAssignment.findMany({
        where: {
            date: { gte: dateStart, lt: dateEnd },
            isDayOff: false,
            user: userWhere,
        },
        select: {
            date: true,
            user: {
                select: {
                    id: true,
                    employeeId: true,
                    name: true,
                    nickName: true,
                    station: { select: { id: true, code: true, name: true } },
                    department: { select: { name: true } },
                },
            },
            shift: {
                select: {
                    id: true,
                    code: true,
                    name: true,
                    startTime: true,
                    endTime: true,
                    station: { select: { id: true, code: true, name: true } },
                },
            },
        },
        orderBy: [
            { shift: { startTime: "asc" } },
            { user: { name: "asc" } },
        ],
    });

    if (assignments.length === 0) {
        return {
            dateKey,
            generatedAt: referenceTime.toISOString(),
            graceMinutes,
            groups: [],
            totals: emptyTotals(),
        };
    }

    const userIds = [...new Set(assignments.map((assignment) => assignment.user.id))];
    const [attendances, leaves] = await Promise.all([
        prisma.attendance.findMany({
            where: {
                date: { gte: dateStart, lt: dateEnd },
                userId: { in: userIds },
                checkInTime: { not: null },
            },
            select: {
                userId: true,
                checkInTime: true,
                lateMinutes: true,
            },
        }),
        prisma.leave.findMany({
            where: {
                userId: { in: userIds },
                startDate: { lt: dateEnd },
                endDate: { gte: dateStart },
                status: { in: ["PENDING", "APPROVED"] },
            },
            select: {
                userId: true,
                status: true,
            },
        }),
    ]);

    const attendanceByUser = new Map(attendances.map((attendance) => [attendance.userId, attendance]));
    const leaveStatusesByUser = new Map<string, Array<"PENDING" | "APPROVED" | "REJECTED">>();

    for (const leave of leaves) {
        const statuses = leaveStatusesByUser.get(leave.userId) ?? [];
        statuses.push(leave.status);
        leaveStatusesByUser.set(leave.userId, statuses);
    }

    const groupMap = new Map<string, AttendanceGroupSummary>();

    for (const assignment of assignments) {
        const station = assignment.user.station ?? assignment.shift.station;
        const stationId = station?.id ?? "UNASSIGNED";
        const stationCode = station?.code ?? "UNASSIGNED";
        const stationName = station?.name ?? "ไม่ระบุสาขา";
        const groupKey = `${stationId}:${assignment.shift.id}`;
        const shiftStartAt = shiftStartOnBangkokDate(dateKey, assignment.shift.startTime);
        const dueAt = new Date(shiftStartAt.getTime() + graceMinutes * 60_000);

        let group = groupMap.get(groupKey);
        if (!group) {
            group = {
                key: groupKey,
                dateKey,
                stationId,
                stationCode,
                stationName,
                shiftId: assignment.shift.id,
                shiftCode: assignment.shift.code,
                shiftName: assignment.shift.name,
                startTime: assignment.shift.startTime,
                endTime: assignment.shift.endTime,
                shiftStartAt: shiftStartAt.toISOString(),
                dueAt: dueAt.toISOString(),
                isDue: effectiveReferenceTime >= dueAt,
                scheduled: 0,
                present: [],
                approvedLeave: [],
                pendingLeave: [],
                absentWithoutLeave: [],
                upcoming: [],
            };
            groupMap.set(groupKey, group);
        }

        const attendance = attendanceByUser.get(assignment.user.id);
        const status = resolveAttendanceStatus({
            hasCheckIn: Boolean(attendance?.checkInTime),
            leaveStatuses: leaveStatusesByUser.get(assignment.user.id) ?? [],
            dueAt,
            referenceTime: effectiveReferenceTime,
        });
        const person: AttendancePersonSummary = {
            userId: assignment.user.id,
            employeeId: assignment.user.employeeId,
            name: assignment.user.name,
            nickName: assignment.user.nickName,
            departmentName: assignment.user.department?.name ?? "-",
            status,
            checkInTime: attendance?.checkInTime?.toISOString() ?? null,
            lateMinutes: attendance?.lateMinutes ?? 0,
        };

        group.scheduled += 1;
        if (status === "PRESENT") group.present.push(person);
        if (status === "APPROVED_LEAVE") group.approvedLeave.push(person);
        if (status === "PENDING_LEAVE") group.pendingLeave.push(person);
        if (status === "ABSENT_WITHOUT_LEAVE") group.absentWithoutLeave.push(person);
        if (status === "UPCOMING") group.upcoming.push(person);
    }

    const groups = [...groupMap.values()].sort((left, right) => {
        return left.stationName.localeCompare(right.stationName, "th") || left.startTime.localeCompare(right.startTime);
    });
    const totals = emptyTotals();
    groups.forEach((group) => addGroupToTotals(totals, group));

    return {
        dateKey,
        generatedAt: referenceTime.toISOString(),
        graceMinutes,
        groups,
        totals,
    };
}

export function groupAttendanceByStation(summary: AttendanceDailySummary): AttendanceStationSummary[] {
    const stationMap = new Map<string, AttendanceStationSummary>();

    for (const group of summary.groups) {
        let station = stationMap.get(group.stationId);
        if (!station) {
            station = {
                stationId: group.stationId,
                stationCode: group.stationCode,
                stationName: group.stationName,
                groups: [],
                absentPeople: [],
                pendingLeavePeople: [],
                approvedLeavePeople: [],
                ...emptyTotals(),
            };
            stationMap.set(group.stationId, station);
        }

        station.groups.push(group);
        station.absentPeople.push(...group.absentWithoutLeave);
        station.pendingLeavePeople.push(...group.pendingLeave);
        station.approvedLeavePeople.push(...group.approvedLeave);
        addGroupToTotals(station, group);
    }

    return [...stationMap.values()].sort((left, right) => left.stationName.localeCompare(right.stationName, "th"));
}
