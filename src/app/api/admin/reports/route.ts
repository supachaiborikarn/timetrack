import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR"].includes(session.user.role)) {
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

        // Get all attendance in range
        const whereClause: Record<string, unknown> = {
            date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
            },
        };

        if (stationId) {
            whereClause.user = { stationId };
        }

        const attendanceRecords = await prisma.attendance.findMany({
            where: whereClause,
            include: {
                user: {
                    include: {
                        station: { select: { name: true } },
                        department: { select: { name: true } },
                    },
                },
            },
        });

        // Group by employee
        const employeeMap = new Map<string, {
            id: string;
            name: string;
            employeeId: string;
            station: string;
            department: string;
            workDays: number;
            totalHours: number;
            overtimeHours: number;
            lateDays: number;
            latePenalty: number;
        }>();

        for (const record of attendanceRecords) {
            const key = record.userId;
            const existing = employeeMap.get(key) || {
                id: record.user.id,
                name: record.user.name,
                employeeId: record.user.employeeId,
                station: record.user.station?.name || "-",
                department: record.user.department?.name || "-",
                workDays: 0,
                totalHours: 0,
                overtimeHours: 0,
                lateDays: 0,
                latePenalty: 0,
            };

            if (record.checkInTime) {
                existing.workDays += 1;
            }
            if (record.actualHours) {
                existing.totalHours += Number(record.actualHours);
            }
            if (record.overtimeHours) {
                existing.overtimeHours += Number(record.overtimeHours);
            }
            if (record.lateMinutes && record.lateMinutes > 0) {
                existing.lateDays += 1;
            }
            if (record.latePenaltyAmount) {
                existing.latePenalty += Number(record.latePenaltyAmount);
            }

            employeeMap.set(key, existing);
        }

        const employees = Array.from(employeeMap.values());

        // Summary
        const summary = {
            totalEmployees: employees.length,
            totalWorkDays: employees.reduce((sum, e) => sum + e.workDays, 0),
            totalHours: employees.reduce((sum, e) => sum + e.totalHours, 0),
            totalOT: employees.reduce((sum, e) => sum + e.overtimeHours, 0),
            totalLateDays: employees.reduce((sum, e) => sum + e.lateDays, 0),
            totalLatePenalty: employees.reduce((sum, e) => sum + e.latePenalty, 0),
        };

        return NextResponse.json({
            employees: employees.sort((a, b) => a.name.localeCompare(b.name)),
            summary,
        });
    } catch (error) {
        console.error("Error generating report:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
