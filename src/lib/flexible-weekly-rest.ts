import { getBangkokShiftWindow, type PerformanceShiftAssignment } from "@/lib/employee-performance";
import { startOfDayBangkok } from "@/lib/date-utils";

const DAY_MS = 24 * 60 * 60 * 1000;
const FLEXIBLE_WEEKLY_REST_STATIONS = new Set(["PAP", "SPC"]);

export type FlexibleWeeklyRestAssignment = PerformanceShiftAssignment & { userId: string };
export type FlexibleWeeklyRestAttendance = {
    userId: string;
    date: Date;
    checkInTime: Date | null;
};
export type FlexibleWeeklyRestLeave = {
    userId: string;
    startDate: Date;
    endDate: Date;
    status: "PENDING" | "APPROVED" | "REJECTED";
};

export function isFlexibleWeeklyRestStation(stationCode?: string | null): boolean {
    return FLEXIBLE_WEEKLY_REST_STATIONS.has((stationCode ?? "").trim().toUpperCase());
}

function toBangkokDateKey(date: Date): string {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function bangkokWeekKey(dateKey: string): string {
    const [year, month, day] = dateKey.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const daysFromMonday = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - daysFromMonday);
    return date.toISOString().slice(0, 10);
}

function leaveCoversAssignmentDay(leave: FlexibleWeeklyRestLeave, assignmentDate: Date): boolean {
    const dayStart = startOfDayBangkok(assignmentDate);
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    return leave.startDate < dayEnd && leave.endDate >= dayStart;
}

function isPastShiftDue(
    assignment: FlexibleWeeklyRestAssignment,
    referenceTime: Date,
    graceMinutes: number,
): boolean {
    const window = getBangkokShiftWindow(assignment);
    return referenceTime >= new Date(window.start.getTime() + graceMinutes * 60_000);
}

/**
 * PAP/SPC score-only weekly rest policy.
 *
 * A scheduled no-show can be excluded from performance scoring when:
 * - the employee has no approved/pending leave covering that date,
 * - nobody else in the same eligible front-yard team is also off that date,
 * - and the employee has not already used another flexible rest day in that Bangkok Mon-Sun week.
 *
 * This does not mutate attendance, leave, payroll, or shift assignments.
 */
export function buildFlexibleWeeklyRestDateKeys(input: {
    members: Array<{ userId: string; stationCode?: string | null }>;
    assignments: FlexibleWeeklyRestAssignment[];
    attendances: FlexibleWeeklyRestAttendance[];
    leaves: FlexibleWeeklyRestLeave[];
    referenceTime: Date;
    attendanceGraceMinutes?: number;
}): Map<string, Set<string>> {
    const graceMinutes = Math.max(0, Math.round(input.attendanceGraceMinutes ?? 0));
    const result = new Map<string, Set<string>>();
    const stationMembers = new Map<string, string[]>();

    for (const member of input.members) {
        const stationCode = (member.stationCode ?? "").trim().toUpperCase();
        if (!isFlexibleWeeklyRestStation(stationCode)) continue;
        const users = stationMembers.get(stationCode) ?? [];
        users.push(member.userId);
        stationMembers.set(stationCode, users);
        result.set(member.userId, new Set());
    }
    if (stationMembers.size === 0) return result;

    const assignmentByUserDate = new Map<string, FlexibleWeeklyRestAssignment>();
    for (const assignment of input.assignments) {
        const key = `${assignment.userId}:${toBangkokDateKey(assignment.date)}`;
        const existing = assignmentByUserDate.get(key);
        // Prefer a working assignment if duplicate logical-day rows ever exist.
        if (!existing || (existing.isDayOff && !assignment.isDayOff)) {
            assignmentByUserDate.set(key, assignment);
        }
    }

    const presentUserDates = new Set<string>();
    for (const attendance of input.attendances) {
        if (!attendance.checkInTime) continue;
        presentUserDates.add(`${attendance.userId}:${toBangkokDateKey(attendance.date)}`);
    }

    const leavesByUser = new Map<string, FlexibleWeeklyRestLeave[]>();
    for (const leave of input.leaves) {
        if (leave.status !== "APPROVED" && leave.status !== "PENDING") continue;
        const rows = leavesByUser.get(leave.userId) ?? [];
        rows.push(leave);
        leavesByUser.set(leave.userId, rows);
    }

    for (const userIds of stationMembers.values()) {
        const userIdSet = new Set(userIds);
        const candidateRows = [...assignmentByUserDate.values()]
            .filter((assignment) => userIdSet.has(assignment.userId))
            .filter((assignment) => !assignment.isDayOff)
            .filter((assignment) => !presentUserDates.has(`${assignment.userId}:${toBangkokDateKey(assignment.date)}`))
            .filter((assignment) => isPastShiftDue(assignment, input.referenceTime, graceMinutes))
            .filter((assignment) => !(leavesByUser.get(assignment.userId) ?? [])
                .some((leave) => leaveCoversAssignmentDay(leave, assignment.date)))
            .sort((left, right) => {
                const dateCompare = toBangkokDateKey(left.date).localeCompare(toBangkokDateKey(right.date));
                return dateCompare || left.userId.localeCompare(right.userId);
            });

        const usedWeekByUser = new Map<string, Set<string>>();
        for (const userId of userIds) usedWeekByUser.set(userId, new Set());
        for (const assignment of assignmentByUserDate.values()) {
            if (!userIdSet.has(assignment.userId) || !assignment.isDayOff) continue;
            usedWeekByUser.get(assignment.userId)?.add(bangkokWeekKey(toBangkokDateKey(assignment.date)));
        }

        for (const candidate of candidateRows) {
            const dateKey = toBangkokDateKey(candidate.date);
            const weekKey = bangkokWeekKey(dateKey);
            const usedWeeks = usedWeekByUser.get(candidate.userId) ?? new Set<string>();
            if (usedWeeks.has(weekKey)) continue;

            const anotherEmployeeIsOff = userIds.some((peerUserId) => {
                if (peerUserId === candidate.userId) return false;
                if (presentUserDates.has(`${peerUserId}:${dateKey}`)) return false;
                const peerHasLeave = (leavesByUser.get(peerUserId) ?? [])
                    .some((leave) => leaveCoversAssignmentDay(leave, candidate.date));
                if (peerHasLeave) return true;
                const peerAssignment = assignmentByUserDate.get(`${peerUserId}:${dateKey}`);
                if (!peerAssignment) return false;
                if (peerAssignment.isDayOff) return true;
                return isPastShiftDue(peerAssignment, input.referenceTime, graceMinutes);
            });
            if (anotherEmployeeIsOff) continue;

            result.get(candidate.userId)?.add(dateKey);
            usedWeeks.add(weekKey);
            usedWeekByUser.set(candidate.userId, usedWeeks);
        }
    }

    return result;
}
