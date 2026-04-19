import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiErrors, successResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return ApiErrors.unauthorized();
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
            return ApiErrors.validation("startDate and endDate are required");
        }

        // Dates in DB are stored as Bangkok midnight in UTC (e.g. 2026-04-19 BKK = 2026-04-18T17:00:00Z)
        // Frontend sends YYYY-MM-DD strings in Bangkok local time
        // We need to convert to UTC range that covers the Bangkok dates
        const start = new Date(startDate + "T00:00:00+07:00"); // Start of day in Bangkok
        const end = new Date(endDate + "T23:59:59+07:00");     // End of day in Bangkok

        const records = await prisma.attendance.findMany({
            where: {
                userId: session.user.id,
                date: {
                    gte: start,
                    lte: end,
                },
            },
            orderBy: {
                date: "desc",
            },
        });

        return successResponse({
            records: records.map((r) => ({
                id: r.id,
                date: r.date.toISOString(),
                checkInTime: r.checkInTime?.toISOString() || null,
                checkOutTime: r.checkOutTime?.toISOString() || null,
                status: r.status,
                lateMinutes: r.lateMinutes || 0,
                actualHours: r.actualHours ? Number(r.actualHours) : null,
                overtimeHours: r.overtimeHours ? Number(r.overtimeHours) : null,
                latePenaltyAmount: Number(r.latePenaltyAmount || 0),
                breakDurationMin: r.breakDurationMin || null,
                breakPenaltyAmount: Number(r.breakPenaltyAmount || 0),
                note: r.note || null,
            })),
        });
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        return ApiErrors.internal();
    }
}
