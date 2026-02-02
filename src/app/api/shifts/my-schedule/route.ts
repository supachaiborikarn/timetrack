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

        const assignments = await prisma.shiftAssignment.findMany({
            where: {
                userId: session.user.id,
                date: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                },
            },
            include: {
                shift: {
                    select: {
                        name: true,
                        startTime: true,
                        endTime: true,
                    },
                },
            },
            orderBy: {
                date: "asc",
            },
        });

        return NextResponse.json({
            assignments: assignments.map((a) => ({
                id: a.id,
                date: a.date.toISOString(),
                shift: a.shift,
            })),
        });
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
