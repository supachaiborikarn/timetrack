import { prisma } from "@/lib/prisma";
import { DEFAULT_ATTENDANCE_GRACE_MINUTES } from "@/lib/attendance-summary";
import {
    buildFlexibleWeeklyRestDateKeys,
    isFlexibleWeeklyRestStation,
} from "@/lib/flexible-weekly-rest";

export async function getEmployeeFlexibleWeeklyRestDateKeys(params: {
    userId: string;
    stationId?: string | null;
    stationCode?: string | null;
    from: Date;
    toExclusive: Date;
    referenceTime: Date;
    attendanceGraceMinutes?: number;
}): Promise<Set<string>> {
    if (
        !params.stationId
        || !isFlexibleWeeklyRestStation(params.stationCode)
        || params.from >= params.toExclusive
    ) {
        return new Set();
    }

    const members = await prisma.user.findMany({
        where: {
            stationId: params.stationId,
            isActive: true,
            employeeStatus: "ACTIVE",
            role: "EMPLOYEE",
            department: { is: { isFrontYard: true, code: { not: "GAS" } } },
        },
        select: { id: true },
    });
    const memberIds = members.map((member) => member.id);
    if (!memberIds.includes(params.userId)) return new Set();

    const [assignments, attendances, leaves] = await Promise.all([
        prisma.shiftAssignment.findMany({
            where: {
                userId: { in: memberIds },
                date: { gte: params.from, lt: params.toExclusive },
            },
            select: {
                userId: true,
                date: true,
                isDayOff: true,
                shift: {
                    select: {
                        startTime: true,
                        endTime: true,
                        breakMinutes: true,
                        isNightShift: true,
                    },
                },
            },
        }),
        prisma.attendance.findMany({
            where: {
                userId: { in: memberIds },
                date: { gte: params.from, lt: params.toExclusive },
            },
            select: {
                userId: true,
                date: true,
                checkInTime: true,
            },
        }),
        prisma.leave.findMany({
            where: {
                userId: { in: memberIds },
                status: { in: ["APPROVED", "PENDING"] },
                startDate: { lt: params.toExclusive },
                endDate: { gte: params.from },
            },
            select: {
                userId: true,
                startDate: true,
                endDate: true,
                status: true,
            },
        }),
    ]);

    return buildFlexibleWeeklyRestDateKeys({
        members: memberIds.map((userId) => ({ userId, stationCode: params.stationCode })),
        assignments,
        attendances,
        leaves,
        referenceTime: params.referenceTime,
        attendanceGraceMinutes: params.attendanceGraceMinutes ?? DEFAULT_ATTENDANCE_GRACE_MINUTES,
    }).get(params.userId) ?? new Set();
}
