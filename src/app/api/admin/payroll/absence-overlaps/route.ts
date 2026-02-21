import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        // Get all employees grouped by station
        const stationWhere: Record<string, unknown> = {};
        if (stationId && stationId !== "all") {
            stationWhere.id = stationId;
        }

        const stations = await prisma.station.findMany({
            where: stationWhere,
            include: {
                employees: {
                    where: { isActive: true, role: "EMPLOYEE" },
                    select: { id: true, name: true, nickName: true, employeeId: true },
                },
            },
        });

        // Get attendance records for the date range
        type StationUser = { id: string; name: string; nickName: string | null; employeeId: string };
        const allUserIds = stations.flatMap((s) => s.employees.map((u: StationUser) => u.id));
        const attendanceRecords = await prisma.attendance.findMany({
            where: {
                userId: { in: allUserIds },
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            select: {
                userId: true,
                date: true,
                checkInTime: true,
            },
        });

        // Build attendance lookup: userId -> Set of dateKeys where they checked in
        const checkedInDates = new Map<string, Set<string>>();
        for (const record of attendanceRecords) {
            if (record.checkInTime) {
                const dateKey = record.date.toISOString().split("T")[0];
                if (!checkedInDates.has(record.userId)) {
                    checkedInDates.set(record.userId, new Set());
                }
                checkedInDates.get(record.userId)!.add(dateKey);
            }
        }

        // Generate all dates in range
        const dates: string[] = [];
        const current = new Date(startDate);
        const end = new Date(endDate);
        while (current <= end) {
            dates.push(current.toISOString().split("T")[0]);
            current.setDate(current.getDate() + 1);
        }

        // Find overlapping absences per station per date
        const overlaps: {
            date: string;
            stationId: string;
            stationName: string;
            absentEmployees: {
                id: string;
                name: string;
                nickName: string | null;
                employeeId: string;
            }[];
        }[] = [];

        for (const station of stations) {
            if (station.employees.length === 0) continue;

            for (const dateKey of dates) {
                const absentEmployees = station.employees.filter((user: StationUser) => {
                    const userDates = checkedInDates.get(user.id);
                    return !userDates || !userDates.has(dateKey);
                });

                // Only report if 2+ employees are absent on the same day at the same station
                if (absentEmployees.length >= 2) {
                    overlaps.push({
                        date: dateKey,
                        stationId: station.id,
                        stationName: station.name,
                        absentEmployees: absentEmployees.map((e: StationUser) => ({
                            id: e.id,
                            name: e.name,
                            nickName: e.nickName,
                            employeeId: e.employeeId,
                        })),
                    });
                }
            }
        }

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
