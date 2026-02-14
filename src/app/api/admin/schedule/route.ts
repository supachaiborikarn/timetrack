import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays, startOfMonth, endOfMonth, getDate, format, parseDateStringToBangkokMidnight } from "@/lib/date-utils";

// GET: Fetch shift assignments for a station/month
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const stationId = searchParams.get("stationId");
        const month = parseInt(searchParams.get("month") || "0");
        const year = parseInt(searchParams.get("year") || "0");

        if (!stationId || !month || !year) {
            return NextResponse.json(
                { error: "stationId, month, and year are required" },
                { status: 400 }
            );
        }

        const startDateStr = `${year}-${month.toString().padStart(2, "0")}-01`;
        const startDate = parseDateStringToBangkokMidnight(startDateStr);
        const endDate = endOfMonth(startDate);

        // Get all employees of the station
        const employees = await prisma.user.findMany({
            where: { stationId, isActive: true },
            include: { department: true },
            orderBy: [{ departmentId: "asc" }, { name: "asc" }],
        });

        // Get all shifts
        const shifts = await prisma.shift.findMany({
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
        });

        // Get assignments for the month
        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: { in: employees.map((e) => e.id) },
                date: { gte: startDate, lte: endDate },
            },
            include: { shift: true },
        });

        // Build schedule matrix
        const scheduleData = employees.map((emp) => {
            const empAssignments = assignments.filter((a) => a.userId === emp.id);
            const schedule: Record<string, { shiftId: string; shiftCode: string; isDayOff: boolean } | null> = {};

            let currentDate = startDate;
            while (currentDate <= endDate) {
                const dateKey = format(currentDate, "yyyy-MM-dd");
                const assignment = empAssignments.find(
                    (a) => format(a.date, "yyyy-MM-dd") === dateKey
                );

                schedule[dateKey] = assignment
                    ? {
                        shiftId: assignment.shiftId,
                        shiftCode: assignment.shift.code,
                        isDayOff: assignment.isDayOff,
                    }
                    : null;

                currentDate = addDays(currentDate, 1);
            }

            return {
                employee: {
                    id: emp.id,
                    name: emp.name,
                    employeeId: emp.employeeId,
                    department: emp.department?.name || "-",
                    departmentCode: emp.department?.code || "",
                    nickName: emp.nickName || null,
                },
                schedule,
            };
        });

        return NextResponse.json({
            month,
            year,
            startDate: format(startDate, "yyyy-MM-dd"),
            endDate: format(endDate, "yyyy-MM-dd"),
            daysInMonth: getDate(endDate),
            shifts: shifts.map((s) => ({
                id: s.id,
                code: s.code,
                name: s.name,
                startTime: s.startTime,
                endTime: s.endTime,
            })),
            scheduleData,
        });
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// POST: Auto-generate schedule for a month
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { stationId, month, year, pattern } = body;

        if (!stationId || !month || !year) {
            return NextResponse.json(
                { error: "stationId, month, and year are required" },
                { status: 400 }
            );
        }

        const startDateStr = `${year}-${month.toString().padStart(2, "0")}-01`;
        const startDate = parseDateStringToBangkokMidnight(startDateStr);
        const endDate = endOfMonth(startDate);

        // Get employees for station
        const employees = await prisma.user.findMany({
            where: { stationId, isActive: true, role: "EMPLOYEE" },
            include: {
                department: {
                    include: {
                        allowedShifts: { include: { shift: true } },
                    },
                },
            },
        });

        // Get department shifts
        const departmentShifts = await prisma.departmentShift.findMany({
            include: { shift: true, department: true },
        });

        const createdAssignments: string[] = [];

        for (const emp of employees) {
            if (!emp.department) continue;

            const deptShifts = departmentShifts
                .filter((ds) => ds.departmentId === emp.departmentId)
                .map((ds) => ds.shift);

            if (deptShifts.length === 0) continue;

            let currentDate = startDate;
            let shiftIndex = 0;
            let dayOffCounter = 0;

            while (currentDate <= endDate) {
                const dayOfWeek = currentDate.getDay();
                const isSunday = dayOfWeek === 0;

                // Check if it's a day off
                let isDayOff = false;

                // For หน้าลาน: 1 day off per week (rotating)
                if (emp.department.isFrontYard) {
                    dayOffCounter++;
                    if (dayOffCounter === 7) {
                        isDayOff = true;
                        dayOffCounter = 0;
                    }
                }
                // Check fixed day off
                else if (emp.department.weeklyDayOff !== null) {
                    isDayOff = dayOfWeek === emp.department.weeklyDayOff;
                }

                // Select shift based on pattern
                const selectedShift = deptShifts[shiftIndex % deptShifts.length];

                // Create or update assignment
                await prisma.shiftAssignment.upsert({
                    where: {
                        userId_date: {
                            userId: emp.id,
                            date: currentDate,
                        },
                    },
                    create: {
                        userId: emp.id,
                        shiftId: selectedShift.id,
                        date: currentDate,
                        isDayOff,
                    },
                    update: {
                        shiftId: selectedShift.id,
                        isDayOff,
                    },
                });

                createdAssignments.push(`${emp.name}-${format(currentDate, "yyyy-MM-dd")}`);
                currentDate = addDays(currentDate, 1);
            }

            // Rotate shift for next month (for fuel department)
            if (emp.department.isFrontYard && pattern?.rotation === "monthly") {
                shiftIndex++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Generated ${createdAssignments.length} assignments`,
            count: createdAssignments.length,
        });
    } catch (error) {
        console.error("Error generating schedule:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// PUT: Update individual assignment
export async function PUT(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId, date, shiftId, isDayOff } = body;

        if (!userId || !date) {
            return NextResponse.json(
                { error: "userId and date are required" },
                { status: 400 }
            );
        }

        const assignment = await prisma.shiftAssignment.upsert({
            where: {
                userId_date: {
                    userId,
                    date: parseDateStringToBangkokMidnight(date),
                },
            },
            create: {
                userId,
                shiftId,
                date: parseDateStringToBangkokMidnight(date),
                isDayOff: isDayOff || false,
            },
            update: {
                shiftId,
                isDayOff: isDayOff || false,
            },
        });

        return NextResponse.json({ success: true, assignment });
    } catch (error) {
        console.error("Error updating assignment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Delete individual or bulk assignments
export async function DELETE(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId, date, assignments } = body;

        // Bulk delete
        if (assignments && Array.isArray(assignments)) {
            const deleteResults = await Promise.all(
                assignments.map(async (item: { userId: string; date: string }) => {
                    try {
                        await prisma.shiftAssignment.delete({
                            where: {
                                userId_date: {
                                    userId: item.userId,
                                    date: parseDateStringToBangkokMidnight(item.date),
                                },
                            },
                        });
                        return { success: true, userId: item.userId, date: item.date };
                    } catch {
                        return { success: false, userId: item.userId, date: item.date };
                    }
                })
            );

            const successCount = deleteResults.filter((r) => r.success).length;
            return NextResponse.json({
                success: true,
                message: `ลบ ${successCount} รายการสำเร็จ`,
                count: successCount,
                results: deleteResults,
            });
        }

        // Single delete
        if (!userId || !date) {
            return NextResponse.json(
                { error: "userId and date are required" },
                { status: 400 }
            );
        }

        await prisma.shiftAssignment.delete({
            where: {
                userId_date: {
                    userId,
                    date: parseDateStringToBangkokMidnight(date),
                },
            },
        });

        return NextResponse.json({ success: true, message: "ลบสำเร็จ" });
    } catch (error) {
        console.error("Error deleting assignment:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
