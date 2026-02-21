import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDays } from "@/lib/date-utils";

function parseDateStringToBangkokMidnight(dateStr: string): Date {
    const [year, month, day] = dateStr.split("-").map(Number);
    const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
    const midnightBangkokInUTC = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS;
    return new Date(midnightBangkokInUTC);
}

// GET: Fetch attendance records for a specific user within a date range
export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id || !["ADMIN", "HR", "MANAGER", "CASHIER"].includes(session.user.role)) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const userId = searchParams.get("userId");

        if (!startDate || !endDate || !userId) {
            return NextResponse.json(
                { error: "startDate, endDate, and userId are required" },
                { status: 400 }
            );
        }

        const startDateBangkok = parseDateStringToBangkokMidnight(startDate);
        const endDateBangkok = addDays(parseDateStringToBangkokMidnight(endDate), 1);

        const records = await prisma.attendance.findMany({
            where: {
                userId,
                date: {
                    gte: startDateBangkok,
                    lt: endDateBangkok,
                },
            },
            orderBy: { date: "asc" },
        });

        return NextResponse.json({
            records: records.map((r) => ({
                id: r.id,
                date: r.date.toISOString(),
                checkInTime: r.checkInTime?.toISOString() || null,
                checkOutTime: r.checkOutTime?.toISOString() || null,
                status: r.status,
                lateMinutes: r.lateMinutes,
                actualHours: r.actualHours ? Number(r.actualHours) : null,
            })),
        });
    } catch (error) {
        console.error("Error fetching attendance by user:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
