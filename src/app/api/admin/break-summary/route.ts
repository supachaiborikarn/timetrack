import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check role
        const user = await prisma.user.findUnique({ where: { id: session.user.id } });
        if (!user || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(user.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const stationId = searchParams.get("stationId");

        if (!startDate || !endDate) {
            return NextResponse.json({ error: "startDate and endDate are required" }, { status: 400 });
        }

        // Build where clause
        const whereClause: Record<string, unknown> = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate + "T23:59:59.999Z"),
            },
            breakDurationMin: { not: null },
        };

        if (stationId) {
            whereClause.user = { stationId };
        }

        // Fetch all attendance records with break data
        const records = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                user: {
                    include: {
                        station: true,
                        department: true,
                    },
                },
            },
            orderBy: { date: "desc" },
        });

        // For each record, determine the allowed break minutes
        // We need to check shift assignments for each record
        const recordsWithShift = await Promise.all(
            records.map(async (record) => {
                const assignment = await prisma.shiftAssignment.findFirst({
                    where: { userId: record.userId, date: record.date },
                    include: { shift: true },
                });

                // Default allowed break: 90 min, SPC station: 60 min
                let allowedBreakMin = 90;
                if (record.user.station?.code === "SPC") {
                    allowedBreakMin = 60;
                } else if (assignment?.shift?.breakMinutes && assignment.shift.breakMinutes > 90) {
                    allowedBreakMin = assignment.shift.breakMinutes;
                }

                const GRACE_PERIOD = 5;
                const isOvertime = (record.breakDurationMin || 0) > (allowedBreakMin + GRACE_PERIOD);
                const overtimeMinutes = isOvertime
                    ? (record.breakDurationMin || 0) - allowedBreakMin
                    : 0;

                return {
                    id: record.id,
                    date: record.date,
                    userId: record.userId,
                    userName: record.user.name,
                    userNickName: record.user.nickName,
                    employeeId: record.user.employeeId,
                    stationName: record.user.station?.name || "-",
                    departmentName: record.user.department?.name || "-",
                    breakStartTime: record.breakStartTime,
                    breakEndTime: record.breakEndTime,
                    breakDurationMin: record.breakDurationMin,
                    allowedBreakMin,
                    isOvertime,
                    overtimeMinutes,
                    penaltyAmount: Number(record.breakPenaltyAmount) || 0,
                };
            })
        );

        // Separate overtime records
        const overtimeRecords = recordsWithShift.filter((r) => r.isOvertime);

        // Build per-employee summary
        const employeeMap = new Map<string, {
            userId: string;
            userName: string;
            userNickName: string | null;
            employeeId: string;
            stationName: string;
            totalBreaks: number;
            overtimeBreaks: number;
            totalPenalty: number;
            totalDurationMin: number;
            overtimeDates: string[];
        }>();

        for (const record of recordsWithShift) {
            const existing = employeeMap.get(record.userId);
            if (existing) {
                existing.totalBreaks++;
                existing.totalDurationMin += record.breakDurationMin || 0;
                existing.totalPenalty += record.penaltyAmount;
                if (record.isOvertime) {
                    existing.overtimeBreaks++;
                    existing.overtimeDates.push(new Date(record.date).toISOString());
                }
            } else {
                employeeMap.set(record.userId, {
                    userId: record.userId,
                    userName: record.userName,
                    userNickName: record.userNickName,
                    employeeId: record.employeeId,
                    stationName: record.stationName,
                    totalBreaks: 1,
                    overtimeBreaks: record.isOvertime ? 1 : 0,
                    totalPenalty: record.penaltyAmount,
                    totalDurationMin: record.breakDurationMin || 0,
                    overtimeDates: record.isOvertime ? [new Date(record.date).toISOString()] : [],
                });
            }
        }

        const employeeSummaries = Array.from(employeeMap.values()).map((emp) => ({
            ...emp,
            avgDurationMin: Math.round(emp.totalDurationMin / emp.totalBreaks),
        }));

        // Sort: most overtime breaks first
        employeeSummaries.sort((a, b) => b.overtimeBreaks - a.overtimeBreaks);

        // Summary stats
        const totalBreakRecords = recordsWithShift.length;
        const totalOvertimeBreaks = overtimeRecords.length;
        const totalPenaltyAmount = recordsWithShift.reduce((sum, r) => sum + r.penaltyAmount, 0);
        const employeesWithOvertime = employeeSummaries.filter((e) => e.overtimeBreaks > 0).length;

        return NextResponse.json({
            summary: {
                totalBreakRecords,
                totalOvertimeBreaks,
                totalPenaltyAmount,
                employeesWithOvertime,
            },
            overtimeRecords,
            employeeSummaries,
        });
    } catch (error) {
        console.error("Break summary error:", error);
        return NextResponse.json({ error: "เกิดข้อผิดพลาด" }, { status: 500 });
    }
}
