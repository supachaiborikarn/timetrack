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

        const records = await prisma.attendance.findMany({
            where: {
                userId: session.user.id,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
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
                lateMinutes: r.lateMinutes,
                actualHours: r.actualHours ? Number(r.actualHours) : null,
                latePenaltyAmount: Number(r.latePenaltyAmount),
            })),
        });
    } catch (error) {
        console.error("Error fetching attendance history:", error);
        return ApiErrors.internal();
    }
}
