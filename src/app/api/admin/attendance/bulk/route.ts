import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLateMinutes, calculateWorkHours } from "@/lib/date-utils";

// Convert date string "YYYY-MM-DD" to Bangkok midnight
function parseDateToBangkokMidnight(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

interface BulkEntry {
    userId: string;
    date: string; // "YYYY-MM-DD"
    checkInTime: string | null; // "HH:mm"
    checkOutTime: string | null; // "HH:mm"
}

// POST: Bulk create/update attendance records
export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "MANAGER", "HR", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { entries } = body as { entries: BulkEntry[] };

        if (!entries || !Array.isArray(entries) || entries.length === 0) {
            return NextResponse.json({ error: "No entries provided" }, { status: 400 });
        }

        if (entries.length > 500) {
            return NextResponse.json({ error: "Too many entries (max 500)" }, { status: 400 });
        }

        const results: { date: string; userId: string; success: boolean; error?: string }[] = [];

        for (const entry of entries) {
            try {
                const { userId, date, checkInTime, checkOutTime } = entry;

                if (!userId || !date) {
                    results.push({ date, userId, success: false, error: "Missing userId or date" });
                    continue;
                }

                // Skip entries where both times are empty
                if (!checkInTime && !checkOutTime) {
                    continue;
                }

                const dateObj = parseDateToBangkokMidnight(date);

                // Build checkIn/checkOut Date objects
                let checkInDate: Date | null = null;
                let checkOutDate: Date | null = null;

                if (checkInTime) {
                    checkInDate = new Date(`${date}T${checkInTime}:00+07:00`);
                }
                if (checkOutTime) {
                    checkOutDate = new Date(`${date}T${checkOutTime}:00+07:00`);
                }

                // Get shift assignment for late calc
                const shiftAssignment = await prisma.shiftAssignment.findFirst({
                    where: { userId, date: dateObj },
                    include: { shift: true },
                });

                let lateMinutes = 0;
                if (checkInDate && shiftAssignment) {
                    const localForCalc = new Date(checkInDate.getTime() + 7 * 60 * 60 * 1000);
                    lateMinutes = calculateLateMinutes(localForCalc, shiftAssignment.shift.startTime);
                }

                // Calculate work hours
                let actualHours: number | null = null;
                let overtimeHours: number | null = null;
                if (checkInDate && checkOutDate) {
                    const breakMinutes = shiftAssignment?.shift.breakMinutes || 60;
                    const result = calculateWorkHours(checkInDate, checkOutDate, breakMinutes);
                    actualHours = result.totalHours;
                    overtimeHours = result.overtimeHours;
                }

                // Upsert attendance record
                const updateData: Record<string, unknown> = {};
                const createData: Record<string, unknown> = {
                    userId,
                    date: dateObj,
                    status: "APPROVED",
                };

                if (checkInDate) {
                    updateData.checkInTime = checkInDate;
                    updateData.checkInMethod = "ADMIN_BACKFILL";
                    createData.checkInTime = checkInDate;
                    createData.checkInMethod = "ADMIN_BACKFILL";
                    createData.lateMinutes = lateMinutes;
                    updateData.lateMinutes = lateMinutes;
                }

                if (checkOutDate) {
                    updateData.checkOutTime = checkOutDate;
                    updateData.checkOutMethod = "ADMIN_BACKFILL";
                    createData.checkOutTime = checkOutDate;
                    createData.checkOutMethod = "ADMIN_BACKFILL";
                }

                if (actualHours !== null) {
                    updateData.actualHours = actualHours;
                    updateData.overtimeHours = overtimeHours;
                    createData.actualHours = actualHours;
                    createData.overtimeHours = overtimeHours;
                }

                await prisma.attendance.upsert({
                    where: {
                        userId_date: { userId, date: dateObj },
                    },
                    create: createData as never,
                    update: updateData,
                });

                results.push({ date, userId, success: true });
            } catch (err) {
                console.error(`Error processing entry ${entry.date}/${entry.userId}:`, err);
                results.push({
                    date: entry.date,
                    userId: entry.userId,
                    success: false,
                    error: err instanceof Error ? err.message : "Unknown error",
                });
            }
        }

        // Create audit log for the bulk operation
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        if (successCount > 0) {
            await prisma.auditLog.create({
                data: {
                    action: "BULK_BACKFILL",
                    entity: "Attendance",
                    details: JSON.stringify({
                        totalEntries: entries.length,
                        successCount,
                        failCount,
                        dateRange: entries.length > 0
                            ? `${entries[0].date} - ${entries[entries.length - 1].date}`
                            : null,
                    }),
                    userId: session.user.id,
                },
            });
        }

        return NextResponse.json({
            success: true,
            summary: {
                total: results.length,
                success: successCount,
                failed: failCount,
            },
            results,
        });
    } catch (error) {
        console.error("Bulk attendance error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
