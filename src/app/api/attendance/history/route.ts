import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
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

        return NextResponse.json({
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
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
