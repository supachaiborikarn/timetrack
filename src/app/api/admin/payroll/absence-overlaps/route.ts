import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDateStringToBangkokMidnight } from "@/lib/date-utils";
import { PAYROLL_ELIGIBLE_ROLES, toBangkokDateKey } from "@/lib/payroll-calculation";


// GET: Find overlapping absences within the same station
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const stationId = searchParams.get("stationId");
        const departmentId = searchParams.get("departmentId");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        const start = parseDateStringToBangkokMidnight(startDate);
        const endMidnight = parseDateStringToBangkokMidnight(endDate);
        const end = new Date(endMidnight.getTime() + 24 * 60 * 60 * 1000 - 1);

        const userWhere: Prisma.UserWhereInput = {
            isActive: true,
            role: { in: [...PAYROLL_ELIGIBLE_ROLES] },
            ...(stationId && stationId !== "all" ? { stationId } : {}),
            ...(departmentId && departmentId !== "all" ? { departmentId } : {}),
        };
        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                date: { gte: start, lte: end },
                user: userWhere,
            },
            select: {
                date: true,
                isDayOff: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        nickName: true,
                        employeeId: true,
                        station: { select: { id: true, name: true } },
                    },
                },
            },
        });
        const allUserIds = [...new Set(assignments.map((assignment) => assignment.user.id))];

        const [attendanceRecords, approvedLeaves] = await Promise.all([
            prisma.attendance.findMany({
                where: {
                    userId: { in: allUserIds },
                    checkInTime: { not: null },
                    date: {
                        gte: start,
                        lte: end,
                    },
                },
                select: {
                    userId: true,
                    date: true,
                    checkInTime: true,
                },
            }),
            prisma.leave.findMany({
                where: {
                    userId: { in: allUserIds },
                    status: "APPROVED",
                    startDate: { lte: end },
                    endDate: { gte: start },
                },
                select: { userId: true, startDate: true, endDate: true },
            }),
        ]);

        // Build attendance lookup using Bangkok date key (same as payroll routes)
        const checkedInDates = new Map<string, Set<string>>();
        for (const record of attendanceRecords) {
            if (record.checkInTime) {
                const dateKey = toBangkokDateKey(record.date);
                if (!checkedInDates.has(record.userId)) {
                    checkedInDates.set(record.userId, new Set());
                }
                checkedInDates.get(record.userId)!.add(dateKey);
            }
        }

        const leavesByUser = new Map<string, typeof approvedLeaves>();
        for (const leave of approvedLeaves) {
            const rows = leavesByUser.get(leave.userId) ?? [];
            rows.push(leave);
            leavesByUser.set(leave.userId, rows);
        }

        type UnavailableReason = "DAY_OFF" | "APPROVED_LEAVE" | "ABSENT";
        const overlaps: {
            date: string;
            stationId: string;
            stationName: string;
            absentEmployees: {
                id: string;
                name: string;
                nickName: string | null;
                employeeId: string;
                reason: UnavailableReason;
            }[];
        }[] = [];
        const grouped = new Map<string, (typeof overlaps)[number]>();

        for (const assignment of assignments) {
            const station = assignment.user.station;
            if (!station) continue;
            const dateKey = toBangkokDateKey(assignment.date);
            const userDates = checkedInDates.get(assignment.user.id);
            const hasAttendance = Boolean(userDates?.has(dateKey));
            const dayStart = parseDateStringToBangkokMidnight(dateKey);
            const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
            const hasApprovedLeave = (leavesByUser.get(assignment.user.id) ?? [])
                .some((leave) => leave.startDate < dayEnd && leave.endDate >= dayStart);
            const reason: UnavailableReason | null = assignment.isDayOff
                ? "DAY_OFF"
                : hasApprovedLeave
                    ? "APPROVED_LEAVE"
                    : hasAttendance
                        ? null
                        : "ABSENT";
            if (!reason) continue;

            const key = `${station.id}:${dateKey}`;
            const group = grouped.get(key) ?? {
                date: dateKey,
                stationId: station.id,
                stationName: station.name,
                absentEmployees: [],
            };
            group.absentEmployees.push({
                id: assignment.user.id,
                name: assignment.user.name,
                nickName: assignment.user.nickName,
                employeeId: assignment.user.employeeId,
                reason,
            });
            grouped.set(key, group);
        }

        overlaps.push(...[...grouped.values()].filter((group) => group.absentEmployees.length >= 2));

        // Sort by date then station
        overlaps.sort((a, b) => a.date.localeCompare(b.date) || a.stationName.localeCompare(b.stationName));

        return NextResponse.json({
            overlaps,
            totalOverlapDays: overlaps.length,
        });
    } catch (error) {
        console.error("Error finding absence overlaps:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
