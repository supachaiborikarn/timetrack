import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateLateMinutes, calculateWorkHours } from "@/lib/date-utils";
import { isHousekeepingDepartment } from "@/lib/attendance-rules";

// Convert date string "YYYY-MM-DD" to Bangkok midnight (same as check-in API)
function parseDateToBangkokMidnight(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

export async function POST(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "MANAGER", "HR", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { userId, type, date, time } = body; // type: 'CHECK_IN' | 'CHECK_OUT'

        if (!userId || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Parse date and time to create a UTC Date object
        // date: "2026-02-15", time: "07:30" -> Date in UTC for Bangkok local time
        const targetDate = new Date(`${date}T${time}:00+07:00`);

        // Use Bangkok midnight — MUST match check-in API's startOfDayBangkok()
        const dayStart = parseDateToBangkokMidnight(date);

        const targetUser = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                department: { select: { code: true, name: true } },
            },
        });

        // Find existing attendance for this day (check both Bangkok midnight and UTC midnight for safety)
        let attendance = await prisma.attendance.findFirst({
            where: {
                userId: userId,
                date: dayStart,
            },
        });

        // Also check for records stored with UTC midnight (legacy/bug)
        if (!attendance) {
            const utcMidnight = new Date(`${date}T00:00:00Z`);
            attendance = await prisma.attendance.findFirst({
                where: {
                    userId: userId,
                    date: utcMidnight,
                },
            });
        }

        if (type === "CHECK_IN") {
            if (attendance?.checkInTime) {
                return NextResponse.json({ error: "พนักงานมีรายการเช็คอินของวันนี้แล้ว" }, { status: 400 });
            }

            // Calculate Late
            const shiftAssignment = await prisma.shiftAssignment.findFirst({
                where: { userId, date: dayStart },
                include: { shift: true },
            });

            let lateMinutes = 0;
            if (shiftAssignment) {
                // Create a local-like date for shift comparison
                const localForCalc = new Date(targetDate.getTime() + (7 * 60 * 60 * 1000));
                lateMinutes = calculateLateMinutes(localForCalc, shiftAssignment.shift.startTime);
            }

            attendance = await prisma.attendance.upsert({
                where: {
                    userId_date: { userId, date: dayStart },
                },
                create: {
                    userId,
                    date: dayStart,
                    checkInTime: targetDate,
                    checkInMethod: "MANUAL",
                    status: "APPROVED",
                    lateMinutes,
                },
                update: {
                    checkInTime: targetDate,
                    checkInMethod: "MANUAL",
                    status: "APPROVED",
                    lateMinutes,
                },
            });
        } else if (type === "CHECK_OUT") {
            if (!attendance || !attendance.checkInTime) {
                return NextResponse.json({ error: "ไม่สามารถเช็คเอาต์ได้ เนื่องจากยังไม่มีรายการเช็คอิน" }, { status: 400 });
            }

            // Calculate work hours
            const shiftAssignment = await prisma.shiftAssignment.findFirst({
                where: { userId, date: dayStart },
                include: { shift: true },
            });
            const breakMinutes = shiftAssignment?.shift.breakMinutes || 60;
            let finalCheckOut = targetDate;

            if (finalCheckOut < attendance.checkInTime) {
                if (shiftAssignment?.shift.isNightShift) {
                    finalCheckOut = new Date(finalCheckOut.getTime() + 24 * 60 * 60 * 1000);
                } else {
                    const message = isHousekeepingDepartment(targetUser?.department)
                        ? "แม่บ้านไม่มีเวรกลางคืน กรุณาใส่เวลาเข้าออกในวันเดียวกัน"
                        : "เวลาออกน้อยกว่าเวลาเข้าได้เฉพาะกะกลางคืน";
                    return NextResponse.json({ error: message }, { status: 400 });
                }
            }

            const { totalHours, overtimeHours } = calculateWorkHours(attendance.checkInTime, finalCheckOut, breakMinutes);

            attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: {
                    checkOutTime: finalCheckOut,
                    checkOutMethod: "MANUAL",
                    actualHours: totalHours,
                    overtimeHours: overtimeHours,
                },
            });
        }

        return NextResponse.json({ success: true, data: attendance });

    } catch (error) {
        console.error("Manual attendance error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
